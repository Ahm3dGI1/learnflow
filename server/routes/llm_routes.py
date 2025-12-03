"""
LLM-related API routes for LearnFlow.
Handles endpoints for checkpoint generation, chat, and other AI features.
"""

import json
import traceback
from flask import Blueprint, request, jsonify, Response
from database import SessionLocal
from services import (
    generate_checkpoints,
    generate_chat_response,
    generate_chat_response_stream,
    generate_quiz,
    get_video_by_youtube_id,
    cache_checkpoints
)
from utils import checkpoint_cache, quiz_cache


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
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({
            'error': 'Failed to generate checkpoints',
            'details': str(e)
        }), 500


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
        'quizCacheSize': quiz_cache.size()
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
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({
            'error': 'Failed to generate chat response',
            'details': str(e)
        }), 500


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
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({
            'error': 'Failed to generate streaming chat response',
            'details': str(e)
        }), 500


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
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({
            'error': 'Failed to generate quiz',
            'details': str(e)
        }), 500


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
