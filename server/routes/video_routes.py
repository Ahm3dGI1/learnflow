from flask import Blueprint, request, jsonify

from services import (
    fetch_transcript,
    extract_video_id,
    get_available_transcripts,
    calculate_video_duration_from_transcript,
    get_or_create_video,
    get_video_by_youtube_id,
    cache_transcript,
    update_video_metadata,
    get_video_with_cache,
    fetch_youtube_metadata
)
from youtube_transcript_api._errors import (
    TranscriptsDisabled,
    NoTranscriptFound,
    VideoUnavailable,
    YouTubeRequestFailed
)
from database import SessionLocal


video_bp = Blueprint('video', __name__, url_prefix='/api/videos')


@video_bp.route('/transcript', methods=['POST'])
def get_transcript():
    """
    Fetch transcript for a YouTube video.

    Request Body:
        {
            "videoId": "abc123" or "https://youtube.com/watch?v=abc123",
            "languageCodes": ["en", "es"]  // Optional, preferred languages
        }

    Returns:
        {
            "videoId": "abc123",
            "snippets": [
                {"text": "Hello", "start": 0.0, "duration": 1.5},
                ...
            ],
            "language": "English",
            "languageCode": "en",
            "isGenerated": false,
            "fetchedAt": "2025-01-20T10:30:00Z",
            "durationSeconds": 360
        }

    Status Codes:
        200: Success
        400: Invalid request (missing videoId, invalid format)
        404: Video not found or transcripts disabled
        503: YouTube request failed (rate limit or service unavailable)
        500: Internal server error
    """
    try:
        data = request.get_json()

        if not data:
            return jsonify({'error': 'No data provided'}), 400

        video_input = data.get('videoId')
        language_codes = data.get('languageCodes')

        # Validation
        if not video_input:
            return jsonify({'error': 'videoId is required'}), 400

        # Extract video ID from URL or use directly
        try:
            video_id = extract_video_id(video_input)
        except ValueError as e:
            return jsonify({'error': str(e)}), 400

        # Validate language codes if provided
        if language_codes is not None:
            if not isinstance(language_codes, list):
                return jsonify({'error': 'languageCodes must be an array'}), 400

            if len(language_codes) == 0:
                language_codes = None  # Treat empty array as None

        # Fetch transcript
        transcript_data = fetch_transcript(video_id, language_codes)

        # Calculate duration
        duration = calculate_video_duration_from_transcript(
            transcript_data['snippets']
        )
        transcript_data['durationSeconds'] = duration

        return jsonify(transcript_data), 200

    except TranscriptsDisabled:
        return jsonify({
            'error': 'Transcripts are disabled for this video',
            'code': 'TRANSCRIPTS_DISABLED'
        }), 404

    except NoTranscriptFound as e:
        return jsonify({
            'error': f'No transcript found: {str(e)}',
            'code': 'NO_TRANSCRIPT_FOUND'
        }), 404

    except VideoUnavailable:
        return jsonify({
            'error': 'Video is unavailable or does not exist',
            'code': 'VIDEO_UNAVAILABLE'
        }), 404

    except YouTubeRequestFailed as e:
        return jsonify({
            'error': 'YouTube request failed. Please try again later.',
            'code': 'YOUTUBE_REQUEST_FAILED',
            'details': str(e)
        }), 503

    except ValueError as e:
        return jsonify({'error': str(e)}), 400

    except Exception as e:
        return jsonify({
            'error': 'Failed to fetch transcript',
            'details': str(e)
        }), 500


