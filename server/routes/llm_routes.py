"""
LLM-related API routes for LearnFlow.
Handles endpoints for checkpoint generation, chat, and other AI features.
"""

from flask import Blueprint, request, jsonify
import time
from services import generate_checkpoints


# Blueprint for LLM routes
llm_bp = Blueprint('llm', __name__, url_prefix='/api/llm')

# Simple in-memory cache for checkpoints
checkpoint_cache = {}
CACHE_TTL = 3600  # 1 hour in seconds


def get_cached_checkpoints(video_id, language):
    """
    Retrieve cached checkpoints if available and not expired.

    Args:
        video_id (str): YouTube video ID
        language (str): Language code

    Returns:
        dict or None: Cached checkpoint data or None if not found/expired
    """
    cache_key = f"{video_id}:{language}"
    cached = checkpoint_cache.get(cache_key)

    if cached:
        # Check if cache is still valid
        if time.time() - cached['timestamp'] < CACHE_TTL:
            return cached['data']
        else:
            # Remove expired cache
            del checkpoint_cache[cache_key]

    return None


def cache_checkpoints(video_id, language, checkpoints):
    """
    Cache checkpoint data.

    Args:
        video_id (str): YouTube video ID
        language (str): Language code
        checkpoints (dict): Checkpoint data to cache
    """
    cache_key = f"{video_id}:{language}"
    checkpoint_cache[cache_key] = {
        'data': checkpoints,
        'timestamp': time.time()
    }


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

        # Check cache first
        cached_data = get_cached_checkpoints(video_id, language_code)
        if cached_data:
            response = cached_data.copy()
            response['cached'] = True
            return jsonify(response), 200

        # Generate checkpoints
        checkpoints = generate_checkpoints(transcript_data, video_id)

        # Cache the result
        cache_checkpoints(video_id, language_code, checkpoints)

        # Add cached flag
        response = checkpoints.copy()
        response['cached'] = False

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
    cleared_count = len(checkpoint_cache)
    checkpoint_cache.clear()
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
        'cacheSize': len(checkpoint_cache)
    }), 200
