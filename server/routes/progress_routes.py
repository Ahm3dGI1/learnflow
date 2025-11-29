"""
Progress tracking API routes for LearnFlow.

Handles HTTP endpoints for video watch progress, completion status,
and resume functionality. All routes require authentication and use
user database IDs from the auth middleware.

All routes are prefixed with /api/progress.
"""

from flask import Blueprint, request, jsonify
from database import SessionLocal
from services import update_progress, mark_complete, get_user_progress, get_video_progress
from middleware.auth import auth_required


progress_bp = Blueprint('progress', __name__, url_prefix='/api/progress')


@progress_bp.route('/users/<int:user_id>/videos/<int:video_id>', methods=['GET'])
@auth_required
def get_progress(user_id, video_id):
    """
    Get progress for a specific video and user.

    URL Parameters:
        user_id (int): User database ID
        video_id (int): Video database ID

    Returns:
        {
            "videoId": 2,
            "lastPositionSeconds": 123,
            "isCompleted": false,
            "watchCount": 1,
            "progressPercentage": 45.5,
            "lastWatchedAt": "2025-01-20T10:30:00Z"
        }

    Status Codes:
        200: Success (returns progress or null if no progress exists)
        500: Internal server error
    """
    db = SessionLocal()
    try:
        progress = get_video_progress(user_id, video_id, db)
        return jsonify(progress), 200

    except Exception as e:
        return jsonify({
            'error': 'Failed to get progress',
            'details': str(e)
        }), 500
    finally:
        db.close()


@progress_bp.route('/users/<int:user_id>/videos/<int:video_id>', methods=['POST'])
@auth_required
def update_progress_route(user_id, video_id):
    """
    Update user's progress for a video.

    URL Parameters:
        user_id (int): User database ID
        video_id (int): Video database ID

    Request Body:
        {
            "positionSeconds": 123
        }

    Returns:
        {
            "userId": 1,
            "videoId": 2,
            "lastPositionSeconds": 123,
            "isCompleted": false,
            "watchCount": 1,
            "lastWatchedAt": "2025-01-20T10:30:00Z"
        }

    Status Codes:
        200: Success
        400: Invalid request data
        500: Internal server error
    """
    db = SessionLocal()
    try:
        data = request.get_json()

        if not data:
            return jsonify({'error': 'No data provided'}), 400

        position_seconds = data.get('positionSeconds')

        # Validation
        if position_seconds is None:
            return jsonify({'error': 'positionSeconds is required'}), 400

        if not isinstance(position_seconds, (int, float)) or position_seconds < 0:
            return jsonify({'error': 'positionSeconds must be a non-negative number'}), 400

        # Convert to int
        position_seconds = int(position_seconds)

        # Update progress
        progress = update_progress(user_id, video_id, position_seconds, db)

        return jsonify(progress), 200

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({
            'error': 'Failed to update progress',
            'details': str(e)
        }), 500
    finally:
        db.close()


@progress_bp.route('/users/<int:user_id>/videos/<int:video_id>/complete', methods=['PUT'])
@auth_required
def mark_complete_route(user_id, video_id):
    """
    Mark a video as completed for a user.

    URL Parameters:
        user_id (int): User database ID
        video_id (int): Video database ID

    Returns:
        {
            "userId": 1,
            "videoId": 2,
            "lastPositionSeconds": 360,
            "isCompleted": true,
            "watchCount": 1,
            "lastWatchedAt": "2025-01-20T10:30:00Z"
        }

    Status Codes:
        200: Success
        500: Internal server error
    """
    db = SessionLocal()
    try:
        progress = mark_complete(user_id, video_id, db)
        return jsonify(progress), 200

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({
            'error': 'Failed to mark as complete',
            'details': str(e)
        }), 500
    finally:
        db.close()


@progress_bp.route('/users/<int:user_id>', methods=['GET'])
@auth_required
def get_all_progress(user_id):
    """
    Get all progress records for a user.

    URL Parameters:
        user_id (int): User database ID

    Returns:
        {
            "userId": 1,
            "progress": [
                {
                    "videoId": 2,
                    "youtubeVideoId": "abc123",
                    "lastPositionSeconds": 123,
                    "isCompleted": false,
                    "watchCount": 1,
                    "progressPercentage": 45.5,
                    "lastWatchedAt": "2025-01-20T10:30:00Z"
                },
                ...
            ],
            "totalVideos": 5
        }

    Status Codes:
        200: Success
        500: Internal server error
    """
    db = SessionLocal()
    try:
        progress_list = get_user_progress(user_id, db)

        return jsonify({
            'userId': user_id,
            'progress': progress_list,
            'totalVideos': len(progress_list)
        }), 200

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({
            'error': 'Failed to get user progress',
            'details': str(e)
        }), 500
    finally:
        db.close()
