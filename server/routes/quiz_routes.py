"""
Quiz generation, submission, and management routes for LearnFlow.
Handles quiz generation, caching, submission, and attempt history.
"""

import json
import traceback
import re
from datetime import datetime, timedelta, timezone
from flask import Blueprint, request, jsonify, g
from database import SessionLocal
from services import (
    generate_quiz,
    get_video_by_youtube_id
)
from utils import quiz_cache
from utils.logger import get_logger
from models import Quiz, UserQuizAttempt, User
from middleware.auth import auth_required
from middleware.rate_limit import rate_limit
from .db_helpers import (
    get_cached_quiz_from_db,
    save_quiz_to_db
)

# Configure logging
logger = get_logger(__name__)

# Blueprint for quiz routes
quiz_bp = Blueprint('quiz', __name__, url_prefix='/api/llm')


@quiz_bp.route('/quiz/generate', methods=['POST'])
@rate_limit(max_requests=5, window_seconds=3600, scope='video')
def generate_quiz_route():
    """
    Generate quiz questions from video transcript.

    Request Body:
        {
            "videoId": "abc123",
            "transcript": {
                "snippets": [
                    {"text": "...", "start": 0.0, "duration": 1.5},
                    ...
                ],
                "language": "English",
                "languageCode": "en"
            },
            "numQuestions": 5
        }

    Returns:
        {
            "videoId": "abc123",
            "language": "en",
            "cached": false,
            "questions": [
                {
                    "id": 1,
                    "question": "Question text?",
                    "options": ["A", "B", "C", "D"],
                    "correctAnswer": 0,
                    "explanation": "Why this is correct"
                }
            ],
            "totalQuestions": 5
        }

    Status Codes:
        200: Success
        400: Invalid request data
        500: Internal server error
    """
    try:
        data = request.get_json()

        if not data:
            return jsonify({'error': 'No data provided'}), 400

        video_id = data.get('videoId')
        transcript_data = data.get('transcript')
        num_questions = data.get('numQuestions', 5)

        # Validation
        if not video_id:
            return jsonify({'error': 'videoId is required'}), 400

        if not transcript_data:
            return jsonify({'error': 'transcript is required'}), 400

        if not transcript_data.get('snippets'):
            return jsonify({'error': 'transcript.snippets is required'}), 400

        language_code = transcript_data.get('languageCode', 'en')

        # Check cache first (memory)
        cache_key = f"{video_id}:{language_code}:{num_questions}"
        cached_data = quiz_cache.get(cache_key)
        if cached_data:
            response = cached_data.copy()
            response['cached'] = True
            response['source'] = 'memory'
            return jsonify(response), 200

        # Check database cache
        db_quiz = get_cached_quiz_from_db(video_id)
        if db_quiz:
            # Cache in memory for faster subsequent access
            quiz_cache.set(cache_key, db_quiz)
            response = db_quiz.copy()
            response['cached'] = True
            response['source'] = 'database'
            return jsonify(response), 200

        # Generate quiz
        quiz = generate_quiz(
            transcript_data=transcript_data,
            video_id=video_id,
            num_questions=num_questions
        )

        # Save to database and get updated data with ID
        quiz_with_id = save_quiz_to_db(video_id, quiz)

        # Use the version with ID if available, otherwise use original
        final_quiz = quiz_with_id if quiz_with_id else quiz

        # Cache the result with ID in memory
        quiz_cache.set(cache_key, final_quiz)

        # Add cached flag
        response = final_quiz.copy()
        response['cached'] = False
        response['source'] = 'generated'

        return jsonify(response), 200

    except ValueError as e:
        # ValueError messages are safe to expose (validation errors only)
        logger.warning(
            f"Validation error generating quiz for video {video_id}: {str(e)}"
        )
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        error_msg = str(e)
        
        # Handle quota exhaustion gracefully
        if '429' in error_msg or 'RESOURCE_EXHAUSTED' in error_msg or 'quota' in error_msg.lower():
            logger.warning(
                f"Gemini API quota exhausted for video {video_id}. Try again later."
            )
            # Extract retry delay if available
            retry_after = None
            if 'retry in' in error_msg.lower():
                match = re.search(r'retry in ([\d.]+)s', error_msg.lower())
                if match:
                    retry_after = float(match.group(1))
            
            response = {
                'error': 'Quiz generation quota exceeded. Please try again later.',
                'code': 'QUOTA_EXHAUSTED'
            }
            if retry_after:
                response['retryAfterSeconds'] = int(retry_after)
            
            return jsonify(response), 429
        
        logger.error(
            f"Error generating quiz for video {video_id}: {str(e)}",
            exc_info=True
        )
        return jsonify({'error': 'Failed to generate quiz'}), 500


