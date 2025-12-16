"""
Video service for LearnFlow.
Handles video creation, caching, and metadata fetching.
"""

import json
import os
from datetime import datetime
from sqlalchemy.exc import IntegrityError

from models import Video, UserVideoProgress
from utils.logger import get_logger

logger = get_logger(__name__)


def get_or_create_video(youtube_video_id, db):
    """
    Get video from database or create new entry.

    Args:
        youtube_video_id: YouTube video ID
        db: Database session

    Returns:
        Video model instance

    Raises:
        ValueError: If video ID is empty
    """
    # Validate video ID format
    if (
        not youtube_video_id
        or not isinstance(youtube_video_id, str)
        or len(youtube_video_id) > 20
        or not youtube_video_id.replace('-', '').replace('_', '').isalnum()
    ):
        raise ValueError(f"Invalid YouTube video ID: {youtube_video_id}")

    # Try to get existing video
    video = db.query(Video).filter(
        Video.youtube_video_id == youtube_video_id
    ).first()

    if video:
        return video

    # Create new video entry with basic info
    video = Video(
        youtube_video_id=youtube_video_id,
        title=f"Video {youtube_video_id}",  # Placeholder until metadata is fetched
        duration_seconds=0,
        total_views=0,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )

    try:
        db.add(video)
        db.commit()
        db.refresh(video)
        return video
    except IntegrityError:
        # Handle race condition: another request created the video
        db.rollback()
        video = db.query(Video).filter(
            Video.youtube_video_id == youtube_video_id
        ).first()
        if not video:
            raise Exception("Failed to create or retrieve video")
        return video



def get_video_by_id(video_id, db):
    """
    Get video by database ID.

    Args:
        video_id: Database video ID (integer)
        db: Database session

    Returns:
        Video model instance or None
    """
    return db.query(Video).filter(Video.id == video_id).first()


def get_video_by_youtube_id(youtube_video_id, db):
    """
    Get video by YouTube video ID.

    Args:
        youtube_video_id: YouTube video ID (11 characters)
        db: Database session

    Returns:
        Video model instance or None
    """
    return db.query(Video).filter(
        Video.youtube_video_id == youtube_video_id
    ).first()


def cache_transcript(video_id, transcript_data, db):
    """
    Cache transcript data for a video.

    Args:
        video_id: Database video ID
        transcript_data: Transcript data dict (from transcript_service)
        db: Database session

    Returns:
        Updated Video model instance

    Raises:
        ValueError: If video not found
    """
    video = get_video_by_id(video_id, db)
    if not video:
        raise ValueError(f"Video with ID {video_id} not found")

    # Store transcript as JSON string
    video.transcript = json.dumps(transcript_data)
    video.transcript_cached_at = datetime.utcnow()
    video.language = transcript_data.get('languageCode', 'en')

    # Update duration if available
    if 'durationSeconds' in transcript_data:
        video.duration_seconds = transcript_data['durationSeconds']

    video.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(video)
    return video


def cache_checkpoints(video_id, checkpoints_data, db):
    """
    Cache checkpoint data for a video.

    Args:
        video_id: Database video ID
        checkpoints_data: Checkpoint data dict (from checkpoint_service)
        db: Database session

    Returns:
        Updated Video model instance

    Raises:
        ValueError: If video not found
    """
    video = get_video_by_id(video_id, db)
    if not video:
        raise ValueError(f"Video with ID {video_id} not found")

    video.checkpoints_data = json.dumps(checkpoints_data)
    video.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(video)
    return video


def cache_quiz(video_id, quiz_data, db):
    """
    Cache quiz data for a video.

    Args:
        video_id: Database video ID
        quiz_data: Quiz data dict (from quiz_service)
        db: Database session

    Returns:
        Updated Video model instance

    Raises:
        ValueError: If video not found
    """
    video = get_video_by_id(video_id, db)
    if not video:
        raise ValueError(f"Video with ID {video_id} not found")

    video.quiz_data = json.dumps(quiz_data)
    video.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(video)
    return video


