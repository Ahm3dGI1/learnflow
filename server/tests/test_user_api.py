"""
Test suite for the User Management API.

Secure and minimal tests for:
- POST /api/users (create/update user from Firebase token claims)
- GET /api/users/<firebase_uid> (fetch user data)

This file uses:
- Flask test client (no external server required)
- unittest.mock.patch to mock Firebase token verification
- SQLAlchemy SessionLocal for direct DB checks and cleanup

How to run:
    cd server
    pytest -q server/tests/test_user_api.py

Notes:
- This test file DOES NOT require real Firebase service account credentials.
  It mocks `verify_id_token` to return decoded claims or raise an error.
- The tests create DB records and clean them up to avoid polluting the DB.
- If the blueprint or routes are not registered yet, the test will surface 404s.
"""

from unittest.mock import patch
import pytest
from datetime import datetime
from app import app
from database import SessionLocal
from models import User

# Patch target: the import location used by the auth middleware.
VERIFY_PATCH_PATH = "middleware.auth.verify_id_token"


@pytest.fixture
def client():
    """
    Provide a Flask test client for making API requests.
    """
    app.testing = True
    with app.test_client() as client:
        yield client


def _cleanup_user(firebase_uid):
    """
    Remove user records by firebase_uid from the DB, used for test cleanup.

    Args:
        firebase_uid (str): Firebase UID to remove.
    """
    with SessionLocal() as db:
        user = db.query(User).filter(User.firebase_uid == firebase_uid).first()
        if user:
            db.delete(user)
            db.commit()


def test_post_user_creates_user(client):
    """
    Test that POST /api/users creates a new user when presented with a valid token.

    Steps:
    - Mock `verify_id_token` to return claims with `uid`, `email`, and `name`.
    - Call POST /api/users with a fake Bearer token (string).
    - Assert 200 response and returned `firebaseUid`.
    - Verify the DB record exists and then cleanup.
    """
    firebase_uid = "test-uid-post-create"
    claims = {"uid": firebase_uid, "email": "create@example.com", "name": "Create Test"}

    # Ensure test DB is clean before starting
    _cleanup_user(firebase_uid)

    with patch(VERIFY_PATCH_PATH, return_value=claims):
        # We're not verifying a real token; the decorator will accept the patched value
        resp = client.post("/api/users", headers={"Authorization": "Bearer faketoken"})
    assert resp.status_code == 200, f"Expected 200 OK but got {resp.status_code}: {resp.get_data(as_text=True)}"
    data = resp.get_json()
    assert data is not None and "data" in data, "Response must contain 'data' key"
    assert data["data"]["firebaseUid"] == firebase_uid

    # Verify DB record created
    with SessionLocal() as db:
        user = db.query(User).filter(User.firebase_uid == firebase_uid).first()
        assert user is not None, "User not found in DB after POST /api/users"
        assert user.email == "create@example.com"
        assert user.display_name == "Create Test"

    # Cleanup
    _cleanup_user(firebase_uid)


def test_post_user_idempotent_updates(client):
    """
    Test that POST /api/users is idempotent and updates an existing user's displayName or email.

    Steps:
    - Create a user record in DB
    - Patch `verify_id_token` to provide claims with same uid but changed email / name
    - POST /api/users and assert the record is updated (email or displayName changed).
    """
    firebase_uid = "test-uid-post-update"
    initial_email = "initial@example.com"
    initial_name = "Initial Name"

    # Ensure clean DB and create initial record
    _cleanup_user(firebase_uid)
    with SessionLocal() as db:
        u = User(firebase_uid=firebase_uid, email=initial_email, display_name=initial_name)
        db.add(u)
        db.commit()

    # Mock claims that change the email and name
    new_email = "changed@example.com"
    new_name = "Changed Name"
    claims = {"uid": firebase_uid, "email": new_email, "name": new_name}

    with patch(VERIFY_PATCH_PATH, return_value=claims):
        resp = client.post("/api/users", headers={"Authorization": "Bearer faketoken"})
    assert resp.status_code == 200, f"Expected 200 OK but got {resp.status_code}: {resp.get_data(as_text=True)}"

    # Verify DB record has been updated
    with SessionLocal() as db:
        user = db.query(User).filter(User.firebase_uid == firebase_uid).first()
        assert user is not None
        assert user.email == new_email
        assert user.display_name == new_name

    # Cleanup
    _cleanup_user(firebase_uid)