@quiz_bp.route('/quiz/cache/clear', methods=['POST'])
def clear_quiz_cache():
    """
    Clear the quiz cache for a specific video to allow regenerating questions.
    Clears both memory cache and database records.

    Request Body:
        {"videoId": "abc123"}

    Returns:
        {"message": "Cache cleared", "clearedItems": 1}
    """
    try:
        data = request.get_json() or {}
        video_id = data.get('videoId')
        
        # Clear memory cache (simple clear for now, could be more targeted)
        cleared_count = quiz_cache.clear()
        
        db_cleared = False
        if video_id:
            db = SessionLocal()
            try:
                # Find video by YouTube ID
                video = get_video_by_youtube_id(video_id, db)
                if video:
                    # Safe approach: Check for existing quiz attempts before deleting
                    # to avoid foreign key constraint violations
                    quiz_records = db.query(Quiz).filter_by(video_id=video.id).all()
                    quiz_ids_to_delete = [q.id for q in quiz_records]
                    
                    # Check if any UserQuizAttempts reference these quizzes
                    existing_attempts = db.query(UserQuizAttempt).filter(
                        UserQuizAttempt.quiz_id.in_(quiz_ids_to_delete)
                    ).count()
                    
                    if existing_attempts > 0:
                        # Soft delete: Add a deleted/active flag to Quiz model in future
                        # For now, we'll clear the quiz cache but let the generation 
                        # service create a new quiz rather than deleting existing ones
                        logger.info(f"Skipping quiz deletion for video {video.id} due to existing attempts")
                        db_cleared = False  # Memory cache cleared but DB records preserved
                    else:
                        # Safe to delete - no attempts reference these quizzes
                        db.query(Quiz).filter_by(video_id=video.id).delete()
                        db.commit()
                        db_cleared = True
            except Exception as e:
                logger.error(f"Error clearing quiz DB cache: {e}", exc_info=True)
                db.rollback()
            finally:
                db.close()

        return jsonify({
            'message': 'Quiz cache cleared',
            'clearedItems': cleared_count,
            'dbCleared': db_cleared
        }), 200
    except Exception as e:
        logger.error(f"Error in clear_quiz_cache: {str(e)}")
        return jsonify({'error': 'Failed to clear cache'}), 500