def cache_summary(video_id, summary_text, db):
    """
    Cache summary text for a video.

    Args:
        video_id: Database video ID
        summary_text: Summary text string
        db: Database session

    Returns:
        Updated Video model instance

    Raises:
        ValueError: If video not found
    """
    video = get_video_by_id(video_id, db)
    if not video:
        raise ValueError(f"Video with ID {video_id} not found")

    video.summary = summary_text
    video.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(video)
    return video


def update_video_metadata(video_id, title=None, description=None, 
                         thumbnail_url=None, duration_seconds=None, db=None):
    """
    Update video metadata.

    Args:
        video_id: Database video ID
        title: Video title
        description: Video description
        thumbnail_url: Thumbnail URL
        duration_seconds: Duration in seconds
        db: Database session

    Returns:
        Updated Video model instance

    Raises:
        ValueError: If video not found
    """
    video = get_video_by_id(video_id, db)
    if not video:
        raise ValueError(f"Video with ID {video_id} not found")

    if title is not None:
        video.title = title
    if description is not None:
        video.description = description
    if thumbnail_url is not None:
        video.thumbnail_url = thumbnail_url
    if duration_seconds is not None:
        video.duration_seconds = duration_seconds

    video.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(video)
    return video


def get_video_with_cache(youtube_video_id, db):
    """
    Get video with all cached data (transcript, checkpoints, quiz, summary).

    Args:
        youtube_video_id: YouTube video ID (11 characters)
        db: Database session

    Returns:
        Dictionary with video data and cached content:
        {
            "id": 1,
            "youtubeVideoId": "abc123",
            "title": "Video Title",
            "description": "...",
            "durationSeconds": 360,
            "language": "en",
            "thumbnailUrl": "https://...",
            "totalViews": 0,
            "createdAt": "2025-01-20T10:30:00Z",
            "updatedAt": "2025-01-20T10:30:00Z",
            "transcript": {...} or null,
            "transcriptCachedAt": "..." or null,
            "checkpoints": {...} or null,
            "quiz": {...} or null,
            "summary": "..." or null
        }

    Raises:
        ValueError: If video not found
    """
    video = get_video_by_youtube_id(youtube_video_id, db)
    if not video:
        raise ValueError(f"Video with YouTube ID {youtube_video_id} not found")

    # Increment view count
    video.total_views = (video.total_views or 0) + 1
    db.commit()

    # Parse JSON fields
    transcript = None
    if video.transcript:
        try:
            transcript = json.loads(video.transcript)
        except json.JSONDecodeError:
            transcript = None

    checkpoints = None
    if video.checkpoints_data:
        try:
            checkpoints = json.loads(video.checkpoints_data)
        except json.JSONDecodeError:
            checkpoints = None

    quiz = None
    if video.quiz_data:
        try:
            quiz = json.loads(video.quiz_data)
        except json.JSONDecodeError:
            quiz = None

    return {
        "id": video.id,
        "youtubeVideoId": video.youtube_video_id,
        "title": video.title,
        "description": video.description,
        "durationSeconds": video.duration_seconds,
        "language": video.language,
        "thumbnailUrl": video.thumbnail_url,
        "totalViews": video.total_views,
        "createdAt": video.created_at.isoformat() + "Z" if video.created_at else None,
        "updatedAt": video.updated_at.isoformat() + "Z" if video.updated_at else None,
        "transcript": transcript,
        "transcriptCachedAt": video.transcript_cached_at.isoformat() + "Z" if video.transcript_cached_at else None,
        "checkpoints": checkpoints,
        "quiz": quiz,
        "summary": video.summary
    }


