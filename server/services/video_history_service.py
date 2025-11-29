"""
Video history service for managing user video watch history.

This module provides functions for CRUD operations on the VideoHistory model:
- get_user_video_history: Get all history entries for a user
- add_to_history: Add or update a video in user's history
- remove_from_history: Remove a specific history entry
- clear_history: Clear all history for a user
"""

from datetime import datetime
from models import VideoHistory, User


def get_user_video_history(user_id: int, db, limit: int = 50):
    """
    Retrieve all video history entries for a user, ordered by last_viewed_at (most recent first).

    Args:
        user_id (int): User ID to get history for.
        db (Session): SQLAlchemy DB session.
        limit (int): Maximum number of entries to return (default: 50).

    Returns:
        list[VideoHistory]: List of VideoHistory model instances.
    """
    return (
        db.query(VideoHistory)
        .filter(VideoHistory.user_id == user_id)
        .order_by(VideoHistory.last_viewed_at.desc())
        .limit(limit)
        .all()
    )


def add_to_history(
    user_id: int,
    video_id: str,
    embed_url: str,
    title: str,
    thumbnail: str,
    db,
):
    """
    Add a video to user's history or update existing entry.

    If the video already exists in the user's history, updates the last_viewed_at
    timestamp. Otherwise, creates a new history entry.

    Args:
        user_id (int): User ID.
        video_id (str): YouTube video ID.
        embed_url (str): YouTube embed URL.
        title (str): Video title.
        thumbnail (str): Thumbnail URL.
        db (Session): SQLAlchemy DB session.

    Returns:
        VideoHistory: The VideoHistory model instance (new or updated).
    """
    # Check if entry already exists
    existing = (
        db.query(VideoHistory)
        .filter(
            VideoHistory.user_id == user_id,
            VideoHistory.video_id == video_id,
        )
        .first()
    )

    if existing:
        # Update last_viewed_at timestamp
        existing.last_viewed_at = datetime.utcnow()
        # Update title and thumbnail in case they changed
        existing.title = title
        existing.thumbnail = thumbnail
        existing.embed_url = embed_url
        db.commit()
        db.refresh(existing)
        return existing

    # Create new entry
    new_entry = VideoHistory(
        user_id=user_id,
        video_id=video_id,
        embed_url=embed_url,
        title=title,
        thumbnail=thumbnail,
        added_at=datetime.utcnow(),
        last_viewed_at=datetime.utcnow(),
    )
    db.add(new_entry)
    db.commit()
    db.refresh(new_entry)
    return new_entry


def remove_from_history(entry_id: int, user_id: int, db):
    """
    Remove a specific history entry by ID.

    Args:
        entry_id (int): History entry ID to remove.
        user_id (int): User ID (for authorization check).
        db (Session): SQLAlchemy DB session.

    Returns:
        bool: True if entry was found and deleted, False otherwise.
    """
    entry = (
        db.query(VideoHistory)
        .filter(
            VideoHistory.id == entry_id,
            VideoHistory.user_id == user_id,
        )
        .first()
    )

    if entry:
        db.delete(entry)
        db.commit()
        return True
    return False


def clear_history(user_id: int, db):
    """
    Clear all video history entries for a user.

    Args:
        user_id (int): User ID.
        db (Session): SQLAlchemy DB session.

    Returns:
        int: Number of entries deleted.
    """
    count = (
        db.query(VideoHistory)
        .filter(VideoHistory.user_id == user_id)
        .delete()
    )
    db.commit()
    return count


def get_user_by_id(user_id: int, db):
    """
    Helper function to get user by ID.

    Args:
        user_id (int): User ID.
        db (Session): SQLAlchemy DB session.

    Returns:
        User | None: User model instance if found, None otherwise.
    """
    return db.query(User).filter(User.id == user_id).first()