@video_bp.route('/transcript/available', methods=['POST'])
def list_available_transcripts():
    """
    List all available transcripts for a video.

    Request Body:
        {
            "videoId": "abc123" or "https://youtube.com/watch?v=abc123"
        }

    Returns:
        {
            "videoId": "abc123",
            "transcripts": [
                {
                    "languageCode": "en",
                    "language": "English",
                    "isGenerated": false,
                    "isTranslatable": true
                },
                ...
            ]
        }

    Status Codes:
        200: Success
        400: Invalid request
        404: Video not found or transcripts disabled
        500: Internal server error
    """
    try:
        data = request.get_json()

        if not data:
            return jsonify({'error': 'No data provided'}), 400

        video_input = data.get('videoId')

        if not video_input:
            return jsonify({'error': 'videoId is required'}), 400

        # Extract video ID
        try:
            video_id = extract_video_id(video_input)
        except ValueError as e:
            return jsonify({'error': str(e)}), 400

        # Get available transcripts
        transcripts_info = get_available_transcripts(video_id)

        return jsonify(transcripts_info), 200

    except TranscriptsDisabled:
        return jsonify({
            'error': 'Transcripts are disabled for this video',
            'code': 'TRANSCRIPTS_DISABLED'
        }), 404

    except VideoUnavailable:
        return jsonify({
            'error': 'Video is unavailable or does not exist',
            'code': 'VIDEO_UNAVAILABLE'
        }), 404

    except ValueError as e:
        return jsonify({'error': str(e)}), 400

    except Exception as e:
        return jsonify({
            'error': 'Failed to list transcripts',
            'details': str(e)
        }), 500


@video_bp.route('/extract-id', methods=['POST'])
def extract_video_id_route():
    """
    Extract YouTube video ID from URL.

    Request Body:
        {
            "url": "https://youtube.com/watch?v=abc123"
        }

    Returns:
        {
            "videoId": "abc123",
            "url": "https://youtube.com/watch?v=abc123"
        }

    Status Codes:
        200: Success
        400: Invalid URL format
    """
    try:
        data = request.get_json()

        if not data:
            return jsonify({'error': 'No data provided'}), 400

        url = data.get('url')

        if not url:
            return jsonify({'error': 'url is required'}), 400

        video_id = extract_video_id(url)

        return jsonify({
            'videoId': video_id,
            'url': url
        }), 200

    except ValueError as e:
        return jsonify({'error': str(e)}), 400

    except Exception as e:
        return jsonify({
            'error': 'Failed to extract video ID',
            'details': str(e)
        }), 500


# ========== VIDEO MANAGEMENT ROUTES (Task 1.4) ==========

@video_bp.route('/<youtube_video_id>', methods=['GET'])
def get_video(youtube_video_id):
    """
    Get video with all cached data.

    URL Parameters:
        youtube_video_id: YouTube video ID (11 characters)

    Returns:
        {
            "id": 1,
            "youtubeVideoId": "abc123",
            "title": "Video Title",
            "description": "...",
            "durationSeconds": 360,
            "language": "en",
            "thumbnailUrl": "https://...",
            "totalViews": 5,
            "createdAt": "2025-01-20T10:30:00Z",
            "updatedAt": "2025-01-20T10:30:00Z",
            "transcript": {...} or null,
            "transcriptCachedAt": "..." or null,
            "checkpoints": {...} or null,
            "quiz": {...} or null,
            "summary": "..." or null
        }

    Status Codes:
        200: Success
        404: Video not found
        500: Internal server error
    """
    db = SessionLocal()
    try:
        # Validate video ID
        if len(youtube_video_id) != 11:
            return jsonify({'error': 'Invalid YouTube video ID format'}), 400

        # Get video with cache
        try:
            video_data = get_video_with_cache(youtube_video_id, db)
            return jsonify(video_data), 200
        except ValueError as e:
            return jsonify({'error': str(e)}), 404

    except Exception as e:
        return jsonify({
            'error': 'Failed to get video',
            'details': str(e)
        }), 500
    finally:
        db.close()