def _fetch_metadata_youtube_api(youtube_video_id):
    """
    Fallback method to fetch metadata using YouTube Data API v3.
    
    Args:
        youtube_video_id: YouTube video ID
        
    Returns:
        Metadata dictionary or None if failed
    """
    try:
        from googleapiclient.discovery import build
        from isodate import parse_duration
        
        api_key = os.getenv('YOUTUBE_API_KEY')
        if not api_key:
            logger.warning("YOUTUBE_API_KEY not set, skipping YouTube API fallback for metadata")
            return None
            
        youtube = build('youtube', 'v3', developerKey=api_key)
        
        response = youtube.videos().list(
            part='snippet,contentDetails',
            id=youtube_video_id
        ).execute()
        
        if not response.get('items'):
            logger.warning(f"No video metadata found via YouTube API for {youtube_video_id}")
            return None
        
        video = response['items'][0]
        snippet = video['snippet']
        content_details = video['contentDetails']
        
        # Parse ISO 8601 duration (PT1H2M10S format)
        duration_seconds = int(parse_duration(content_details['duration']).total_seconds())
        
        # Get best thumbnail
        thumbnails = snippet['thumbnails']
        thumbnail_url = (thumbnails.get('maxres') or thumbnails.get('high') or 
                        thumbnails.get('medium') or thumbnails.get('default', {})).get('url')
        
        return {
            "title": snippet['title'],
            "description": snippet.get('description', ''),
            "thumbnailUrl": thumbnail_url,
            "durationSeconds": duration_seconds,
            "author": snippet['channelTitle'],
            "publishDate": snippet['publishedAt']
        }
        
    except ImportError as e:
        logger.warning(f"Missing required library for YouTube API fallback: {e}")
        return None
    except Exception as e:
        logger.warning(f"YouTube API fallback failed for {youtube_video_id}: {e}")
        return None


def fetch_youtube_metadata(youtube_video_id):
    """
    Fetch video metadata from YouTube (title, description, thumbnail, duration).

    Uses pytubefix library first, with YouTube Data API v3 as fallback.

    Args:
        youtube_video_id: YouTube video ID (11 characters)

    Returns:
        Dictionary with metadata:
        {
            "title": "Video Title",
            "description": "Description...",
            "thumbnailUrl": "https://...",
            "durationSeconds": 360,
            "author": "Channel Name",
            "publishDate": "2025-01-20"
        }

    Raises:
        Exception: If all metadata fetch methods fail
    """
    # Try pytubefix first
    try:
        from pytubefix import YouTube

        url = f"https://www.youtube.com/watch?v={youtube_video_id}"
        yt = YouTube(url)

        return {
            "title": yt.title,
            "description": yt.description or "",
            "thumbnailUrl": yt.thumbnail_url,
            "durationSeconds": yt.length,
            "author": yt.author,
            "publishDate": yt.publish_date.isoformat() if yt.publish_date else None
        }
    except ImportError:
        logger.warning("pytubefix library not installed, attempting YouTube API fallback for metadata")
    except Exception as e:
        logger.warning(f"pytubefix failed for {youtube_video_id}: {e}, attempting YouTube API fallback")
    
    # Fallback to YouTube Data API
    metadata = _fetch_metadata_youtube_api(youtube_video_id)
    if metadata:
        logger.info(f"Successfully fetched metadata via YouTube API for {youtube_video_id}")
        return metadata
    
    logger.error(f"Failed to fetch YouTube metadata for {youtube_video_id} using all available methods")
    raise Exception(f"Failed to fetch YouTube metadata for {youtube_video_id} using all available methods")


def get_user_video_history(user_id, db, limit=50):
    """
    Get video watch history for a user.

    Args:
        user_id: Database user ID (integer)
        db: Database session
        limit: Maximum number of videos to return (default: 50)

    Returns:
        List of dictionaries with video history data:
        [
            {
                "videoId": "abc123",
                "title": "Video Title",
                "thumbnailUrl": "https://...",
                "lastPositionSeconds": 120,
                "lastWatchedAt": "2025-01-20T10:30:00Z",
                "isCompleted": false,
                "watchCount": 3
            },
            ...
        ]
    """
    # Query UserVideoProgress records ordered by last_watched_at (most recent first)
    progress_records = db.query(UserVideoProgress).filter(
        UserVideoProgress.user_id == user_id
    ).order_by(UserVideoProgress.last_watched_at.desc()).limit(limit).all()

    history = []
    for record in progress_records:
        video = record.video

        history.append({
            'videoId': video.youtube_video_id,
            'title': video.title,
            'thumbnailUrl': video.thumbnail_url or f"https://img.youtube.com/vi/{video.youtube_video_id}/mqdefault.jpg",
            'lastPositionSeconds': record.last_position_seconds,
            'lastWatchedAt': record.last_watched_at.isoformat() + 'Z' if record.last_watched_at else None,
            'isCompleted': record.is_completed,
            'watchCount': record.watch_count
        })

    return history


