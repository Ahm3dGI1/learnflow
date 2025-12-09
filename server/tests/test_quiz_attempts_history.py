"""
Tests for quiz attempts history endpoint.

Tests the GET /api/llm/quiz/attempts endpoint that retrieves
a user's quiz attempt history for a specific video.
"""

import json
import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import patch

from models import User, Video, Quiz, UserQuizAttempt

# Mark all tests in this module as unit tests
pytestmark = pytest.mark.unit

# Patch target for Firebase token verification
VERIFY_PATCH_PATH = "middleware.auth.verify_id_token"


@pytest.fixture
def client():
    """Create Flask app test client."""
    from app import app
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


@pytest.fixture(scope="function")
def test_data(session):
    """Create test data with user, video, quiz, and multiple attempts."""
    import random
    import string
    
    # Generate unique firebase_uid for each test
    unique_id = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
    firebase_uid = f'test-firebase-{unique_id}'
    video_id = f'test_video_{unique_id}'
    
    # Create user
    user = User(
        firebase_uid=firebase_uid,
        email=f'test-{unique_id}@example.com',
        display_name='Test User'
    )
    session.add(user)
    session.flush()
    
    # Create video
    video = Video(
        youtube_video_id=video_id,
        title='Test Video',
        duration_seconds=600,
        transcript='Test transcript content'
    )
    session.add(video)
    session.flush()    # Create quiz with questions
    questions_data = [
        {
            "id": 1,
            "question": "What is 2+2?",
            "options": ["2", "3", "4", "5"],
            "correctAnswer": 2,
            "explanation": "2+2 equals 4"
        },
        {
            "id": 2,
            "question": "What is the capital of France?",
            "options": ["London", "Paris", "Berlin", "Rome"],
            "correctAnswer": 1,
            "explanation": "Paris is the capital"
        },
        {
            "id": 3,
            "question": "What is 5*5?",
            "options": ["20", "25", "30", "35"],
            "correctAnswer": 1,
            "explanation": "5*5 equals 25"
        }
    ]

    quiz = Quiz(
        video_id=video.id,
        title='Test Quiz',
        num_questions=3,
        difficulty='intermediate',
        questions_data=json.dumps(questions_data)
    )
    session.add(quiz)
    session.flush()

    # Create multiple quiz attempts
    now = datetime.now(timezone.utc)
    
    # Attempt 1: Perfect score
    attempt1 = UserQuizAttempt(
        user_id=user.id,
        quiz_id=quiz.id,
        score=1.0,
        answers=json.dumps([
            {"questionIndex": 0, "selectedAnswer": "4", "isCorrect": True},
            {"questionIndex": 1, "selectedAnswer": "Paris", "isCorrect": True},
            {"questionIndex": 2, "selectedAnswer": "25", "isCorrect": True}
        ]),
        time_taken_seconds=120,
        started_at=now - timedelta(days=2, seconds=120),
        submitted_at=now - timedelta(days=2)
    )
    session.add(attempt1)

    # Attempt 2: 2 out of 3 correct
    attempt2 = UserQuizAttempt(
        user_id=user.id,
        quiz_id=quiz.id,
        score=0.667,
        answers=json.dumps([
            {"questionIndex": 0, "selectedAnswer": "4", "isCorrect": True},
            {"questionIndex": 1, "selectedAnswer": "London", "isCorrect": False},
            {"questionIndex": 2, "selectedAnswer": "25", "isCorrect": True}
        ]),
        time_taken_seconds=90,
        started_at=now - timedelta(days=1, seconds=90),
        submitted_at=now - timedelta(days=1)
    )
    session.add(attempt2)

    # Attempt 3: 1 out of 3 correct (most recent)
    attempt3 = UserQuizAttempt(
        user_id=user.id,
        quiz_id=quiz.id,
        score=0.333,
        answers=json.dumps([
            {"questionIndex": 0, "selectedAnswer": "3", "isCorrect": False},
            {"questionIndex": 1, "selectedAnswer": "London", "isCorrect": False},
            {"questionIndex": 2, "selectedAnswer": "25", "isCorrect": True}
        ]),
        time_taken_seconds=60,
        started_at=now - timedelta(seconds=60),
        submitted_at=now
    )
    session.add(attempt3)

    session.commit()

    return {
        'user': user,
        'video': video,
        'quiz': quiz,
        'attempts': [attempt1, attempt2, attempt3]
    }