@quiz_bp.route('/quiz/submit', methods=['POST'])
@auth_required
def submit_quiz():
    """
    Submit quiz answers and calculate score.

    Requires authentication via Firebase ID token in Authorization header.
    User is determined from the auth token (not request body).
    Answer validation is performed server-side against stored quiz questions.
    Do NOT send isCorrect field - it will be calculated server-side.

    Request Body:
        {
            "quizId": 5,
            "answers": [
                {"questionIndex": 0, "selectedAnswer": "Option B"},
                {"questionIndex": 1, "selectedAnswer": "Option A"},
                ...
            ],
            "timeTakenSeconds": 120
        }

    Returns:
        {
            "attemptId": 15,
            "score": 0.75,
            "totalQuestions": 4,
            "correctAnswers": 3,
            "submittedAt": "2025-12-07T18:30:00",
            "startedAt": "2025-12-07T18:28:00"
        }

    Status Codes:
        200: Success
        400: Invalid request data (missing quizId or answers)
        401: Unauthorized (invalid/missing token)
        404: User or quiz not found
        500: Server error (including invalid quiz data)
    """
    data = request.get_json()

    # Validate required fields
    required_fields = ['quizId', 'answers']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing required field: {field}'}), 400

    quiz_id = data['quizId']
    answers = data['answers']
    time_taken = data.get('timeTakenSeconds')

    if not isinstance(answers, list) or len(answers) == 0:
        return jsonify({'error': 'Answers must be a non-empty array'}), 400

    # Get authenticated user's Firebase UID from token
    firebase_uid = g.firebase_user.get('uid')

    db = SessionLocal()
    try:
        # Look up user by Firebase UID
        user = db.query(User).filter_by(firebase_uid=firebase_uid).first()
        if not user:
            return jsonify({'error': 'User not found'}), 404

        # Verify quiz exists
        quiz = db.query(Quiz).filter_by(id=quiz_id).first()
        if not quiz:
            return jsonify({'error': 'Quiz not found'}), 404

        # Parse quiz questions to validate answers server-side
        quiz_questions = []
        if quiz.questions_data:
            try:
                quiz_questions = json.loads(quiz.questions_data)
            except json.JSONDecodeError:
                return jsonify({'error': 'Invalid quiz data'}), 500

        # Validate answers server-side - DO NOT trust client's isCorrect field
        # Use quiz_questions length to prevent cheating (users can't cherry-pick questions)
        total_questions = len(quiz_questions)
        correct_count = 0

        for answer in answers:
            question_idx = answer.get('questionIndex')
            selected_answer = answer.get('selectedAnswer')

            # Validate against server-side quiz data
            if (isinstance(question_idx, int) and
                0 <= question_idx < len(quiz_questions) and
                selected_answer is not None):
                correct_answer = quiz_questions[question_idx].get('correctAnswer')
                if selected_answer == correct_answer:
                    correct_count += 1

        score = correct_count / total_questions if total_questions > 0 else 0

        # Calculate started_at based on time_taken
        submitted_at = datetime.now(timezone.utc)
        started_at = submitted_at
        if time_taken:
            started_at = submitted_at - timedelta(seconds=time_taken)

        # Create quiz attempt record
        attempt = UserQuizAttempt(
            user_id=user.id,
            quiz_id=quiz_id,
            score=score,
            answers=json.dumps(answers),
            time_taken_seconds=time_taken,
            started_at=started_at,
            submitted_at=submitted_at
        )

        db.add(attempt)
        db.commit()
        db.refresh(attempt)

        return jsonify({
            'attemptId': attempt.id,
            'score': score,
            'totalQuestions': total_questions,
            'correctAnswers': correct_count,
            'submittedAt': attempt.submitted_at.isoformat(),
            'startedAt': attempt.started_at.isoformat() if attempt.started_at else None
        }), 200

    except Exception as e:
        db.rollback()
        print(f"Error submitting quiz: {e}")
        traceback.print_exc()
        return jsonify({'error': 'Failed to submit quiz'}), 500
    finally:
        db.close()


