"""
LLM-related API routes for LearnFlow.
Handles endpoints for checkpoint generation, chat, and other AI features.
"""

import json
import logging
import traceback
from flask import Blueprint, request, jsonify, Response
from database import SessionLocal
from services import (
    generate_checkpoints,
    generate_chat_response,
    generate_chat_response_stream,
    generate_quiz,
    generate_summary,
    get_video_by_youtube_id,
    cache_checkpoints
)
from utils import checkpoint_cache, quiz_cache, summary_cache


# Configure logging
logger = logging.getLogger(__name__)

# Blueprint for LLM routes
llm_bp = Blueprint('llm', __name__, url_prefix='/api/llm')


# ========== HELPER FUNCTIONS ==========

def get_cached_checkpoints_from_db(video_id):
    """
    Get cached checkpoints from database.

    Args:
        video_id: YouTube video ID

    Returns:
        dict: Cached checkpoint data or None if not found/error
    """
    db = SessionLocal()
    try:
        video = get_video_by_youtube_id(video_id, db)
        if video and video.checkpoints_data:
            try:
                return json.loads(video.checkpoints_data)
            except json.JSONDecodeError as e:
                print(f"Error parsing cached checkpoints: {e}")
                return None
    except Exception as e:
        print(f"Error reading checkpoints from database: {e}")
        traceback.print_exc()
        return None
    finally:
        db.close()


def save_checkpoints_to_db(video_id, checkpoints_data):
    """
    Save checkpoints to database.

    Args:
        video_id: YouTube video ID
        checkpoints_data: Checkpoint data to cache

    Returns:
        bool: True if successful, False otherwise
    """
    db = SessionLocal()
    try:
        video = get_video_by_youtube_id(video_id, db)
        if video:
            cache_checkpoints(video.id, checkpoints_data, db)
            return True
        return False
    except Exception as e:
        print(f"Error saving checkpoints to database: {e}")
        traceback.print_exc()
        return False
    finally:
        db.close()


@llm_bp.route('/checkpoints/generate', methods=['POST'])
def generate_checkpoints_route():
    """
    Generate learning checkpoints from video transcript.

    Request Body:
        {
            "videoId": "abc123",
            "transcript": {
                "snippets": [
                    {"text": "...", "start": 0.0, "duration": 1.5},
                    ...
                ],
                "language": "English",
                "languageCode": "en",
                "isGenerated": false
            },
            "options": {
                "maxCheckpoints": 8,
                "minInterval": 120
            }
        }

    Returns:
        {
            "videoId": "abc123",
            "language": "en",
            "cached": false,
            "checkpoints": [...],
            "totalCheckpoints": 5
        }

    Status Codes:
        200: Success
        400: Invalid request data
        500: Internal server error
    """
    try:
        # Parse request data
        data = request.get_json()

        if not data:
            return jsonify({'error': 'No data provided'}), 400

        video_id = data.get('videoId')
        transcript_data = data.get('transcript')

        # Validation
        if not video_id:
            return jsonify({'error': 'videoId is required'}), 400

        if not transcript_data:
            return jsonify({'error': 'transcript is required'}), 400

        if not transcript_data.get('snippets'):
            return jsonify({'error': 'transcript.snippets is required'}), 400

        language_code = transcript_data.get('languageCode', 'en')

        # Check cache first (memory)
        cache_key = f"{video_id}:{language_code}"
        cached_data = checkpoint_cache.get(cache_key)
        if cached_data:
            response = cached_data.copy()
            response['cached'] = True
            response['source'] = 'memory'
            return jsonify(response), 200

        # Check database cache
        db_checkpoints = get_cached_checkpoints_from_db(video_id)
        if db_checkpoints:
            # Cache in memory for faster subsequent access
            checkpoint_cache.set(cache_key, db_checkpoints)
            response = db_checkpoints.copy()
            response['cached'] = True
            response['source'] = 'database'
            return jsonify(response), 200

        # Generate checkpoints
        checkpoints = generate_checkpoints(transcript_data, video_id)

        # Cache the result in memory
        checkpoint_cache.set(cache_key, checkpoints)

        # Save to database (non-blocking - don't fail if it errors)
        save_checkpoints_to_db(video_id, checkpoints)

        # Add cached flag
        response = checkpoints.copy()
        response['cached'] = False
        response['source'] = 'generated'

        return jsonify(response), 200

    except ValueError as e:
        # ValueError messages are safe to expose (validation errors only)
        logger.warning(
            f"Validation error generating checkpoints for video "
            f"{video_id}: {str(e)}"
        )
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(
            f"Error generating checkpoints for video {video_id}: {str(e)}",
            exc_info=True
        )
        return jsonify({'error': 'Failed to generate checkpoints'}), 500


