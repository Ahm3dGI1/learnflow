"""
API routes for User management.

Routes:
- POST /api/users: create or update a user using Firebase token claims
- GET /api/users/<firebase_uid>: fetch user by Firebase UID
"""

from flask import Blueprint, jsonify, g, request
from database import SessionLocal
from services.user_service import get_or_create_user, get_user_by_firebase_uid
from middleware.auth import auth_required

user_bp = Blueprint("user", __name__, url_prefix="/api/users")


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
        except Exception as e:
            return jsonify({"error": "Failed to create/update user", "details": str(e)}), 500


@user_bp.route("/<firebase_uid>", methods=["GET"])
def get_user(firebase_uid):
    """
    GET /api/users/<firebase_uid>
    Retrieve a user record by Firebase UID.

    Args:
        firebase_uid (str): Firebase UID of the user to retrieve (URL path param).

    Returns:
        (json, 200): On success, returns the user `data`.
        (json, 404): If user not found.
        (json, 500): On server errors.

    Raises:
        ValueError: If firebase_uid is falsy (returns 400 if you wish to enforce).
    """
    if not firebase_uid:
        return jsonify({"error": "firebase_uid is required"}), 400

    with SessionLocal() as db:
        try:
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
        except Exception as e:
            return jsonify({"error": "Failed to fetch user", "details": str(e)}), 500