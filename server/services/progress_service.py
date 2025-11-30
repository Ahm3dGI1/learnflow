"""
Video progress tracking service for LearnFlow.
Handles business logic for tracking user video watch progress and completion status.
"""

from datetime import datetime
from sqlalchemy.exc import IntegrityError
from models import UserVideoProgress, User, Video


def get_or_create_progress(user_id, video_id, db):
    """
    Get existing progress record or create a new one.

    Args:
        user_id (int): User database ID
        video_id (int): Video database ID
        db: Database session

    Returns:
        tuple: (UserVideoProgress, Video) - Progress record and associated video

    Raises:
        ValueError: If user or video doesn't exist
    """
    # Check if user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise ValueError(f"User with id {user_id} not found")

    # Check if video exists
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise ValueError(f"Video with id {video_id} not found")

    # Get or create progress record
    progress = db.query(UserVideoProgress).filter(
        UserVideoProgress.user_id == user_id,
        UserVideoProgress.video_id == video_id
    ).first()

    if not progress:
        progress = UserVideoProgress(
            user_id=user_id,
            video_id=video_id,
            last_position_seconds=0,
            is_completed=False,
            watch_count=1,
            first_watched_at=datetime.utcnow(),
            last_watched_at=datetime.utcnow()
        )
        db.add(progress)
        db.commit()
        db.refresh(progress)

    return progress, video


def update_progress(user_id, video_id, position_seconds, db):
    """
    Update user's progress for a video.

    Args:
        user_id (int): User database ID
        video_id (int): Video database ID
        position_seconds (int): Current playback position in seconds
        db: Database session

    Returns:
        dict: Updated progress data
            {
                "userId": 1,
                "videoId": 2,
                "lastPositionSeconds": 123,
                "isCompleted": False,
                "watchCount": 1,
                "lastWatchedAt": "2025-01-20T10:30:00Z"
            }

    Raises:
        ValueError: If user or video doesn't exist, or position is invalid
    """
    # Validate position
    if position_seconds < 0:
        raise ValueError("Position cannot be negative")

    # Get or create progress (also returns video to avoid redundant fetch)
    progress, video = get_or_create_progress(user_id, video_id, db)

    # Get video duration for completion check
    video_duration = video.duration_seconds if video else 0

    # Update progress
    progress.last_position_seconds = position_seconds
    progress.last_watched_at = datetime.utcnow()

    # Auto-complete if watched 95% or more
    if video_duration > 0 and position_seconds >= video_duration * 0.95:
        progress.is_completed = True

    db.commit()
    db.refresh(progress)

    return {
        'userId': progress.user_id,
        'videoId': progress.video_id,
        'lastPositionSeconds': progress.last_position_seconds,
        'isCompleted': progress.is_completed,
        'watchCount': progress.watch_count,
        'lastWatchedAt': progress.last_watched_at.isoformat() if progress.last_watched_at else None
    }


def mark_complete(user_id, video_id, db):
    """
    Mark a video as completed for a user.

    Args:
        user_id (int): User database ID
        video_id (int): Video database ID
        db: Database session

    Returns:
        dict: Updated progress data with is_completed=True

    Raises:
        ValueError: If user or video doesn't exist
    """
    # Get or create progress (video not needed here, but returned to maintain consistency)
    progress, _ = get_or_create_progress(user_id, video_id, db)

    # Mark as complete
    progress.is_completed = True
    progress.last_watched_at = datetime.utcnow()

    db.commit()
    db.refresh(progress)

    return {
        'userId': progress.user_id,
        'videoId': progress.video_id,
        'lastPositionSeconds': progress.last_position_seconds,
        'isCompleted': progress.is_completed,
        'watchCount': progress.watch_count,
        'lastWatchedAt': progress.last_watched_at.isoformat() if progress.last_watched_at else None
    }


def get_user_progress(user_id, db):
    """
    Get all progress records for a user.

    Args:
        user_id (int): User database ID
        db: Database session

    Returns:
        list: List of progress records with video details
            [
                {
                    "videoId": 2,
                    "youtubeVideoId": "abc123",
                    "lastPositionSeconds": 123,
                    "isCompleted": False,
                    "watchCount": 1,
                    "progressPercentage": 45.5,
                    "lastWatchedAt": "2025-01-20T10:30:00Z"
                },
                ...
            ]

    Raises:
        ValueError: If user doesn't exist
    """
    # Check if user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise ValueError(f"User with id {user_id} not found")

    # Get all progress records for user
    progress_records = db.query(UserVideoProgress).filter(
        UserVideoProgress.user_id == user_id
    ).all()

    # Format response with video details
    result = []
    for progress in progress_records:
        video = db.query(Video).filter(Video.id == progress.video_id).first()

        # Calculate progress percentage
        progress_percentage = 0.0
        if video and video.duration_seconds > 0:
            progress_percentage = min(
                (progress.last_position_seconds / video.duration_seconds) * 100,
                100.0
            )

        result.append({
            'videoId': progress.video_id,
            'youtubeVideoId': video.youtube_video_id if video else None,
            'lastPositionSeconds': progress.last_position_seconds,
            'isCompleted': progress.is_completed,
            'watchCount': progress.watch_count,
            'progressPercentage': round(progress_percentage, 1),
            'lastWatchedAt': progress.last_watched_at.isoformat() if progress.last_watched_at else None
        })

    return result


def get_video_progress(user_id, video_id, db):
    """
    Get progress for a specific video and user.

    Args:
        user_id (int): User database ID
        video_id (int): Video database ID
        db: Database session

    Returns:
        dict or None: Progress data or None if no progress exists
            {
                "videoId": 2,
                "lastPositionSeconds": 123,
                "isCompleted": False,
                "watchCount": 1,
                "progressPercentage": 45.5,
                "lastWatchedAt": "2025-01-20T10:30:00Z"
            }
    """
    # Get progress record
    progress = db.query(UserVideoProgress).filter(
        UserVideoProgress.user_id == user_id,
        UserVideoProgress.video_id == video_id
    ).first()

    if not progress:
        return None

    # Get video for duration
    video = db.query(Video).filter(Video.id == video_id).first()

    # Calculate progress percentage
    progress_percentage = 0.0
    if video and video.duration_seconds > 0:
        progress_percentage = min(
            (progress.last_position_seconds / video.duration_seconds) * 100,
            100.0
        )

    return {
        'videoId': progress.video_id,
        'lastPositionSeconds': progress.last_position_seconds,
        'isCompleted': progress.is_completed,
        'watchCount': progress.watch_count,
        'progressPercentage': round(progress_percentage, 1),
        'lastWatchedAt': progress.last_watched_at.isoformat() if progress.last_watched_at else None
    }
