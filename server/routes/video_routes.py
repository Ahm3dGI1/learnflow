from flask import Blueprint, request, jsonify

from services import (
    fetch_transcript,
    extract_video_id,
    get_available_transcripts,
    calculate_video_duration_from_transcript
)
from youtube_transcript_api._errors import (
    TranscriptsDisabled,
    NoTranscriptFound,
    VideoUnavailable,
    YouTubeRequestFailed
)


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
