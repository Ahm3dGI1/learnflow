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
from .chat_service import (
    generate_chat_response,
    generate_chat_response_stream,
    save_chat_message,
    get_chat_history,
    generate_session_id
)
from .quiz_service import generate_quiz
from .flashcard_service import generate_flashcards
from .summary_service import generate_summary
from .user_service import get_or_create_user, get_user_by_firebase_uid
from .progress_service import update_progress, mark_complete, get_user_progress, get_video_progress
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
    fetch_youtube_metadata,
    get_user_video_history,
    save_video_to_history,
    delete_video_from_history,
    clear_video_history
)

__all__ = [
    'generate_checkpoints',
    'generate_chat_response',
    'generate_chat_response_stream',
    'save_chat_message',
    'get_chat_history',
    'generate_session_id',
    'generate_quiz',
    'generate_flashcards',
    'generate_summary',
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
    'fetch_youtube_metadata',
    'get_user_video_history',
    'save_video_to_history',
    'delete_video_from_history',
    'clear_video_history',
    'get_or_create_user',
    'get_user_by_firebase_uid',
    'update_progress',
    'mark_complete',
    'get_user_progress',
    'get_video_progress'
]