@quiz_bp.route('/quiz/attempts', methods=['GET'])
@auth_required
def get_quiz_attempts():
    """
    Get all quiz attempts for a user on a specific video.

    Requires authentication via Firebase ID token in Authorization header.

    Query Parameters:
        videoId (str): YouTube video ID (required)

    Returns:
        {
            "attempts": [
                {
                    "attemptId": 15,
                    "quizId": 5,
                    "score": 0.8,
                    "totalQuestions": 5,
                    "correctAnswers": 4,
                    "timeTakenSeconds": 120,
                    "submittedAt": "2025-12-07T18:30:00",
                    "startedAt": "2025-12-07T18:28:00"
                },
                ...
            ],
            "totalAttempts": 3,
            "bestScore": 0.8,
            "averageScore": 0.7
        }

    Status Codes:
        200: Success
        400: Missing videoId parameter
        401: Unauthorized (invalid/missing token)
        404: Video not found
        500: Server error
    """
    video_id = request.args.get('videoId')
    
    if not video_id:
        return jsonify({'error': 'videoId query parameter is required'}), 400
    
    db = SessionLocal()
    try:
        # Get authenticated user
        firebase_uid = g.firebase_user.get('uid')
        user = db.query(User).filter_by(firebase_uid=firebase_uid).first()
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Get video by YouTube ID
        video = get_video_by_youtube_id(video_id, db)
        
        if not video:
            return jsonify({'error': 'Video not found'}), 404
        
        # Get all quizzes for this video
        quizzes = db.query(Quiz).filter_by(video_id=video.id).all()
        quiz_ids = [q.id for q in quizzes]
        
        # Create quiz lookup dictionary to avoid N+1 queries
        quiz_map = {q.id: q for q in quizzes}
        
        # Get all attempts by this user for quizzes on this video
        attempts = db.query(UserQuizAttempt).filter(
            UserQuizAttempt.user_id == user.id,
            UserQuizAttempt.quiz_id.in_(quiz_ids)
        ).order_by(UserQuizAttempt.submitted_at.desc()).all()
        
        # Parse attempts and extract question counts
        attempts_data = []
        scores = []
        
        for attempt in attempts:
            # Get the quiz from the lookup dictionary
            quiz = quiz_map.get(attempt.quiz_id)
            total_questions = 0
            
            if quiz and quiz.questions_data:
                try:
                    questions = json.loads(quiz.questions_data)
                    total_questions = len(questions)
                except (json.JSONDecodeError, TypeError) as e:
                    # Fallback to num_questions if questions_data is corrupted
                    # Note: This may not match actual questions if data is inconsistent
                    total_questions = quiz.num_questions or 0
                    print(f"Warning: Failed to parse questions_data for quiz {quiz.id}: {e}")
            
            # Calculate correct answers server-side by validating against quiz data
            correct_answers = 0
            if attempt.answers and quiz and quiz.questions_data:
                try:
                    answers = json.loads(attempt.answers)
                    questions = json.loads(quiz.questions_data)
                    
                    # Validate using questionIndex (0-based) which matches submit_quiz format
                    for ans in answers:
                        question_idx = ans.get('questionIndex')
                        selected = ans.get('selectedAnswer')
                        if (isinstance(question_idx, int) and 
                            0 <= question_idx < len(questions) and 
                            selected == questions[question_idx].get('correctAnswer')):
                            correct_answers += 1
                                
                except Exception as e:
                    print(f"Warning: Failed to validate answers for attempt {attempt.id}: {e}")
                    pass
            
            attempts_data.append({
                'attemptId': attempt.id,
                'quizId': attempt.quiz_id,
                'score': attempt.score,
                'totalQuestions': total_questions,
                'correctAnswers': correct_answers,
                'timeTakenSeconds': attempt.time_taken_seconds,
                'submittedAt': attempt.submitted_at.isoformat() if attempt.submitted_at else None,
                'startedAt': attempt.started_at.isoformat() if attempt.started_at else None
            })
            
            if attempt.score is not None:
                scores.append(attempt.score)
        
        # Calculate statistics
        best_score = max(scores) if scores else 0
        average_score = sum(scores) / len(scores) if scores else 0
        
        return jsonify({
            'attempts': attempts_data,
            'totalAttempts': len(attempts_data),
            'bestScore': best_score,
            'averageScore': round(average_score, 3)
        }), 200
    
    except Exception as e:
        logger.error(f"Error reading quiz from database: {e}", exc_info=True)
        return jsonify({'error': 'Failed to fetch quiz attempts'}), 500
    finally:
        db.close()
