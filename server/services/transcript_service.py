"""
YouTube Transcript Fetching Service for LearnFlow.

Handles business logic for retrieving YouTube video transcripts with language
preference support. Provides utilities for video ID extraction, transcript
fetching with fallback to auto-generated subtitles, available transcript
listing, and video duration calculation from transcript data.

Uses youtube-transcript-api library for accessing YouTube's subtitle data.
Supports both manually created and auto-generated transcripts with proper
error handling for various failure modes (disabled transcripts, unavailable
videos, API failures).
"""

import re
from datetime import datetime

from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import (
    TranscriptsDisabled,
    NoTranscriptFound,
    VideoUnavailable,
    YouTubeRequestFailed
)


def extract_video_id(url_or_id):
    """
    Extract YouTube video ID from various URL formats.

    Args:
        url_or_id: YouTube URL or video ID

    Returns:
        Extracted 11-character video ID

    Raises:
        ValueError: If URL format is invalid or video ID cannot be extracted
    """
    # If it's already a valid ID (11 characters, alphanumeric with dashes/underscores)
    if re.match(r'^[a-zA-Z0-9_-]{11}$', url_or_id):
        return url_or_id

    # Regex patterns for various YouTube URL formats
    patterns = [
        r'(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})',
        r'(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})',
        r'(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})',
        r'(?:https?:\/\/)?(?:www\.)?youtube\.com\/v\/([a-zA-Z0-9_-]{11})',
    ]

    for pattern in patterns:
        match = re.search(pattern, url_or_id)
        if match:
            return match.group(1)

    raise ValueError(f"Could not extract video ID from: {url_or_id}")


def fetch_transcript(video_id, language_codes=None):
    """
    Fetch transcript for a YouTube video.

    Attempts to fetch manually created transcripts first, then falls back to
    auto-generated transcripts if specified languages are provided.

    Args:
        video_id: YouTube video ID (11 characters)
        language_codes: Optional list of preferred language codes (e.g., ['en', 'es']).
            If None, fetches the default transcript.

    Returns:
        Transcript data with metadata:
            {
                "videoId": "abc123",
                "snippets": [{"text": "Hello", "start": 0.0, "duration": 1.5}, ...],
                "language": "English",
                "languageCode": "en",
                "isGenerated": False,
                "fetchedAt": "2025-01-20T10:30:00Z"
            }

    Raises:
        ValueError: If video ID format is invalid
        TranscriptsDisabled: If transcripts are disabled for the video
        NoTranscriptFound: If no transcript is available in requested languages
        VideoUnavailable: If video doesn't exist or is private
        YouTubeRequestFailed: If YouTube request fails
    """
    # Validate video ID format (must be exactly 11 characters)
    if not re.match(r'^[a-zA-Z0-9_-]{11}$', video_id):
        raise ValueError(f"Invalid YouTube video ID format: {video_id}")

    try:
        # Create API instance
        api = YouTubeTranscriptApi()

        # Fetch transcript
        if language_codes:
            # Try to get transcript in preferred languages
            transcript_list = api.list(video_id)

            # Try manually created transcripts first
            for lang_code in language_codes:
                try:
                    transcript = transcript_list.find_manually_created_transcript([lang_code])
                    snippets = transcript.fetch()
                    return _format_transcript_response(
                        video_id=video_id,
                        snippets=snippets,
                        language=transcript.language,
                        language_code=transcript.language_code,
                        is_generated=False
                    )
                except NoTranscriptFound:
                    continue

            # Fall back to auto-generated transcripts
            for lang_code in language_codes:
                try:
                    transcript = transcript_list.find_generated_transcript([lang_code])
                    snippets = transcript.fetch()
                    return _format_transcript_response(
                        video_id=video_id,
                        snippets=snippets,
                        language=transcript.language,
                        language_code=transcript.language_code,
                        is_generated=True
                    )
                except NoTranscriptFound:
                    continue

            # If no preferred language found, raise error
            raise NoTranscriptFound(
                video_id,
                f"No transcript found in requested languages: {language_codes}"
            )
        else:
            # Get any available transcript (default behavior)
            transcript_list = api.fetch(video_id)

            # The fetch returns the snippets directly
            return _format_transcript_response(
                video_id=video_id,
                snippets=transcript_list,
                language="English",  # Default assumption
                language_code="en",
                is_generated=False  # Unknown, assume manual
            )

    except TranscriptsDisabled:
        raise TranscriptsDisabled(video_id)
    except NoTranscriptFound as e:
        raise NoTranscriptFound(video_id, str(e))
    except VideoUnavailable:
        raise VideoUnavailable(video_id)
    except YouTubeRequestFailed as e:
        raise YouTubeRequestFailed(video_id, str(e))
    except Exception as e:
        raise Exception(f"Failed to fetch transcript: {str(e)}")


