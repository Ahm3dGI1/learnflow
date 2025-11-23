"""
Video service for LearnFlow.
Handles video creation, caching, and metadata fetching.
"""

import json
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from models import Video
from .transcript_service import extract_video_id, fetch_transcript


def get_or_create_video(youtube_video_id, db):
    """
    Get video from database or create new entry.

    Args:
        youtube_video_id: YouTube video ID (11 characters)
        db: Database session

    Returns:
        Video model instance

    Raises:
        ValueError: If video ID format is invalid
    """
    # Validate video ID format
    if not youtube_video_id or len(youtube_video_id) != 11:
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


def fetch_youtube_metadata(youtube_video_id):
    """
    Fetch video metadata from YouTube (title, description, thumbnail, duration).

    Uses pytube library to fetch metadata without downloading video.

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
        Exception: If metadata fetch fails
    """
    try:
        from pytube import YouTube
        
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
        raise Exception("pytube library not installed. Run: pip install pytube")
    except Exception as e:
        raise Exception(f"Failed to fetch YouTube metadata: {str(e)}")
