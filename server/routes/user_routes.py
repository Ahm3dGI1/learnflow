"""
API routes for User management.

Routes:
- POST /api/users: create or update a user using Firebase token claims
- GET /api/users/<firebase_uid>: fetch user by Firebase UID
"""

from flask import Blueprint, jsonify, g, request
from database import SessionLocal
from services.user_service import get_or_create_user, get_user_by_firebase_uid
from services.video_history_service import (
    get_user_video_history,
    add_to_history,
    remove_from_history,
    clear_history,
    get_user_by_id,
)
from middleware.auth import auth_required

user_bp = Blueprint("user", __name__, url_prefix="/api/users")

@user_bp.route("/me", methods=["GET"])
@auth_required
def get_current_user():
    claims = getattr(g, "firebase_user", {})
    firebase_uid = claims.get("uid")
    with SessionLocal() as db:
        user = get_user_by_firebase_uid(firebase_uid, db)
        if not user:
            return jsonify({"error": "User not found"}), 404
        return jsonify({
            "data": {
                "id": user.id,
                "firebaseUid": user.firebase_uid,
                "email": user.email,
                "displayName": user.display_name,
                "createdAt": user.created_at.isoformat(),
                "updatedAt": user.updated_at.isoformat() if user.updated_at else None,
            }
        }), 200

@user_bp.route("", methods=["POST"])
@auth_required
def create_or_update_user():
    """
    POST /api/users
    Create or update a user record based on the authenticated Firebase claims.

    Expects:
        Authorization: Bearer <firebase-id-token>

    Behavior:
        - Reads Firebase token claims attached by the `auth_required` decorator
          from `flask.g.firebase_user`.
        - Uses `services.user_service.get_or_create_user` to create or update
          the user in the database.
        - Returns a JSON object with user `data`.

    Returns:
        (json, 200): On success, returns the user `data`.
        (json, 401): If token is missing / unauthorized (handled by decorator).
        (json, 500): On server errors.

    Raises:
        None directly; underlying DB exceptions can be propagated and will
        return a 500 to the client with the error message in the `details` field.
    """
    claims = getattr(g, "firebase_user", {})
    firebase_uid = claims.get("uid")
    email = claims.get("email")
    display_name = claims.get("name") or claims.get("displayName")

    body = request.get_json(silent=True) or {}

    with SessionLocal() as db:
        try:
            user = get_or_create_user(firebase_uid, email, display_name, db)
            return jsonify({
                "data": {
                    "id": user.id,
                    "firebaseUid": user.firebase_uid,
                    "email": user.email,
                    "displayName": user.display_name,
                    "createdAt": user.created_at.isoformat(),
                    "updatedAt": user.updated_at.isoformat() if user.updated_at else None,
                }
            }), 200
        except ValueError as e:
            return jsonify({"error": str(e)}), 400
        except Exception as e:
            return jsonify({"error": "Failed to create/update user", "details": str(e)}), 500


@user_bp.route("/<int:user_id>/video-history", methods=["GET"])
@auth_required
def get_video_history(user_id):
    """
    GET /api/users/<user_id>/video-history
    Get video history for a user.

    Expects:
        Authorization: Bearer <firebase-id-token>

    Returns:
        (json, 200): List of video history entries.
        (json, 403): If user_id doesn't match authenticated user.
        (json, 404): If user not found.
    """
    claims = getattr(g, "firebase_user", {})
    firebase_uid = claims.get("uid")

    with SessionLocal() as db:
        # Verify user exists and matches authenticated user
        user = get_user_by_firebase_uid(firebase_uid, db)
        if not user:
            return jsonify({"error": "User not found"}), 404

        if user.id != user_id:
            return jsonify({"error": "Forbidden: Cannot access another user's history"}), 403

        history = get_user_video_history(user_id, db)
        return jsonify({
            "data": [
                {
                    "id": entry.id,
                    "videoId": entry.video_id,
                    "embedUrl": entry.embed_url,
                    "title": entry.title,
                    "thumbnail": entry.thumbnail,
                    "addedAt": entry.added_at.isoformat(),
                    "lastViewedAt": entry.last_viewed_at.isoformat(),
                }
                for entry in history
            ]
        }), 200