@video_bp.route('', methods=['POST'])
def create_video():
    """
    Add new video to system (with optional metadata and transcript).

    Request Body:
        {
            "videoId": "abc123" or "https://youtube.com/watch?v=abc123",
            "fetchMetadata": true,  // Optional, default false
            "fetchTranscript": true,  // Optional, default false
            "languageCodes": ["en"]  // Optional, for transcript
        }

    Returns:
        {
            "id": 1,
            "youtubeVideoId": "abc123",
            "title": "Video Title",
            "description": "...",
            "durationSeconds": 360,
            "thumbnailUrl": "https://...",
            "transcript": {...} or null,
            "message": "Video created successfully"
        }

    Status Codes:
        201: Created successfully
        400: Invalid request
        500: Internal server error
    """
    db = SessionLocal()
    try:
        data = request.get_json()

        if not data:
            return jsonify({'error': 'No data provided'}), 400

        video_input = data.get('videoId')
        fetch_metadata = data.get('fetchMetadata', False)
        fetch_transcript_flag = data.get('fetchTranscript', False)
        language_codes = data.get('languageCodes')

        if not video_input:
            return jsonify({'error': 'videoId is required'}), 400

        # Extract video ID
        try:
            youtube_video_id = extract_video_id(video_input)
        except ValueError as e:
            return jsonify({'error': str(e)}), 400

        # Get or create video
        video = get_or_create_video(youtube_video_id, db)

        # Fetch metadata if requested
        if fetch_metadata:
            try:
                metadata = fetch_youtube_metadata(youtube_video_id)
                update_video_metadata(
                    video.id,
                    title=metadata.get('title'),
                    description=metadata.get('description'),
                    thumbnail_url=metadata.get('thumbnailUrl'),
                    duration_seconds=metadata.get('durationSeconds'),
                    db=db
                )
            except Exception as e:
                # Optional: Continue even if metadata fetch fails
                # Video is still created successfully without metadata
                pass

        # Fetch and cache transcript if requested
        transcript_data = None
        if fetch_transcript_flag:
            try:
                transcript_data = fetch_transcript(youtube_video_id, language_codes)
                cache_transcript(video.id, transcript_data, db)
            except Exception as e:
                # Optional: Continue even if transcript fetch fails
                # Video is still created successfully without transcript
                pass

        # Get updated video data
        video_data = get_video_with_cache(youtube_video_id, db)
        video_data['message'] = 'Video created successfully'

        return jsonify(video_data), 201

    except Exception as e:
        db.rollback()
        return jsonify({
            'error': 'Failed to create video',
            'details': str(e)
        }), 500
    finally:
        db.close()


@video_bp.route('/<youtube_video_id>/metadata', methods=['GET'])
def get_video_metadata(youtube_video_id):
    """
    Fetch YouTube metadata for a video.

    URL Parameters:
        youtube_video_id: YouTube video ID (11 characters)

    Query Parameters:
        cache: "true" to save metadata to database (optional)

    Returns:
        {
            "youtubeVideoId": "abc123",
            "title": "Video Title",
            "description": "Description...",
            "thumbnailUrl": "https://...",
            "durationSeconds": 360,
            "author": "Channel Name",
            "publishDate": "2025-01-20",
            "cached": true  // if cache=true was used
        }

    Status Codes:
        200: Success
        400: Invalid video ID
        500: Metadata fetch failed
    """
    db = SessionLocal()
    try:
        # Validate video ID
        if len(youtube_video_id) != 11:
            return jsonify({'error': 'Invalid YouTube video ID format'}), 400

        # Check if caching is requested
        cache_result = request.args.get('cache', 'false').lower() == 'true'

        # Fetch metadata
        metadata = fetch_youtube_metadata(youtube_video_id)
        metadata['youtubeVideoId'] = youtube_video_id

        # Cache to database if requested
        if cache_result:
            try:
                video = get_or_create_video(youtube_video_id, db)
                update_video_metadata(
                    video.id,
                    title=metadata.get('title'),
                    description=metadata.get('description'),
                    thumbnail_url=metadata.get('thumbnailUrl'),
                    duration_seconds=metadata.get('durationSeconds'),
                    db=db
                )
                metadata['cached'] = True
            except Exception:
                # Optional: If caching fails, still return metadata (not cached)
                metadata['cached'] = False
        else:
            metadata['cached'] = False

        return jsonify(metadata), 200

    except Exception as e:
        return jsonify({
            'error': 'Failed to fetch video metadata',
            'details': str(e)
        }), 500
    finally:
        db.close()
