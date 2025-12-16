"""
Checkpoint completion and progress tracking routes for LearnFlow.
Handles checkpoint completion marking and progress retrieval.
"""

import json
import traceback
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, g
from database import SessionLocal
from models import Checkpoint, UserCheckpointCompletion, User, Video
from middleware.auth import auth_required
from utils.logger import get_logger

# Configure logging
logger = get_logger(__name__)

# Blueprint for checkpoint progress routes
checkpoint_progress_bp = Blueprint('checkpoint_progress', __name__, url_prefix='/api/llm')


@checkpoint_progress_bp.route('/checkpoints/<int:checkpoint_id>/complete', methods=['POST'])
@auth_required
def mark_checkpoint_complete(checkpoint_id):
    """
    Mark a checkpoint as completed for a user.

    Requires authentication via Firebase ID token in Authorization header.
    User is determined from the auth token (not request body).
    Answer validation is performed server-side against stored checkpoint data.

    Request Body:
        {
            "selectedAnswer": "B"
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
        400: Invalid request data (missing selectedAnswer)
        401: Unauthorized (invalid/missing token)
        404: User or checkpoint not found
        500: Server error
    """
    data = request.get_json()

    # Validate required fields
    if 'selectedAnswer' not in data:
        return jsonify({'error': 'Missing required field: selectedAnswer'}), 400

    selected_answer = data['selectedAnswer']

    # Get authenticated user's Firebase UID from token
    firebase_uid = g.firebase_user.get('uid')

    db = SessionLocal()
    try:
        # Look up user by Firebase UID
        user = db.query(User).filter_by(firebase_uid=firebase_uid).first()
        if not user:
            return jsonify({'error': 'User not found'}), 404

        # Verify checkpoint exists
        checkpoint = db.query(Checkpoint).filter_by(id=checkpoint_id).first()
        if not checkpoint:
            return jsonify({'error': 'Checkpoint not found'}), 404

        # Parse checkpoint question data to validate answer server-side
        question_data = {}
        if checkpoint.question_data:
            try:
                question_data = json.loads(checkpoint.question_data)
            except json.JSONDecodeError:
                return jsonify({'error': 'Invalid checkpoint data'}), 500

        # Validate answer server-side - DO NOT trust client's isCorrect field
        correct_answer = question_data.get('correctAnswer')
        is_correct = (selected_answer == correct_answer) if correct_answer and selected_answer is not None else False

        # Check if completion record exists
        completion = db.query(UserCheckpointCompletion).filter_by(
            user_id=user.id,
            checkpoint_id=checkpoint_id
        ).first()

        if completion:
            # Update existing record
            completion.attempt_count += 1
            if is_correct and not completion.is_completed:
                completion.is_completed = True
                completion.completed_at = datetime.now(timezone.utc)
        else:
            # Create new completion record
            completion = UserCheckpointCompletion(
                user_id=user.id,
                checkpoint_id=checkpoint_id,
                is_completed=is_correct,
                completed_at=datetime.now(timezone.utc) if is_correct else None,
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


@checkpoint_progress_bp.route('/videos/<int:video_id>/checkpoint-progress', methods=['GET'])
@auth_required
def get_checkpoint_progress(video_id):
    """
    Get checkpoint completion progress for a user on a specific video.

    Requires authentication via Firebase ID token in Authorization header.
    User is determined from the auth token (no query parameters needed).

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
        401: Unauthorized (invalid/missing token)
        404: User or video not found
        500: Server error
    """
    # Get authenticated user's Firebase UID from token
    firebase_uid = g.firebase_user.get('uid')

    db = SessionLocal()
    try:
        # Look up user by Firebase UID
        user = db.query(User).filter_by(firebase_uid=firebase_uid).first()
        if not user:
            return jsonify({'error': 'User not found'}), 404

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
            UserCheckpointCompletion.user_id == user.id,
            UserCheckpointCompletion.checkpoint_id.in_([c.id for c in checkpoints])
        ).all()

        # Build completion map
        completion_map = {c.checkpoint_id: c for c in completions}

        # Count completed checkpoints
        completed_count = sum(1 for c in completions if c.is_completed)
        progress_percentage = (completed_count / total_checkpoints * 100)

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
        logger.error(f"Error reading checkpoints from database: {e}", exc_info=True)
        return jsonify({'error': 'Failed to get checkpoint progress'}), 500
    finally:
        db.close()