def _format_transcript_response(video_id, snippets, language, language_code, is_generated):
    """
    Format transcript data into standardized response structure.

    Handles both FetchedTranscriptSnippet dataclass objects and dictionary formats
    for maximum compatibility.

    Args:
        video_id: YouTube video ID
        snippets: Raw transcript snippets (FetchedTranscriptSnippet objects or dicts)
        language: Language name (e.g., "English")
        language_code: Language code (e.g., "en")
        is_generated: Whether transcript is auto-generated

    Returns:
        Formatted transcript response dict
    """
    formatted_snippets = []
    for snippet in snippets:
        # Handle both dataclass objects and dictionaries
        if hasattr(snippet, 'text'):
            # It's a dataclass object
            formatted_snippets.append({
                "text": snippet.text,
                "start": snippet.start,
                "duration": snippet.duration
            })
        else:
            # It's a dictionary
            formatted_snippets.append({
                "text": snippet["text"],
                "start": snippet["start"],
                "duration": snippet["duration"]
            })

    return {
        "videoId": video_id,
        "snippets": formatted_snippets,
        "language": language,
        "languageCode": language_code,
        "isGenerated": is_generated,
        "fetchedAt": datetime.utcnow().isoformat() + "Z"
    }


def get_available_transcripts(video_id):
    """
    Get list of all available transcripts for a video.

    Returns both manually created and auto-generated transcripts with their
    language information and translatability status.

    Args:
        video_id: YouTube video ID

    Returns:
        Available transcripts information:
            {
                "videoId": "abc123",
                "transcripts": [
                    {
                        "languageCode": "en",
                        "language": "English",
                        "isGenerated": False,
                        "isTranslatable": True
                    }
                ]
            }

    Raises:
        TranscriptsDisabled: If transcripts are disabled for the video
        VideoUnavailable: If video doesn't exist
    """
    try:
        api = YouTubeTranscriptApi()
        transcript_list = api.list(video_id)

        transcripts = []

        # Add manually created transcripts
        for transcript in transcript_list._manually_created_transcripts.values():
            transcripts.append({
                "languageCode": transcript.language_code,
                "language": transcript.language,
                "isGenerated": False,
                "isTranslatable": transcript.is_translatable
            })

        # Add auto-generated transcripts
        for transcript in transcript_list._generated_transcripts.values():
            transcripts.append({
                "languageCode": transcript.language_code,
                "language": transcript.language,
                "isGenerated": True,
                "isTranslatable": transcript.is_translatable
            })

        return {
            "videoId": video_id,
            "transcripts": transcripts
        }

    except TranscriptsDisabled:
        raise TranscriptsDisabled(video_id)
    except VideoUnavailable:
        raise VideoUnavailable(video_id)
    except Exception as e:
        raise Exception(f"Failed to list transcripts: {str(e)}")


def calculate_video_duration_from_transcript(snippets):
    """
    Calculate total video duration from transcript snippets.

    Args:
        snippets: List of formatted transcript snippet dicts with 'start' and 'duration'

    Returns:
        Total video duration in seconds (rounded down to nearest integer)
    """
    if not snippets:
        return 0

    last_snippet = snippets[-1]
    return int(last_snippet["start"] + last_snippet["duration"])