def save_video_to_history(user_id, youtube_video_id, last_position_seconds, is_completed, db):
    """
    Add or update a video in user's watch history.

    Creates or updates UserVideoProgress record. If video doesn't exist in
    database, creates Video record first.

    Args:
        user_id: Database user ID (integer)
        youtube_video_id: YouTube video ID
        last_position_seconds: Current playback position in seconds
        is_completed: Whether video has been fully watched
        db: Database session

    Returns:
        Dictionary with saved data or None if failed:
        {
            "videoId": "abc123",
            "lastPositionSeconds": 120,
            "lastWatchedAt": "2025-01-20T10:30:00Z",
            "isCompleted": false
        }
    """
    try:
        # Get or create video record
        video = get_or_create_video(youtube_video_id, db)

        # Check if progress record exists
        progress = db.query(UserVideoProgress).filter(
            UserVideoProgress.user_id == user_id,
            UserVideoProgress.video_id == video.id
        ).first()

        now = datetime.utcnow()

        if progress:
            # Update existing record atomically
            db.query(UserVideoProgress).filter(
                UserVideoProgress.user_id == user_id,
                UserVideoProgress.video_id == video.id
            ).update(
                {
                    UserVideoProgress.last_position_seconds: last_position_seconds,
                    UserVideoProgress.is_completed: is_completed,
                    UserVideoProgress.last_watched_at: now,
                    UserVideoProgress.watch_count: UserVideoProgress.watch_count + 1,
                },
                synchronize_session=False
            )
        else:
            # Create new progress record
            progress = UserVideoProgress(
                user_id=user_id,
                video_id=video.id,
                last_position_seconds=last_position_seconds,
                is_completed=is_completed,
                first_watched_at=now,
                last_watched_at=now,
                watch_count=1
            )
            db.add(progress)

        db.commit()
        
        # Re-fetch the updated progress object
        progress = db.query(UserVideoProgress).filter(
            UserVideoProgress.user_id == user_id,
            UserVideoProgress.video_id == video.id
        ).first()

        return {
            'videoId': youtube_video_id,
            'lastPositionSeconds': progress.last_position_seconds,
            'lastWatchedAt': progress.last_watched_at.isoformat() + 'Z',
            'isCompleted': progress.is_completed,
            'watchCount': progress.watch_count
        }

    except Exception as e:
        db.rollback()
        logger.error(f"Error saving video to history: {e}")
        return None


def delete_video_from_history(user_id, youtube_video_id, db):
    """
    Remove a specific video from user's watch history.

    Args:
        user_id: Database user ID (integer)
        youtube_video_id: YouTube video ID to remove
        db: Database session

    Returns:
        bool: True if deleted, False if not found
    """
    try:
        # Get video
        video = get_video_by_youtube_id(youtube_video_id, db)
        if not video:
            return False

        # Find and delete progress record
        progress = db.query(UserVideoProgress).filter(
            UserVideoProgress.user_id == user_id,
            UserVideoProgress.video_id == video.id
        ).first()

        if not progress:
            return False

        db.delete(progress)
        db.commit()
        return True

    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting video from history: {e}")
        return False


def clear_video_history(user_id, db):
    """
    Clear all video watch history for a user.

    Args:
        user_id: Database user ID (integer)
        db: Database session

    Returns:
        int: Number of records deleted
    """
    try:
        deleted_count = db.query(UserVideoProgress).filter(
            UserVideoProgress.user_id == user_id
        ).delete()

        db.commit()
        return deleted_count

    except Exception as e:
        db.rollback()
        logger.error(f"Error clearing video history: {e}")
        return 0
