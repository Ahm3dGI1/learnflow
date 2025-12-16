"""
Tests for quiz submission and checkpoint completion endpoints.

Tests the Option A implementation that creates database records with IDs
for quizzes and checkpoints, and includes authentication checks.

These are UNIT TESTS - they use Flask test client and don't require a running server.
"""

import json
import pytest
from datetime import datetime, timezone
from unittest.mock import patch

from models import (
    User, Video, Quiz, Checkpoint,
    UserQuizAttempt, UserCheckpointCompletion
)

# Mark all tests in this module as unit tests
pytestmark = pytest.mark.unit

# Patch target for Firebase token verification
VERIFY_PATCH_PATH = "middleware.auth.verify_id_token"


@pytest.fixture
def client():
    """Create Flask app test client."""
    from app import app
    app.testing = True
    with app.test_client() as client:
        yield client


@pytest.fixture(scope="function")
def test_data(session):
    """Create test data for each test. Cleanup is handled by session fixture."""
    # Create user
    user = User(
        firebase_uid='test-firebase-uid',
        email='test@example.com',
        display_name='Test User'
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    # Create video
    video = Video(
        youtube_video_id='test-video-123',
        title='Test Video'
    )
    session.add(video)
    session.commit()
    session.refresh(video)

    # Create quiz
    quiz = Quiz(
        video_id=video.id,
        title='Test Quiz',
        num_questions=3,
        questions_data=json.dumps([
            {
                'id': 1,
                'question': 'Question 1?',
                'options': ['A', 'B', 'C', 'D'],
                'correctAnswer': 'B',
                'explanation': 'Explanation 1'
            },
            {
                'id': 2,
                'question': 'Question 2?',
                'options': ['A', 'B', 'C', 'D'],
                'correctAnswer': 'A',
                'explanation': 'Explanation 2'
            },
            {
                'id': 3,
                'question': 'Question 3?',
                'options': ['A', 'B', 'C', 'D'],
                'correctAnswer': 'C',
                'explanation': 'Explanation 3'
            }
        ])
    )
    session.add(quiz)

    # Create checkpoints
    checkpoints = []
    for i in range(3):
        checkpoint = Checkpoint(
            video_id=video.id,
            time_seconds=60 * (i + 1),
            title=f'Checkpoint {i + 1}',
            subtopic=f'Subtopic {i + 1}',
            order_index=i + 1,
            question_data=json.dumps({
                'question': f'Question {i + 1}?',
                'options': ['A', 'B', 'C', 'D'],
                'correctAnswer': 'B',
                'explanation': f'Explanation {i + 1}'
            })
        )
        session.add(checkpoint)
        checkpoints.append(checkpoint)

    session.commit()

    return {
        'user': user,
        'video': video,
        'quiz': quiz,
        'checkpoints': checkpoints
    }


# ========== QUIZ GENERATION TESTS ==========

class TestQuizGeneration:
    """Tests for quiz generation with database IDs."""

    @patch('routes.quiz_routes.generate_quiz')
    def test_quiz_generation_creates_database_record(self, mock_generate, client, session):
        """Test that quiz generation creates a Quiz database record with ID."""
        # Create a new video for this test to avoid cache collision
        new_video = Video(
            youtube_video_id='quiz-gen-test-video',
            title='Quiz Gen Test Video'
        )
        session.add(new_video)
        session.commit()

        # Mock LLM response
        mock_generate.return_value = {
            'videoId': 'quiz-gen-test-video',
            'language': 'en',
            'questions': [
                {
                    'id': 1,
                    'question': 'Test question?',
                    'options': ['A', 'B', 'C', 'D'],
                    'correctAnswer': 'B',
                    'explanation': 'Test explanation'
                }
            ],
            'totalQuestions': 1
        }

        response = client.post('/api/llm/quiz/generate', json={
            'videoId': 'quiz-gen-test-video',
            'transcript': {
                'snippets': [{'text': 'test', 'start': 0, 'duration': 1}],
                'languageCode': 'en'
            },
            'numQuestions': 1
        })

        assert response.status_code == 200
        data = response.get_json()

        # Check response has quizId
        assert 'quizId' in data
        assert isinstance(data['quizId'], int)

        # Verify database record exists
        quiz = session.query(Quiz).filter_by(id=data['quizId']).first()
        assert quiz is not None
        assert quiz.video_id == new_video.id
        assert quiz.num_questions == 1

    def test_quiz_cache_returns_quiz_with_id(self, client, test_data, session):
        """Test that cached quiz from database includes quizId."""
        response = client.post('/api/llm/quiz/generate', json={
            'videoId': 'test-video-123',
            'transcript': {
                'snippets': [{'text': 'test', 'start': 0, 'duration': 1}],
                'languageCode': 'en'
            },
            'numQuestions': 3
        })

        assert response.status_code == 200
        data = response.get_json()

        # Check cached response has quizId from database
        assert 'quizId' in data
        assert data['quizId'] == test_data['quiz'].id


# ========== CHECKPOINT GENERATION TESTS ==========

class TestCheckpointGeneration:
    """Tests for checkpoint generation with database IDs."""

    @patch('routes.checkpoint_routes.generate_checkpoints')
    def test_checkpoint_generation_creates_database_records(self, mock_generate, client, test_data, session):
        """Test that checkpoint generation creates Checkpoint database records with IDs."""
        # Mock LLM response
        mock_generate.return_value = {
            'videoId': 'new-video-456',
            'language': 'en',
            'checkpoints': [
                {
                    'id': 1,
                    'timestamp': '01:00',
                    'timestampSeconds': 60,
                    'title': 'Test Checkpoint',
                    'subtopic': 'Test Subtopic',
                    'question': 'Test question?',
                    'options': ['A', 'B', 'C', 'D'],
                    'correctAnswer': 'B',
                    'explanation': 'Test explanation'
                }
            ],
            'totalCheckpoints': 1
        }

        # Create new video for this test
        new_video = Video(
            youtube_video_id='new-video-456',
            title='New Video'
        )
        session.add(new_video)
        session.commit()

        response = client.post('/api/llm/checkpoints/generate', json={
            'videoId': 'new-video-456',
            'transcript': {
                'snippets': [{'text': 'test', 'start': 0, 'duration': 1}],
                'languageCode': 'en'
            }
        })

        assert response.status_code == 200
        data = response.get_json()

        # Check response checkpoints have database IDs
        assert 'checkpoints' in data
        assert len(data['checkpoints']) == 1
        assert 'id' in data['checkpoints'][0]
        assert isinstance(data['checkpoints'][0]['id'], int)

        # Verify database records exist
        checkpoints = session.query(Checkpoint).filter_by(video_id=new_video.id).all()
        assert len(checkpoints) == 1
        assert checkpoints[0].title == 'Test Checkpoint'
        assert checkpoints[0].time_seconds == 60

    def test_checkpoint_cache_returns_checkpoints_with_ids(self, client, test_data, session):
        """Test that cached checkpoints from database include IDs."""
        response = client.post('/api/llm/checkpoints/generate', json={
            'videoId': 'test-video-123',
            'transcript': {
                'snippets': [{'text': 'test', 'start': 0, 'duration': 1}],
                'languageCode': 'en'
            }
        })

        assert response.status_code == 200
        data = response.get_json()

        # Check all checkpoints have IDs from database
        assert 'checkpoints' in data
        for i, checkpoint in enumerate(data['checkpoints']):
            assert 'id' in checkpoint
            assert checkpoint['id'] == test_data['checkpoints'][i].id


# ========== QUIZ SUBMISSION TESTS ==========

class TestQuizSubmission:
    """Tests for quiz submission endpoint with authentication."""

    def test_quiz_submission_requires_auth(self, client, test_data):
        """Test that quiz submission requires authentication."""
        response = client.post('/api/llm/quiz/submit', json={
            'quizId': test_data['quiz'].id,
            'answers': []
        })

        # Should fail without auth
        assert response.status_code == 401

    def test_quiz_submission_success(self, client, test_data, session):
        """Test successful quiz submission."""
        claims = {'uid': 'test-firebase-uid', 'email': 'test@example.com', 'name': 'Test User'}

        with patch(VERIFY_PATCH_PATH, return_value=claims):
            response = client.post('/api/llm/quiz/submit',
                headers={'Authorization': 'Bearer faketoken'},
                json={
                    'quizId': test_data['quiz'].id,
                    'answers': [
                        {'questionIndex': 0, 'selectedAnswer': 'B'},
                        {'questionIndex': 1, 'selectedAnswer': 'A'},
                        {'questionIndex': 2, 'selectedAnswer': 'D'}
                    ],
                    'timeTakenSeconds': 120
                })

        assert response.status_code == 200
        data = response.get_json()

        # Check response
        assert 'attemptId' in data
        assert data['score'] == 2/3
        assert data['totalQuestions'] == 3
        assert data['correctAnswers'] == 2
        assert 'submittedAt' in data
        assert 'startedAt' in data

        # Verify database record
        attempt = session.query(UserQuizAttempt).filter_by(id=data['attemptId']).first()
        assert attempt is not None
        assert attempt.user_id == test_data['user'].id
        assert attempt.quiz_id == test_data['quiz'].id
        assert attempt.score == 2/3
        assert attempt.time_taken_seconds == 120
        assert attempt.started_at is not None
        assert attempt.submitted_at is not None

    def test_quiz_submission_calculates_started_at(self, client, test_data, session):
        """Test that started_at is calculated from timeTakenSeconds."""
        claims = {'uid': 'test-firebase-uid', 'email': 'test@example.com', 'name': 'Test User'}

        with patch(VERIFY_PATCH_PATH, return_value=claims):
            response = client.post('/api/llm/quiz/submit',
                headers={'Authorization': 'Bearer faketoken'},
                json={
                    'quizId': test_data['quiz'].id,
                    'answers': [
                        {'questionIndex': 0, 'selectedAnswer': 'B'}
                    ],
                    'timeTakenSeconds': 300
                })

        assert response.status_code == 200
        data = response.get_json()

        attempt = session.query(UserQuizAttempt).filter_by(id=data['attemptId']).first()
        time_diff = (attempt.submitted_at - attempt.started_at).total_seconds()
        assert abs(time_diff - 300) < 2  # Allow 2 second tolerance

    def test_quiz_submission_prevents_user_spoofing(self, client, test_data, session):
        """Test that endpoint uses authenticated user from token."""
        # Create another user
        other_user = User(
            firebase_uid='other-firebase-uid',
            email='other@example.com',
            display_name='Other User'
        )
        session.add(other_user)
        session.commit()

        claims = {'uid': 'test-firebase-uid', 'email': 'test@example.com', 'name': 'Test User'}

        # Submit quiz - should use authenticated user from token
        with patch(VERIFY_PATCH_PATH, return_value=claims):
            response = client.post('/api/llm/quiz/submit',
                headers={'Authorization': 'Bearer faketoken'},
                json={
                    'quizId': test_data['quiz'].id,
                    'answers': [
                        {'questionIndex': 0, 'selectedAnswer': 'B'}
                    ]
                })

        assert response.status_code == 200
        data = response.get_json()

        # Verify attempt was created for the authenticated user (test_data['user'])
        attempt = session.query(UserQuizAttempt).filter_by(id=data['attemptId']).first()
        assert attempt is not None
        assert attempt.user_id == test_data['user'].id

    def test_quiz_submission_validates_required_fields(self, client, test_data):
        """Test that quiz submission validates required fields."""
        claims = {'uid': 'test-firebase-uid', 'email': 'test@example.com', 'name': 'Test User'}

        with patch(VERIFY_PATCH_PATH, return_value=claims):
            # Missing quizId
            response = client.post('/api/llm/quiz/submit',
                headers={'Authorization': 'Bearer faketoken'},
                json={
                    'answers': []
                })
            assert response.status_code == 400

            # Missing answers
            response = client.post('/api/llm/quiz/submit',
                headers={'Authorization': 'Bearer faketoken'},
                json={
                    'quizId': test_data['quiz'].id
                })
            assert response.status_code == 400

            # Empty answers array
            response = client.post('/api/llm/quiz/submit',
                headers={'Authorization': 'Bearer faketoken'},
                json={
                    'quizId': test_data['quiz'].id,
                    'answers': []
                })
            assert response.status_code == 400


# ========== CHECKPOINT COMPLETION TESTS ==========

class TestCheckpointCompletion:
    """Tests for checkpoint completion endpoint with authentication."""

    def test_checkpoint_completion_requires_auth(self, client, test_data):
        """Test that checkpoint completion requires authentication."""
        response = client.post(
            f'/api/llm/checkpoints/{test_data["checkpoints"][0].id}/complete',
            json={
                'userId': test_data['user'].id,
                'selectedAnswer': 'B'
            }
        )

        assert response.status_code == 401

    def test_checkpoint_completion_success(self, client, test_data, session):
        """Test successful checkpoint completion."""
        checkpoint_id = test_data['checkpoints'][0].id
        claims = {'uid': 'test-firebase-uid', 'email': 'test@example.com', 'name': 'Test User'}

        # Test data checkpoints have correctAnswer: 'B'
        with patch(VERIFY_PATCH_PATH, return_value=claims):
            response = client.post(
                f'/api/llm/checkpoints/{checkpoint_id}/complete',
                headers={'Authorization': 'Bearer faketoken'},
                json={
                    'userId': test_data['user'].id,
                    'selectedAnswer': 'B'  # Correct answer
                }
            )

        assert response.status_code == 200
        data = response.get_json()

        # Check response
        assert 'completionId' in data
        assert data['checkpointId'] == checkpoint_id
        assert data['isCompleted'] is True
        assert data['attemptCount'] == 1
        assert 'completedAt' in data

        # Verify database record
        completion = session.query(UserCheckpointCompletion).filter_by(
            id=data['completionId']
        ).first()
        assert completion is not None
        assert completion.user_id == test_data['user'].id
        assert completion.checkpoint_id == checkpoint_id
        assert completion.is_completed is True
        assert completion.attempt_count == 1

    def test_checkpoint_completion_tracks_attempts(self, client, test_data, session):
        """Test that checkpoint completion tracks multiple attempts."""
        checkpoint_id = test_data['checkpoints'][0].id
        claims = {'uid': 'test-firebase-uid', 'email': 'test@example.com', 'name': 'Test User'}

        # Test data checkpoints have correctAnswer: 'B'
        with patch(VERIFY_PATCH_PATH, return_value=claims):
            # First attempt - incorrect answer
            response = client.post(
                f'/api/llm/checkpoints/{checkpoint_id}/complete',
                headers={'Authorization': 'Bearer faketoken'},
                json={
                    'userId': test_data['user'].id,
                    'selectedAnswer': 'A'  # Wrong answer
                }
            )
            assert response.status_code == 200
            data = response.get_json()
            assert data['isCompleted'] is False
            assert data['attemptCount'] == 1

            # Second attempt - correct answer
            response = client.post(
                f'/api/llm/checkpoints/{checkpoint_id}/complete',
                headers={'Authorization': 'Bearer faketoken'},
                json={
                    'userId': test_data['user'].id,
                    'selectedAnswer': 'B'  # Correct answer
                }
            )
            assert response.status_code == 200
            data = response.get_json()
            assert data['isCompleted'] is True
            assert data['attemptCount'] == 2

    def test_checkpoint_completion_prevents_user_spoofing(self, client, test_data, session):
        """Test that endpoint uses authenticated user from token."""
        # Create another user
        other_user = User(
            firebase_uid='other-firebase-uid',
            email='other@example.com',
            display_name='Other User'
        )
        session.add(other_user)
        session.commit()

        checkpoint_id = test_data['checkpoints'][0].id
        claims = {'uid': 'test-firebase-uid', 'email': 'test@example.com', 'name': 'Test User'}

        # Complete checkpoint - should use authenticated user from token
        with patch(VERIFY_PATCH_PATH, return_value=claims):
            response = client.post(
                f'/api/llm/checkpoints/{checkpoint_id}/complete',
                headers={'Authorization': 'Bearer faketoken'},
                json={
                    'selectedAnswer': 'B'
                }
            )

        # Should succeed using authenticated user
        assert response.status_code == 200

        # Verify completion was created for the authenticated user (test_data['user'])
        completion = session.query(UserCheckpointCompletion).filter_by(
            checkpoint_id=checkpoint_id,
            user_id=test_data['user'].id
        ).first()
        assert completion is not None
        assert completion.user_id == test_data['user'].id


# ========== CHECKPOINT PROGRESS TESTS ==========

class TestCheckpointProgress:
    """Tests for checkpoint progress endpoint with authentication."""

    def test_checkpoint_progress_requires_auth(self, client, test_data):
        """Test that checkpoint progress requires authentication."""
        response = client.get(
            f'/api/llm/videos/{test_data["video"].id}/checkpoint-progress?userId={test_data["user"].id}'
        )

        assert response.status_code == 401

    def test_checkpoint_progress_success(self, client, test_data, session):
        """Test successful checkpoint progress retrieval."""
        # Create some completions
        completion1 = UserCheckpointCompletion(
            user_id=test_data['user'].id,
            checkpoint_id=test_data['checkpoints'][0].id,
            is_completed=True,
            completed_at=datetime.now(timezone.utc),
            attempt_count=1
        )
        completion2 = UserCheckpointCompletion(
            user_id=test_data['user'].id,
            checkpoint_id=test_data['checkpoints'][1].id,
            is_completed=False,
            attempt_count=2
        )
        session.add_all([completion1, completion2])
        session.commit()

        claims = {'uid': 'test-firebase-uid', 'email': 'test@example.com', 'name': 'Test User'}

        with patch(VERIFY_PATCH_PATH, return_value=claims):
            response = client.get(
                f'/api/llm/videos/{test_data["video"].id}/checkpoint-progress?userId={test_data["user"].id}',
                headers={'Authorization': 'Bearer faketoken'}
            )

        assert response.status_code == 200
        data = response.get_json()

        # Check response
        assert data['videoId'] == test_data['video'].id
        assert data['totalCheckpoints'] == 3
        assert data['completedCheckpoints'] == 1
        assert data['progressPercentage'] == 33.3
        assert len(data['completions']) == 3

        # Check completion details
        completions_by_id = {c['checkpointId']: c for c in data['completions']}
        assert completions_by_id[test_data['checkpoints'][0].id]['isCompleted'] is True
        assert completions_by_id[test_data['checkpoints'][1].id]['isCompleted'] is False
        assert completions_by_id[test_data['checkpoints'][2].id]['isCompleted'] is False

    def test_checkpoint_progress_prevents_user_spoofing(self, client, test_data, session):
        """Test that endpoint uses authenticated user from token, not query parameters."""
        # Create another user with completions
        other_user = User(
            firebase_uid='other-firebase-uid',
            email='other@example.com',
            display_name='Other User'
        )
        session.add(other_user)
        session.commit()

        # Create completion for other_user
        other_completion = UserCheckpointCompletion(
            user_id=other_user.id,
            checkpoint_id=test_data['checkpoints'][0].id,
            is_completed=True,
            completed_at=datetime.now(timezone.utc),
            attempt_count=1
        )
        session.add(other_completion)
        session.commit()

        claims = {'uid': 'test-firebase-uid', 'email': 'test@example.com', 'name': 'Test User'}

        # Get progress - should return authenticated user's progress
        with patch(VERIFY_PATCH_PATH, return_value=claims):
            response = client.get(
                f'/api/llm/videos/{test_data["video"].id}/checkpoint-progress',
                headers={'Authorization': 'Bearer faketoken'}
            )

        assert response.status_code == 200
        data = response.get_json()
        # Should return progress for authenticated user (no completions), not other_user (1 completion)
        assert data['completedCheckpoints'] == 0