class TestGetQuizAttempts:
    """Tests for GET /api/llm/quiz/attempts endpoint."""

    def test_get_attempts_success(self, client, test_data, session):
        """Test successful retrieval of quiz attempts."""
        claims = {
            'uid': test_data['user'].firebase_uid,
            'email': test_data['user'].email,
            'name': test_data['user'].display_name
        }

        with patch(VERIFY_PATCH_PATH, return_value=claims):
            response = client.get(
                f'/api/llm/quiz/attempts?videoId={test_data["video"].youtube_video_id}',
                headers={'Authorization': 'Bearer faketoken'}
            )

        assert response.status_code == 200
        data = response.get_json()

        # Check response structure
        assert 'attempts' in data
        assert 'totalAttempts' in data
        assert 'bestScore' in data
        assert 'averageScore' in data

        # Check attempts count
        assert data['totalAttempts'] == 3
        assert len(data['attempts']) == 3

        # Check attempts are ordered by submitted_at descending (most recent first)
        attempts = data['attempts']
        assert attempts[0]['score'] == 0.333  # Most recent
        assert attempts[1]['score'] == 0.667
        assert attempts[2]['score'] == 1.0    # Oldest

        # Check statistics
        assert data['bestScore'] == 1.0
        assert data['averageScore'] == pytest.approx(0.667, rel=0.01)

        # Check first attempt details
        first_attempt = attempts[0]
        assert 'attemptId' in first_attempt
        assert 'quizId' in first_attempt
        assert first_attempt['totalQuestions'] == 3
        assert first_attempt['correctAnswers'] == 1
        assert first_attempt['timeTakenSeconds'] == 60
        assert 'submittedAt' in first_attempt
        assert 'startedAt' in first_attempt

    def test_get_attempts_no_videoId(self, client, test_data):
        """Test request without videoId parameter."""
        claims = {
            'uid': test_data['user'].firebase_uid,
            'email': test_data['user'].email,
            'name': test_data['user'].display_name
        }

        with patch(VERIFY_PATCH_PATH, return_value=claims):
            response = client.get(
                '/api/llm/quiz/attempts',
                headers={'Authorization': 'Bearer faketoken'}
            )

        assert response.status_code == 400
        data = response.get_json()
        assert 'error' in data
        assert 'videoId' in data['error']

    def test_get_attempts_unauthorized(self, client, test_data):
        """Test request without authentication token."""
        response = client.get(f'/api/llm/quiz/attempts?videoId={test_data["video"].youtube_video_id}')

        assert response.status_code == 401

    def test_get_attempts_wrong_user(self, client, test_data):
        """Test authenticated user trying to access another user's attempts."""
        claims = {
            'uid': 'different-firebase-uid',
            'email': 'different@example.com',
            'name': 'Different User'
        }

        # Create different user in database
        from database import SessionLocal
        db = SessionLocal()
        other_user = User(
            firebase_uid='different-firebase-uid',
            email='different@example.com',
            display_name='Different User'
        )
        db.add(other_user)
        db.commit()
        db.close()

        with patch(VERIFY_PATCH_PATH, return_value=claims):
            response = client.get(
                f'/api/llm/quiz/attempts?videoId={test_data["video"].youtube_video_id}',
                headers={'Authorization': 'Bearer faketoken'}
            )

        # Should return empty attempts since this user has no attempts
        assert response.status_code == 200
        data = response.get_json()
        assert data['totalAttempts'] == 0
        assert len(data['attempts']) == 0
        assert data['bestScore'] == 0
        assert data['averageScore'] == 0

    def test_get_attempts_video_not_found(self, client, test_data):
        """Test request with non-existent video ID."""
        claims = {
            'uid': test_data['user'].firebase_uid,
            'email': test_data['user'].email,
            'name': test_data['user'].display_name
        }

        with patch(VERIFY_PATCH_PATH, return_value=claims):
            response = client.get(
                '/api/llm/quiz/attempts?videoId=nonexistent_video',
                headers={'Authorization': 'Bearer faketoken'}
            )

        assert response.status_code == 404
        data = response.get_json()
        assert 'error' in data
        assert 'Video not found' in data['error']

    def test_get_attempts_no_attempts(self, client, session):
        """Test when user has no attempts for the video."""
        # Create user and video but no attempts
        user = User(
            firebase_uid='new-user-uid',
            email='newuser@example.com',
            display_name='New User'
        )
        session.add(user)

        video = Video(
            youtube_video_id='new_video_456',
            title='New Video',
            duration_seconds=300
        )
        session.add(video)
        session.commit()

        claims = {
            'uid': 'new-user-uid',
            'email': 'newuser@example.com',
            'name': 'New User'
        }

        with patch(VERIFY_PATCH_PATH, return_value=claims):
            response = client.get(
                '/api/llm/quiz/attempts?videoId=new_video_456',
                headers={'Authorization': 'Bearer faketoken'}
            )

        assert response.status_code == 200
        data = response.get_json()
        assert data['totalAttempts'] == 0
        assert len(data['attempts']) == 0
        assert data['bestScore'] == 0
        assert data['averageScore'] == 0

    def test_get_attempts_multiple_quizzes_same_video(self, client, test_data, session):
        """Test retrieval when video has multiple quizzes."""
        # Create second quiz for the same video
        quiz2 = Quiz(
            video_id=test_data['video'].id,
            title='Test Quiz 2',
            num_questions=2,
            difficulty='beginner',
            questions_data=json.dumps([
                {"id": 1, "question": "Q1?", "options": ["A", "B"], "correctAnswer": 0},
                {"id": 2, "question": "Q2?", "options": ["C", "D"], "correctAnswer": 1}
            ])
        )
        session.add(quiz2)
        session.flush()

        # Add attempt for second quiz
        now = datetime.now(timezone.utc)
        attempt4 = UserQuizAttempt(
            user_id=test_data['user'].id,
            quiz_id=quiz2.id,
            score=0.5,
            answers=json.dumps([
                {"questionIndex": 0, "selectedAnswer": "A", "isCorrect": True},
                {"questionIndex": 1, "selectedAnswer": "C", "isCorrect": False}
            ]),
            time_taken_seconds=45,
            started_at=now - timedelta(seconds=45),
            submitted_at=now
        )
        session.add(attempt4)
        session.commit()

        claims = {
            'uid': test_data['user'].firebase_uid,
            'email': test_data['user'].email,
            'name': test_data['user'].display_name
        }

        with patch(VERIFY_PATCH_PATH, return_value=claims):
            response = client.get(
                f'/api/llm/quiz/attempts?videoId={test_data["video"].youtube_video_id}',
                headers={'Authorization': 'Bearer faketoken'}
            )

        assert response.status_code == 200
        data = response.get_json()

        # Should include attempts from both quizzes
        assert data['totalAttempts'] == 4
        assert len(data['attempts']) == 4