@user_bp.route("/<int:user_id>/video-history", methods=["POST"])
@auth_required
def add_video_to_history(user_id):
    """
    POST /api/users/<user_id>/video-history
    Add a video to user's history.

    Expects:
        Authorization: Bearer <firebase-id-token>
        Body: {
            "videoId": string,
            "embedUrl": string,
            "title": string,
            "thumbnail": string (optional)
        }

    Returns:
        (json, 200): Created/updated history entry.
        (json, 400): If required fields are missing.
        (json, 403): If user_id doesn't match authenticated user.
        (json, 404): If user not found.
    """
    claims = getattr(g, "firebase_user", {})
    firebase_uid = claims.get("uid")

    with SessionLocal() as db:
        # Verify user exists and matches authenticated user
        user = get_user_by_firebase_uid(firebase_uid, db)
        if not user:
            return jsonify({"error": "User not found"}), 404

        if user.id != user_id:
            return jsonify({"error": "Forbidden: Cannot modify another user's history"}), 403

        body = request.get_json(silent=True) or {}
        video_id = body.get("videoId")
        embed_url = body.get("embedUrl")
        title = body.get("title", "Untitled Video")
        thumbnail = body.get("thumbnail")

        if not video_id or not embed_url:
            return jsonify({"error": "videoId and embedUrl are required"}), 400

        # Generate thumbnail if not provided
        if not thumbnail:
            thumbnail = f"https://img.youtube.com/vi/{video_id}/mqdefault.jpg"

        try:
            entry = add_to_history(user_id, video_id, embed_url, title, thumbnail, db)
            return jsonify({
                "data": {
                    "id": entry.id,
                    "videoId": entry.video_id,
                    "embedUrl": entry.embed_url,
                    "title": entry.title,
                    "thumbnail": entry.thumbnail,
                    "addedAt": entry.added_at.isoformat(),
                    "lastViewedAt": entry.last_viewed_at.isoformat(),
                }
            }), 200
        except Exception as e:
            return jsonify({"error": "Failed to add video to history", "details": str(e)}), 500


@user_bp.route("/<int:user_id>/video-history/<int:entry_id>", methods=["DELETE"])
@auth_required
def remove_video_from_history(user_id, entry_id):
    """
    DELETE /api/users/<user_id>/video-history/<entry_id>
    Remove a specific video from user's history.

    Expects:
        Authorization: Bearer <firebase-id-token>

    Returns:
        (json, 200): Success message.
        (json, 403): If user_id doesn't match authenticated user.
        (json, 404): If user or entry not found.
    """
    claims = getattr(g, "firebase_user", {})
    firebase_uid = claims.get("uid")

    with SessionLocal() as db:
        # Verify user exists and matches authenticated user
        user = get_user_by_firebase_uid(firebase_uid, db)
        if not user:
            return jsonify({"error": "User not found"}), 404

        if user.id != user_id:
            return jsonify({"error": "Forbidden: Cannot modify another user's history"}), 403

        success = remove_from_history(entry_id, user_id, db)
        if not success:
            return jsonify({"error": "History entry not found"}), 404

        return jsonify({"message": "Video removed from history"}), 200


@user_bp.route("/<int:user_id>/video-history", methods=["DELETE"])
@auth_required
def clear_video_history(user_id):
    """
    DELETE /api/users/<user_id>/video-history
    Clear all video history for a user.

    Expects:
        Authorization: Bearer <firebase-id-token>

    Returns:
        (json, 200): Success message with count of deleted entries.
        (json, 403): If user_id doesn't match authenticated user.
        (json, 404): If user not found.
    """
    claims = getattr(g, "firebase_user", {})
    firebase_uid = claims.get("uid")

    with SessionLocal() as db:
        # Verify user exists and matches authenticated user
        user = get_user_by_firebase_uid(firebase_uid, db)
        if not user:
            return jsonify({"error": "User not found"}), 404

        if user.id != user_id:
            return jsonify({"error": "Forbidden: Cannot modify another user's history"}), 403

        count = clear_history(user_id, db)
        return jsonify({
            "message": "Video history cleared",
            "deletedCount": count,
        }), 200
