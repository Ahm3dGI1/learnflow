"""
Learning Report API routes for LearnFlow.

Handles HTTP endpoints for retrieving user learning statistics and reports.
All routes require authentication and use user database IDs from the auth middleware.

All routes are prefixed with /api/learning-report.
"""

from flask import Blueprint, jsonify, g
from database import SessionLocal
from services.learning_report_service import get_learning_report
from services.user_service import get_user_by_firebase_uid
from middleware.auth import auth_required
from utils.logger import get_logger
from utils.exceptions import UserNotFoundError

logger = get_logger(__name__)

learning_report_bp = Blueprint('learning_report', __name__, url_prefix='/api/learning-report')


@learning_report_bp.route('/users/<firebase_uid>', methods=['GET'])
@auth_required
def get_user_learning_report(firebase_uid):
    """
    Get comprehensive learning report for a user.

    URL Parameters:
        firebase_uid (str): Firebase user ID

    Returns:
        {
            "data": {
                "userId": 1,
                "totalVideosWatched": 5,
                "totalVideosCompleted": 3,
                "completionRate": 60.0,
                "totalWatchTime": 3600,
                "totalQuizAttempts": 12,
                "totalQuizzesTaken": 3,
                "averageQuizScore": 78.5,
                "highestQuizScore": 95.0,
                "lowestQuizScore": 65.0,
                "totalCheckpointsCompleted": 15,
                "recentActivity": [...],
                "learningStreak": 5,
                "lastActivityDate": "2025-01-20"
            }
        }

    Status Codes:
        200: Success
        403: Unauthorized (user trying to access another user's report)
        404: User not found
        500: Internal server error
    """
    # Authorization check: ensure authenticated user matches requested user
    if g.firebase_user.get('uid') != firebase_uid:
        logger.warning(
            "Unauthorized access attempt to learning report",
            extra={
                "requested_uid": firebase_uid,
                "user_uid": g.firebase_user.get('uid')
            }
        )
        return jsonify({
            'error': 'Unauthorized: Cannot access another user\'s report'
        }), 403

    db = SessionLocal()
    try:
        # Look up database user ID from Firebase UID
        user = get_user_by_firebase_uid(firebase_uid, db)
        if not user:
            logger.warning(
                "User not found when fetching learning report",
                extra={"firebase_uid": firebase_uid}
            )
            raise UserNotFoundError()

        # Get comprehensive learning report
        report = get_learning_report(user.id, db)

        logger.info(
            "Learning report retrieved successfully",
            extra={"user_id": user.id}
        )

        return jsonify({"data": report}), 200

    except UserNotFoundError:
        return jsonify({'error': 'User not found'}), 404
    except ValueError as e:
        logger.error(
            f"Validation error in learning report: {str(e)}",
            extra={"firebase_uid": firebase_uid},
            exc_info=True
        )
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(
            f"Error getting learning report for user {firebase_uid}: {str(e)}",
            exc_info=True
        )
        return jsonify({'error': 'Failed to get learning report'}), 500
    finally:
        db.close()
