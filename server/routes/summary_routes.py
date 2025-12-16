"""
Summary generation routes for LearnFlow.
Handles video summary generation and caching.
"""

from flask import Blueprint, request, jsonify
from services import generate_summary
from utils import summary_cache
from utils.logger import get_logger
from middleware.rate_limit import rate_limit

# Configure logging
logger = get_logger(__name__)

# Blueprint for summary routes
summary_bp = Blueprint('summary', __name__, url_prefix='/api/llm')


@summary_bp.route('/summary/generate', methods=['POST'])
@rate_limit(max_requests=5, window_seconds=3600, scope='video')
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


@summary_bp.route('/summary/cache/clear', methods=['POST'])
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
