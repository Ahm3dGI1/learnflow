"""
User service helpers that operate against the database.

This module provides functions for CRUD-ish operations on the `User` model:
- `get_user_by_firebase_uid`: lookup user
- `get_or_create_user`: get or create a user given firebase claim data
"""

from datetime import datetime
from sqlalchemy.exc import IntegrityError
from models import User


def get_user_by_firebase_uid(firebase_uid: str, db):
    """
    Retrieve a User model instance by the provided Firebase UID.

    Args:
        firebase_uid (str): Firebase UID to search for.
        db (Session): SQLAlchemy DB session.

    Returns:
        User | None: User model instance if found; otherwise None.

    Raises:
        ValueError: If firebase_uid is falsy.
    """
    if not firebase_uid:
        raise ValueError("firebase_uid is required")

    return db.query(User).filter(User.firebase_uid == firebase_uid).first()


def get_or_create_user(firebase_uid: str, email: str, display_name: str, db):
    """
    Return a user matching the provided Firebase UID, creating it if necessary.

    If a user already exists, it updates `email` and `display_name` if they've
    changed and persists the updated record. The function expects a DB session
    managed by the caller.

    Args:
        firebase_uid (str): Firebase UID claim (must be present).
        email (str): User email (from Firebase claims).
        display_name (str): Display name / name for the user (from Firebase claims).
        db (Session): SQLAlchemy DB session (open/managed by the caller).

    Returns:
        User: SQLAlchemy User instance (newly created or existing).

    Raises:
        ValueError: If `firebase_uid` is missing.
        sqlalchemy.exc.IntegrityError: If a database integrity error occurs while creating the user.
    """
    if not firebase_uid:
        raise ValueError("firebase_uid is required")

    # Query for existing user
    user = get_user_by_firebase_uid(firebase_uid, db)
    if user:
        updated = False
        if email and user.email != email:
            user.email = email
            updated = True
        if display_name and user.display_name != display_name:
            user.display_name = display_name
            updated = True

        if updated:
            user.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(user)

        return user

    # Create new user record
    user = User(firebase_uid=firebase_uid, email=email, display_name=display_name)
    try:
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    except IntegrityError:
        db.rollback()
        # Race condition fallback: re-query for created user
        user = get_user_by_firebase_uid(firebase_uid, db)
        if not user:
            raise
        return user