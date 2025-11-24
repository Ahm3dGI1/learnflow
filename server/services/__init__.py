"""
Services Module for LearnFlow.

Exports all service layer functions for business logic operations. Services
handle core application functionality including:
- AI-powered checkpoint generation from video transcripts
- Real-time chat tutoring with video context
- Quiz generation and validation
- YouTube transcript fetching and processing
- Video metadata extraction and duration calculation

All services are designed to be called from route handlers with validated
input and return structured data for JSON serialization.
"""

from .checkpoint_service import generate_checkpoints
from .chat_service import generate_chat_response, generate_chat_response_stream
from .quiz_service import generate_quiz
from .transcript_service import (
    fetch_transcript,
    extract_video_id,
    get_available_transcripts,
    calculate_video_duration_from_transcript
)
from .video_service import (
    get_or_create_video,
    get_video_by_id,
    get_video_by_youtube_id,
    cache_transcript,
    cache_checkpoints,
    cache_quiz,
    cache_summary,
    update_video_metadata,
    get_video_with_cache,
    fetch_youtube_metadata
)

__all__ = [
    'generate_checkpoints',
    'generate_chat_response',
    'generate_chat_response_stream',
    'generate_quiz',
    'fetch_transcript',
    'extract_video_id',
    'get_available_transcripts',
    'calculate_video_duration_from_transcript',
    'get_or_create_video',
    'get_video_by_id',
    'get_video_by_youtube_id',
    'cache_transcript',
    'cache_checkpoints',
    'cache_quiz',
    'cache_summary',
    'update_video_metadata',
    'get_video_with_cache',
    'fetch_youtube_metadata'
]
