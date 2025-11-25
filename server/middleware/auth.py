"""
Authentication middleware for verifying Firebase ID tokens in incoming requests.

Provides an `auth_required` decorator that verifies a Bearer token in the
Authorization header, attaches the decoded claims to Flask's `g.firebase_user`,
and returns 401 if invalid or missing.
"""

from functools import wraps
from flask import request, jsonify, g
from firebase_admin_client import verify_id_token


def auth_required(f):
    """
    Decorator that enforces Firebase ID token verification on the wrapped view.

    The decorator expects an Authorization header in the request with the
    format: "Authorization: Bearer <id_token>". On success, it attaches the
    decoded token payload to `flask.g.firebase_user` for downstream use.

    Args:
        f (callable): Flask view function to wrap.

    Returns:
        callable: Wrapped view function.

    Raises:
        401 (flask.Response): If the Authorization header is missing or the token
            verification fails, returns an HTTP 401 response with error details.
    """
    @wraps(f)
    def wrapper(*args, **kwargs):
        header = request.headers.get('Authorization', '')
        if not header or not header.startswith('Bearer '):
            return jsonify({'error': 'Missing or invalid Authorization header'}), 401

        token = header.split('Bearer ', 1)[1].strip()
        try:
            claims = verify_id_token(token)
        except Exception as e:
            # Normalize to 401 for any token verification errors
            return jsonify({'error': 'Invalid token', 'details': str(e)}), 401

        # Attach claims to flask.g for downstream use
        g.firebase_user = claims
        return f(*args, **kwargs)

    return wrapper