"""
Routes for user checkpoint completion tracking.

Endpoints:
 - POST /api/users/<user_id>/checkpoints/<checkpoint_id>/complete
 - GET  /api/users/<user_id>/videos/<video_id>/checkpoint-progress
"""
from flask import Blueprint, jsonify, request
from services.checkpoint_completion_service import (
    mark_checkpoint_complete,
    get_checkpoint_progress,
)

bp = Blueprint("checkpoint_routes", __name__, url_prefix="/api")


@bp.route('/users/<int:user_id>/checkpoints/<int:checkpoint_id>/complete', methods=['POST'])
def complete_checkpoint(user_id, checkpoint_id):
    """Mark checkpoint complete for a user."""
    try:
        uc = mark_checkpoint_complete(user_id, checkpoint_id)
        return jsonify({
            'success': True,
            'user_id': uc.user_id,
            'checkpoint_id': uc.checkpoint_id,
            'completed_at': uc.completed_at.isoformat() if uc.completed_at else None,
        }), 200
    except Exception as e:
        return jsonify({'error': 'Failed to mark completion', 'details': str(e)}), 500


@bp.route('/users/<int:user_id>/videos/<int:video_id>/checkpoint-progress', methods=['GET'])
def checkpoint_progress(user_id, video_id):
    """Get checkpoint progress summary for a user on a particular video."""
    try:
        progress = get_checkpoint_progress(user_id, video_id)
        return jsonify(progress), 200
    except Exception as e:
        return jsonify({'error': 'Failed to fetch progress', 'details': str(e)}), 500
