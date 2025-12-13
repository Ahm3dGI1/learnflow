"""
Custom exception classes for LearnFlow.

Provides structured exceptions with:
- HTTP status codes
- User-friendly error messages
- Technical details for logging
- Error codes for frontend handling
"""


class APIError(Exception):
    """
    Base exception class for all API errors.

    Attributes:
        status_code: HTTP status code (default: 500)
        user_message: User-friendly error message
        error_code: Machine-readable error code
        details: Technical details for logging
    """

    status_code = 500
    error_code = "INTERNAL_ERROR"
    user_message = "An unexpected error occurred. Please try again later."

    def __init__(self, message=None, details=None, status_code=None):
        """
        Initialize API error.

        Args:
            message: User-friendly error message (uses default if not provided)
            details: Technical details for logging
            status_code: Override default status code
        """
        super().__init__(message or self.user_message)
        self.user_message = message or self.user_message
        self.details = details
        if status_code:
            self.status_code = status_code

    def to_dict(self):
        """
        Convert exception to dictionary for JSON response.

        Returns:
            Dictionary with error information
        """
        return {
            "error": self.user_message,
            "code": self.error_code,
            "details": self.details
        }


# ==================== Video-Related Errors ====================

class VideoNotFoundError(APIError):
    """Video does not exist in database."""
    status_code = 404
    error_code = "VIDEO_NOT_FOUND"
    user_message = "Video not found. Please check the video ID and try again."


class VideoAlreadyExistsError(APIError):
    """Video already exists in database."""
    status_code = 409
    error_code = "VIDEO_ALREADY_EXISTS"
    user_message = "This video already exists in the system."


class InvalidVideoIdError(APIError):
    """Invalid YouTube video ID format."""
    status_code = 400
    error_code = "INVALID_VIDEO_ID"
    user_message = "Invalid YouTube video ID format. Please provide a valid 11-character video ID or YouTube URL."


# ==================== Transcript-Related Errors ====================

class TranscriptNotFoundError(APIError):
    """No transcript available for video."""
    status_code = 404
    error_code = "TRANSCRIPT_NOT_FOUND"
    user_message = "No transcript available for this video. The video may not have captions enabled."


class TranscriptsDisabledError(APIError):
    """Transcripts are disabled for this video."""
    status_code = 404
    error_code = "TRANSCRIPTS_DISABLED"
    user_message = "Transcripts are disabled for this video."


class VideoUnavailableError(APIError):
    """Video is unavailable or private."""
    status_code = 404
    error_code = "VIDEO_UNAVAILABLE"
    user_message = "This video is unavailable, private, or does not exist on YouTube."


class TranscriptFetchError(APIError):
    """Failed to fetch transcript from YouTube."""
    status_code = 503
    error_code = "TRANSCRIPT_FETCH_FAILED"
    user_message = "Failed to fetch transcript from YouTube. Please try again later."


# ==================== LLM-Related Errors ====================

class LLMError(APIError):
    """Base class for LLM-related errors."""
    status_code = 500
    error_code = "LLM_ERROR"
    user_message = "Failed to generate AI content. Please try again later."


class LLMAPIKeyError(LLMError):
    """LLM API key not configured."""
    status_code = 500
    error_code = "LLM_API_KEY_MISSING"
    user_message = "AI service is not properly configured. Please contact support."


class LLMRateLimitError(LLMError):
    """LLM API rate limit exceeded."""
    status_code = 429
    error_code = "LLM_RATE_LIMIT"
    user_message = "Too many AI requests. Please try again in a few minutes."


class LLMTimeoutError(LLMError):
    """LLM request timed out."""
    status_code = 504
    error_code = "LLM_TIMEOUT"
    user_message = "AI request timed out. Please try again."


class CheckpointGenerationError(LLMError):
    """Failed to generate checkpoints."""
    status_code = 500
    error_code = "CHECKPOINT_GENERATION_FAILED"
    user_message = "Failed to generate video checkpoints. Please try again later."