def test_post_user_with_invalid_token_returns_401(client):
    """
    Test that POST /api/users returns 401 when token verification fails.

    Steps:
    - Patch `verify_id_token` to raise an Exception (simulating an invalid or expired token).
    - Call POST /api/users and assert 401 Unauthorized.
    """
    # Patch to raise an exception for invalid/expired token
    with patch(VERIFY_PATCH_PATH, side_effect=Exception("Invalid token")):
        resp = client.post("/api/users", headers={"Authorization": "Bearer badtoken"})
    assert resp.status_code == 401, f"Expected 401 Unauthorized but got {resp.status_code}"


def test_get_user_returns_user_data(client):
    """
    Test GET /api/users/<firebase_uid> returns the expected user data.

    Steps:
    - Insert a user record using SessionLocal for a unique `firebase_uid`.
    - Call GET /api/users/<firebase_uid>.
    - Assert 200 and expected fields in the response.
    - Cleanup DB.
    """
    firebase_uid = "test-uid-get"
    email = "get@example.com"
    name = "Get User"

    # Ensure clean DB and create user
    _cleanup_user(firebase_uid)
    with SessionLocal() as db:
        user = User(firebase_uid=firebase_uid, email=email, display_name=name)
        db.add(user)
        db.commit()

    claims = {"uid": firebase_uid, "email": email, "name": name}
    with patch(VERIFY_PATCH_PATH, return_value=claims):
        resp = client.get(f"/api/users/{firebase_uid}", headers={"Authorization": "Bearer faketoken"})
    assert resp.status_code == 200, f"Expected 200 OK but got {resp.status_code}"
    data = resp.get_json()
    assert data is not None and "data" in data
    assert data["data"]["firebaseUid"] == firebase_uid
    assert data["data"]["email"] == email
    assert data["data"]["displayName"] == name

    # Cleanup
    _cleanup_user(firebase_uid)


def test_get_user_forbidden_returns_403(client):
    """
    Test that GET /api/users/<firebase_uid> is forbidden when the caller does not match the requested user.
    """
    target_uid = "target-uid"
    other_uid = "other-uid"
    email = "target@example.com"

    _cleanup_user(target_uid)
    with SessionLocal() as db:
        user = User(firebase_uid=target_uid, email=email, display_name="Target")
        db.add(user)
        db.commit()

    claims = {"uid": other_uid, "email": "other@example.com", "name": "Other"}
    with patch(VERIFY_PATCH_PATH, return_value=claims):
        resp = client.get(f"/api/users/{target_uid}", headers={"Authorization": "Bearer faketoken"})
    assert resp.status_code == 403, f"Expected 403 Forbidden but got {resp.status_code}"

    _cleanup_user(target_uid)


def test_get_user_me_returns_user_data(client):
    """
    Test GET /api/users/me (auth_required) returns the current authenticated user.
    """
    firebase_uid = "test-uid-get-me"
    email = "getme@example.com"
    name = "Get Me"

    _cleanup_user(firebase_uid)
    with SessionLocal() as db:
        user = User(firebase_uid=firebase_uid, email=email, display_name=name)
        db.add(user)
        db.commit()

    claims = {"uid": firebase_uid, "email": email, "name": name}
    with patch(VERIFY_PATCH_PATH, return_value=claims):
        resp = client.get("/api/users/me", headers={"Authorization": "Bearer faketoken"})
    assert resp.status_code == 200, f"Expected 200 OK but got {resp.status_code}"
    data = resp.get_json()
    assert data is not None and "data" in data
    assert data["data"]["firebaseUid"] == firebase_uid

    _cleanup_user(firebase_uid)


def test_post_user_email_collision_returns_400(client):
    """
    When a new firebase UID attempts to create a user with an email already used by another account,
    the API should return 400 with a clear error message.
    """
    existing_uid = "existing-uid"
    existing_email = "shared@example.com"

    _cleanup_user(existing_uid)
    with SessionLocal() as db:
        user = User(firebase_uid=existing_uid, email=existing_email, display_name="Existing")
        db.add(user)
        db.commit()

    new_uid = "new-uid-same-email"
    claims = {"uid": new_uid, "email": existing_email, "name": "New User"}

    with patch(VERIFY_PATCH_PATH, return_value=claims):
        resp = client.post("/api/users", headers={"Authorization": "Bearer faketoken"})
    assert resp.status_code == 400
    data = resp.get_json()
    assert data and "error" in data

    # Cleanup
    _cleanup_user(existing_uid)
    _cleanup_user(new_uid)