@llm_bp.route('/checkpoints/cache/clear', methods=['POST'])
def clear_checkpoint_cache():
    """
    Clear the checkpoint cache (for testing/admin purposes).

    Returns:
        {"message": "Cache cleared", "clearedItems": 5}
    """
    cleared_count = checkpoint_cache.clear()
    return jsonify({
        'message': 'Cache cleared',
        'clearedItems': cleared_count
    }), 200


@llm_bp.route('/health', methods=['GET'])
def health_check():
    """
    Health check endpoint for LLM routes.

    Returns:
        {"status": "ok", "cacheSize": 3}
    """
    return jsonify({
        'status': 'ok',
        'checkpointCacheSize': checkpoint_cache.size(),
        'quizCacheSize': quiz_cache.size(),
        'summaryCacheSize': summary_cache.size()
    }), 200


# ========== CHAT ROUTES ==========

@llm_bp.route('/chat/send', methods=['POST'])
def chat_route():
    """
    Send message to AI tutor and get response.

    Request Body:
        {
            "message": "I don't understand why...",
            "videoContext": {
                "videoId": "abc123",
                "transcriptSnippet": "relevant transcript...",
                "language": "en"
            },
            "timestamp": "05:30"
        }

    Returns:
        {
            "response": "AI tutor response...",
            "videoId": "abc123",
            "timestamp": "05:30"
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

        message = data.get('message')
        video_context = data.get('videoContext', {})
        timestamp = data.get('timestamp')

        # Validation
        if not message:
            return jsonify({'error': 'message is required'}), 400

        # Generate chat response
        response = generate_chat_response(
            message=message,
            video_context=video_context,
            timestamp=timestamp
        )

        return jsonify(response), 200

    except ValueError as e:
        # ValueError messages are safe to expose (validation errors only)
        logger.warning(f"Validation error in chat: {str(e)}")
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f"Error generating chat response: {str(e)}", exc_info=True)
        return jsonify({'error': 'Failed to generate chat response'}), 500


@llm_bp.route('/chat/stream', methods=['POST'])
def chat_stream_route():
    """
    Send message to AI tutor and get streaming response.

    Request Body: Same as /chat/send

    Returns: Text stream

    Status Codes:
        200: Success (streaming)
        400: Invalid request data
        500: Internal server error
    """
    try:
        data = request.get_json()

        if not data:
            return jsonify({'error': 'No data provided'}), 400

        message = data.get('message')
        video_context = data.get('videoContext', {})
        timestamp = data.get('timestamp')

        # Validation
        if not message:
            return jsonify({'error': 'message is required'}), 400

        # Generate streaming response
        def generate():
            try:
                for chunk in generate_chat_response_stream(
                    message=message,
                    video_context=video_context,
                    timestamp=timestamp
                ):
                    yield chunk
            except Exception as e:
                yield f"\n[Error: {str(e)}]"

        return Response(generate(), mimetype='text/plain'), 200

    except ValueError as e:
        # ValueError messages are safe to expose (validation errors only)
        logger.warning(f"Validation error in chat stream: {str(e)}")
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(
            f"Error generating streaming chat response: {str(e)}",
            exc_info=True
        )
        return jsonify({'error': 'Failed to generate streaming chat response'}), 500


# ========== QUIZ ROUTES ==========

@llm_bp.route('/quiz/generate', methods=['POST'])
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

        # Check cache first
        cache_key = f"{video_id}:{language_code}:{num_questions}"
        cached_data = quiz_cache.get(cache_key)
        if cached_data:
            response = cached_data.copy()
            response['cached'] = True
            return jsonify(response), 200

        # Generate quiz
        quiz = generate_quiz(
            transcript_data=transcript_data,
            video_id=video_id,
            num_questions=num_questions
        )

        # Cache the result
        quiz_cache.set(cache_key, quiz)

        # Add cached flag
        response = quiz.copy()
        response['cached'] = False

        return jsonify(response), 200

    except ValueError as e:
        # ValueError messages are safe to expose (validation errors only)
        logger.warning(
            f"Validation error generating quiz for video {video_id}: {str(e)}"
        )
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(
            f"Error generating quiz for video {video_id}: {str(e)}",
            exc_info=True
        )
        return jsonify({'error': 'Failed to generate quiz'}), 500


@llm_bp.route('/quiz/cache/clear', methods=['POST'])
def clear_quiz_cache():
    """
    Clear the quiz cache (for testing/admin purposes).

    Returns:
        {"message": "Cache cleared", "clearedItems": 5}
    """
    cleared_count = quiz_cache.clear()
    return jsonify({
        'message': 'Quiz cache cleared',
        'clearedItems': cleared_count
    }), 200


# ========== SUMMARY ROUTES ==========

@llm_bp.route('/summary/generate', methods=['POST'])
def generate_summary_route():
    """
    Generate video summary from transcript.

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
            }
        }

    Returns:
        {
            "videoId": "abc123",
            "language": "en",
            "cached": false,
            "summary": "The video summary text...",
            "wordCount": 150
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

        # Validation
        if not video_id:
            return jsonify({'error': 'videoId is required'}), 400

        if not transcript_data:
            return jsonify({'error': 'transcript is required'}), 400

        if not transcript_data.get('snippets'):
            return jsonify({'error': 'transcript.snippets is required'}), 400

        language_code = transcript_data.get('languageCode', 'en')

        # Check cache first
        cache_key = f"{video_id}:{language_code}:summary"
        cached_data = summary_cache.get(cache_key)
        if cached_data:
            response = cached_data.copy()
            response['cached'] = True
            return jsonify(response), 200

        # Generate summary
        summary = generate_summary(
            transcript_data=transcript_data,
            video_id=video_id
        )

        # Cache the result
        summary_cache.set(cache_key, summary)

        # Add cached flag
        response = summary.copy()
        response['cached'] = False

        return jsonify(response), 200

    except ValueError as e:
        # ValueError messages are safe to expose (validation errors only)
        logger.warning(
            f"Validation error generating summary for video "
            f"{video_id}: {str(e)}"
        )
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(
            f"Error generating summary for video {video_id}: {str(e)}",
            exc_info=True
        )
        return jsonify({'error': 'Failed to generate summary'}), 500


@llm_bp.route('/summary/cache/clear', methods=['POST'])
def clear_summary_cache():
    """
    Clear the summary cache (for testing/admin purposes).

    Returns:
        {"message": "Cache cleared", "clearedItems": 5}
    """
    cleared_count = summary_cache.clear()
    return jsonify({
        'message': 'Summary cache cleared',
        'clearedItems': cleared_count
    }), 200


# ========== QUIZ SUBMISSION ROUTES ==========

@llm_bp.route('/quiz/submit', methods=['POST'])
def submit_quiz():
    """
    Submit quiz answers and calculate score.

    Request Body:
        {
            "userId": 1,
            "quizId": 5,
            "answers": [
                {"questionIndex": 0, "selectedAnswer": "Option B", "isCorrect": true},
                {"questionIndex": 1, "selectedAnswer": "Option A", "isCorrect": false},
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
            "submittedAt": "2025-12-07T18:30:00"
        }

    Status Codes:
        200: Success
        400: Invalid request data
        404: User or quiz not found
        500: Server error
    """
    from models import UserQuizAttempt, User, Quiz
    from datetime import datetime

    data = request.get_json()

    # Validate required fields
    required_fields = ['userId', 'quizId', 'answers']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing required field: {field}'}), 400

    user_id = data['userId']
    quiz_id = data['quizId']
    answers = data['answers']
    time_taken = data.get('timeTakenSeconds')

    if not isinstance(answers, list) or len(answers) == 0:
        return jsonify({'error': 'Answers must be a non-empty array'}), 400

    db = SessionLocal()
    try:
        # Verify user exists
        user = db.query(User).filter_by(id=user_id).first()
        if not user:
            return jsonify({'error': 'User not found'}), 404

        # Verify quiz exists
        quiz = db.query(Quiz).filter_by(id=quiz_id).first()
        if not quiz:
            return jsonify({'error': 'Quiz not found'}), 404

        # Calculate score
        total_questions = len(answers)
        correct_count = sum(1 for answer in answers if answer.get('isCorrect', False))
        score = correct_count / total_questions if total_questions > 0 else 0

        # Create quiz attempt record
        attempt = UserQuizAttempt(
            user_id=user_id,
            quiz_id=quiz_id,
            score=score,
            answers=json.dumps(answers),
            time_taken_seconds=time_taken,
            submitted_at=datetime.utcnow()
        )

        db.add(attempt)
        db.commit()
        db.refresh(attempt)

        return jsonify({
            'attemptId': attempt.id,
            'score': score,
            'totalQuestions': total_questions,
            'correctAnswers': correct_count,
            'submittedAt': attempt.submitted_at.isoformat()
        }), 200

    except Exception as e:
        db.rollback()
        print(f"Error submitting quiz: {e}")
        traceback.print_exc()
        return jsonify({'error': 'Failed to submit quiz'}), 500
    finally:
        db.close()


# ========== CHECKPOINT COMPLETION ROUTES ==========

@llm_bp.route('/checkpoints/<int:checkpoint_id>/complete', methods=['POST'])
def mark_checkpoint_complete(checkpoint_id):
    """
    Mark a checkpoint as completed for a user.

    Request Body:
        {
            "userId": 1,
            "isCorrect": true
        }

    Returns:
        {
            "completionId": 10,
            "checkpointId": 5,
            "isCompleted": true,
            "attemptCount": 2,
            "completedAt": "2025-12-07T18:30:00"
        }

    Status Codes:
        200: Success
        400: Invalid request data
        404: User or checkpoint not found
        500: Server error
    """
    from models import UserCheckpointCompletion, User, Checkpoint
    from datetime import datetime

    data = request.get_json()

    # Validate required fields
    if 'userId' not in data:
        return jsonify({'error': 'Missing required field: userId'}), 400

    user_id = data['userId']
    is_correct = data.get('isCorrect', False)

    db = SessionLocal()
    try:
        # Verify user exists
        user = db.query(User).filter_by(id=user_id).first()
        if not user:
            return jsonify({'error': 'User not found'}), 404

        # Verify checkpoint exists
        checkpoint = db.query(Checkpoint).filter_by(id=checkpoint_id).first()
        if not checkpoint:
            return jsonify({'error': 'Checkpoint not found'}), 404

        # Check if completion record exists
        completion = db.query(UserCheckpointCompletion).filter_by(
            user_id=user_id,
            checkpoint_id=checkpoint_id
        ).first()

        if completion:
            # Update existing record
            completion.attempt_count += 1
            if is_correct and not completion.is_completed:
                completion.is_completed = True
                completion.completed_at = datetime.utcnow()
        else:
            # Create new completion record
            completion = UserCheckpointCompletion(
                user_id=user_id,
                checkpoint_id=checkpoint_id,
                is_completed=is_correct,
                completed_at=datetime.utcnow() if is_correct else None,
                attempt_count=1
            )
            db.add(completion)

        db.commit()
        db.refresh(completion)

        return jsonify({
            'completionId': completion.id,
            'checkpointId': checkpoint_id,
            'isCompleted': completion.is_completed,
            'attemptCount': completion.attempt_count,
            'completedAt': completion.completed_at.isoformat() if completion.completed_at else None
        }), 200

    except Exception as e:
        db.rollback()
        print(f"Error marking checkpoint complete: {e}")
        traceback.print_exc()
        return jsonify({'error': 'Failed to mark checkpoint complete'}), 500
    finally:
        db.close()


@llm_bp.route('/videos/<int:video_id>/checkpoint-progress', methods=['GET'])
def get_checkpoint_progress(video_id):
    """
    Get checkpoint completion progress for a user on a specific video.

    Query Parameters:
        userId: User ID (required)

    Returns:
        {
            "videoId": 5,
            "totalCheckpoints": 10,
            "completedCheckpoints": 3,
            "progressPercentage": 30,
            "completions": [
                {
                    "checkpointId": 1,
                    "isCompleted": true,
                    "attemptCount": 2,
                    "completedAt": "2025-12-07T18:30:00"
                },
                ...
            ]
        }

    Status Codes:
        200: Success
        400: Missing userId parameter
        404: Video not found
        500: Server error
    """
    from models import UserCheckpointCompletion, Checkpoint, Video, User

    user_id = request.args.get('userId')
    if not user_id:
        return jsonify({'error': 'Missing required parameter: userId'}), 400

    try:
        user_id = int(user_id)
    except ValueError:
        return jsonify({'error': 'Invalid userId parameter'}), 400

    db = SessionLocal()
    try:
        # Verify video exists
        video = db.query(Video).filter_by(id=video_id).first()
        if not video:
            return jsonify({'error': 'Video not found'}), 404

        # Get all checkpoints for this video
        checkpoints = db.query(Checkpoint).filter_by(video_id=video_id).all()
        total_checkpoints = len(checkpoints)

        if total_checkpoints == 0:
            return jsonify({
                'videoId': video_id,
                'totalCheckpoints': 0,
                'completedCheckpoints': 0,
                'progressPercentage': 0,
                'completions': []
            }), 200

        # Get completion records for this user
        completions = db.query(UserCheckpointCompletion).filter(
            UserCheckpointCompletion.user_id == user_id,
            UserCheckpointCompletion.checkpoint_id.in_([c.id for c in checkpoints])
        ).all()

        # Build completion map
        completion_map = {c.checkpoint_id: c for c in completions}

        # Count completed checkpoints
        completed_count = sum(1 for c in completions if c.is_completed)
        progress_percentage = (completed_count / total_checkpoints * 100) if total_checkpoints > 0 else 0

        # Build response
        completion_data = []
        for checkpoint in checkpoints:
            completion = completion_map.get(checkpoint.id)
            completion_data.append({
                'checkpointId': checkpoint.id,
                'isCompleted': completion.is_completed if completion else False,
                'attemptCount': completion.attempt_count if completion else 0,
                'completedAt': completion.completed_at.isoformat() if completion and completion.completed_at else None
            })

        return jsonify({
            'videoId': video_id,
            'totalCheckpoints': total_checkpoints,
            'completedCheckpoints': completed_count,
            'progressPercentage': round(progress_percentage, 1),
            'completions': completion_data
        }), 200

    except Exception as e:
        print(f"Error getting checkpoint progress: {e}")
        traceback.print_exc()
        return jsonify({'error': 'Failed to get checkpoint progress'}), 500
    finally:
        db.close()