class SummaryGenerationError(LLMError):
    """Failed to generate summary."""
    status_code = 500
    error_code = "SUMMARY_GENERATION_FAILED"
    user_message = "Failed to generate video summary. Please try again later."


class QuizGenerationError(LLMError):
    """Failed to generate quiz."""
    status_code = 500
    error_code = "QUIZ_GENERATION_FAILED"
    user_message = "Failed to generate quiz questions. Please try again later."


# ==================== User-Related Errors ====================

class UserNotFoundError(APIError):
    """User does not exist."""
    status_code = 404
    error_code = "USER_NOT_FOUND"
    user_message = "User not found."


class InvalidUserDataError(APIError):
    """Invalid user data provided."""
    status_code = 400
    error_code = "INVALID_USER_DATA"
    user_message = "Invalid user data. Please check your input and try again."


class AuthenticationError(APIError):
    """Authentication failed."""
    status_code = 401
    error_code = "AUTHENTICATION_FAILED"
    user_message = "Authentication failed. Please log in again."


class AuthorizationError(APIError):
    """User not authorized for this action."""
    status_code = 403
    error_code = "AUTHORIZATION_FAILED"
    user_message = "You are not authorized to perform this action."


# ==================== Validation Errors ====================

class ValidationError(APIError):
    """Request validation failed."""
    status_code = 400
    error_code = "VALIDATION_ERROR"
    user_message = "Invalid request data. Please check your input and try again."


class MissingParameterError(ValidationError):
    """Required parameter is missing."""
    error_code = "MISSING_PARAMETER"

    def __init__(self, parameter_name):
        super().__init__(
            message=f"Missing required parameter: {parameter_name}",
            details={"parameter": parameter_name}
        )


class InvalidParameterError(ValidationError):
    """Parameter has invalid value."""
    error_code = "INVALID_PARAMETER"

    def __init__(self, parameter_name, reason=None):
        message = f"Invalid parameter: {parameter_name}"
        if reason:
            message += f" ({reason})"
        super().__init__(
            message=message,
            details={"parameter": parameter_name, "reason": reason}
        )


# ==================== Database Errors ====================

class DatabaseError(APIError):
    """Database operation failed."""
    status_code = 500
    error_code = "DATABASE_ERROR"
    user_message = "A database error occurred. Please try again later."


class DatabaseConnectionError(DatabaseError):
    """Failed to connect to database."""
    error_code = "DATABASE_CONNECTION_FAILED"
    user_message = "Unable to connect to database. Please try again later."


# ==================== External Service Errors ====================

class ExternalServiceError(APIError):
    """External service request failed."""
    status_code = 503
    error_code = "EXTERNAL_SERVICE_ERROR"
    user_message = "An external service is currently unavailable. Please try again later."


class YouTubeAPIError(ExternalServiceError):
    """YouTube API request failed."""
    error_code = "YOUTUBE_API_ERROR"
    user_message = "YouTube service is currently unavailable. Please try again later."


class YouTubeRateLimitError(YouTubeAPIError):
    """YouTube API rate limit exceeded."""
    status_code = 429
    error_code = "YOUTUBE_RATE_LIMIT"
    user_message = "Too many requests to YouTube. Please try again in a few minutes."


# ==================== Helper Functions ====================

def get_error_response(exception, include_details=False):
    """
    Convert an exception to a JSON error response.

    Args:
        exception: Exception object
        include_details: Whether to include technical details (debug mode)

    Returns:
        Tuple of (response_dict, status_code)

    Example:
        response, status = get_error_response(exception, include_details=app.debug)
        return jsonify(response), status
    """
    if isinstance(exception, APIError):
        response = exception.to_dict()
        status_code = exception.status_code
    else:
        # Unexpected exception
        response = {
            "error": "An unexpected error occurred. Please try again later.",
            "code": "INTERNAL_ERROR"
        }
        status_code = 500

    # Include details only in debug mode
    if include_details and hasattr(exception, 'details'):
        response['details'] = exception.details
    elif include_details:
        response['details'] = str(exception)

    return response, status_code
