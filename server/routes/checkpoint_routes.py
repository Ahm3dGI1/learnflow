"""
Checkpoint generation and management routes for LearnFlow.
Handles checkpoint generation, caching, and health check endpoints.
"""

from flask import Blueprint, request, jsonify
from services import generate_checkpoints
from utils import checkpoint_cache
from utils.logger import get_logger
from utils.exceptions import (
    MissingParameterError,
    ValidationError,
    CheckpointGenerationError,
)
from middleware.rate_limit import rate_limit
from .db_helpers import (
    get_cached_checkpoints_from_db,
    save_checkpoints_to_db
)

# Configure logging
logger = get_logger(__name__)

# Blueprint for checkpoint routes
checkpoint_bp = Blueprint('checkpoints', __name__, url_prefix='/api/llm')


@checkpoint_bp.route('/checkpoints/generate', methods=['POST'])
@rate_limit(max_requests=5, window_seconds=3600, scope='video')
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
            raise ValidationError("No data provided")

        video_id = data.get('videoId')
        transcript_data = data.get('transcript')

        # Validation
        if not video_id:
            raise MissingParameterError('videoId')

        if not transcript_data:
            raise MissingParameterError('transcript')

        if not transcript_data.get('snippets'):
            raise ValidationError('transcript.snippets is required')

        language_code = transcript_data.get('languageCode', 'en')
        logger.info(
            "Generating checkpoints",
            extra={"video_id": video_id, "language": language_code}
        )

        # Check cache first (memory)
        cache_key = f"{video_id}:{language_code}"
        cached_data = checkpoint_cache.get(cache_key)
        if cached_data:
            logger.info("Checkpoints served from memory cache", extra={"video_id": video_id})
            response = cached_data.copy()
            response['cached'] = True
            response['source'] = 'memory'
            return jsonify(response), 200

        # Check database cache
        db_checkpoints = get_cached_checkpoints_from_db(video_id)
        if db_checkpoints:
            logger.info("Checkpoints served from database", extra={"video_id": video_id})
            # Cache in memory for faster subsequent access
            checkpoint_cache.set(cache_key, db_checkpoints)
            response = db_checkpoints.copy()
            response['cached'] = True
            response['source'] = 'database'
            return jsonify(response), 200

        # Generate checkpoints
        logger.info("Generating new checkpoints via LLM", extra={"video_id": video_id})
        checkpoints = generate_checkpoints(transcript_data, video_id)

        # Save to database and get updated data with IDs
        checkpoints_with_ids = save_checkpoints_to_db(video_id, checkpoints)

        # Use the version with IDs if available, otherwise use original
        final_checkpoints = checkpoints_with_ids if checkpoints_with_ids else checkpoints

        # Cache the result with IDs in memory
        checkpoint_cache.set(cache_key, final_checkpoints)

        logger.info(
            "Checkpoints generated successfully",
            extra={
                "video_id": video_id,
                "checkpoint_count": len(final_checkpoints.get('checkpoints', []))
            }
        )

        # Add cached flag
        response = final_checkpoints.copy()
        response['cached'] = False
        response['source'] = 'generated'

        return jsonify(response), 200

    except ValueError as e:
        # ValueError messages are safe to expose (validation errors only)
        logger.warning(
            f"Validation error: {str(e)}",
            extra={"video_id": video_id if 'video_id' in locals() else None}
        )
        raise ValidationError(str(e))
    except Exception as e:
        logger.error(
            f"Unexpected error generating checkpoints: {str(e)}",
            exc_info=True,
            extra={"video_id": video_id if 'video_id' in locals() else None}
        )
        raise CheckpointGenerationError(str(e))


@checkpoint_bp.route('/checkpoints/cache/clear', methods=['POST'])
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
