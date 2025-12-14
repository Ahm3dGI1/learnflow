"""
Structured logging utility for LearnFlow.

Provides consistent logging across the application with:
- Different log levels (DEBUG, INFO, WARNING, ERROR, CRITICAL)
- Structured context (request IDs, user IDs, video IDs, etc.)
- Environment-aware configuration (verbose in dev, production-ready in prod)
- File and console output
"""

import logging
import sys
from datetime import datetime
from pathlib import Path
import os


class ContextFormatter(logging.Formatter):
    """
    Custom formatter that includes context information in log messages.
    Formats logs with timestamp, level, module, message, and optional context.
    """

    def format(self, record):
        # Add timestamp
        record.timestamp = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')

        # Extract context from 'extra' dict if present
        context_parts = []
        if hasattr(record, 'video_id'):
            context_parts.append(f"video_id={record.video_id}")
        if hasattr(record, 'user_id'):
            context_parts.append(f"user_id={record.user_id}")
        if hasattr(record, 'request_id'):
            context_parts.append(f"request_id={record.request_id}")
        if hasattr(record, 'operation'):
            context_parts.append(f"operation={record.operation}")

        # Add context to message if present
        if context_parts:
            record.context = f" [{', '.join(context_parts)}]"
        else:
            record.context = ""

        return super().format(record)


def get_logger(name):
    """
    Get a configured logger instance.

    Args:
        name: Logger name (typically __name__ of the calling module)

    Returns:
        Configured logger instance

    Example:
        logger = get_logger(__name__)
        logger.info("Video created", extra={"video_id": "abc123", "user_id": "user_123"})
    """
    logger = logging.getLogger(name)

    # Only configure if not already configured
    if logger.handlers:
        return logger

    # Get log level from environment (default: INFO)
    log_level = os.getenv('LOG_LEVEL', 'INFO').upper()
    logger.setLevel(getattr(logging, log_level, logging.INFO))

    # Console handler (always enabled)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.DEBUG)

    # Format: timestamp [LEVEL] module: message [context]
    console_format = ContextFormatter(
        '%(timestamp)s [%(levelname)s] %(name)s: %(message)s%(context)s'
    )
    console_handler.setFormatter(console_format)
    logger.addHandler(console_handler)

    # File handler (only in production or if LOG_FILE is set)
    log_file = os.getenv('LOG_FILE')
    if log_file:
        # Create logs directory if it doesn't exist
        log_path = Path(log_file)
        log_path.parent.mkdir(parents=True, exist_ok=True)

        file_handler = logging.FileHandler(log_file)
        file_handler.setLevel(logging.INFO)

        # More detailed format for file logs
        file_format = ContextFormatter(
            '%(timestamp)s [%(levelname)s] %(name)s:%(lineno)d: %(message)s%(context)s'
        )
        file_handler.setFormatter(file_format)
        logger.addHandler(file_handler)

    # Prevent propagation to root logger
    logger.propagate = False

    return logger


def log_exception(logger, exception, context=None):
    """
    Log an exception with full traceback and context.

    Args:
        logger: Logger instance
        exception: Exception object
        context: Optional dict with context information

    Example:
        try:
            do_something()
        except Exception as e:
            log_exception(logger, e, {"video_id": "abc123", "operation": "fetch_transcript"})
    """
    extra = context or {}
    logger.error(
        f"{type(exception).__name__}: {str(exception)}",
        exc_info=True,
        extra=extra
    )


def log_request(logger, method, path, status_code, duration_ms=None, user_id=None):
    """
    Log an HTTP request.

    Args:
        logger: Logger instance
        method: HTTP method (GET, POST, etc.)
        path: Request path
        status_code: HTTP status code
        duration_ms: Request duration in milliseconds
        user_id: Optional user ID

    Example:
        log_request(logger, "POST", "/api/videos", 201, duration_ms=150, user_id="user_123")
    """
    extra = {}
    if user_id:
        extra['user_id'] = user_id

    duration_str = f" ({duration_ms}ms)" if duration_ms else ""
    logger.info(
        f"{method} {path} -> {status_code}{duration_str}",
        extra=extra
    )


# Example usage for documentation
if __name__ == "__main__":
    # Basic usage
    logger = get_logger(__name__)

    logger.debug("Detailed debug information")
    logger.info("General information message")
    logger.warning("Warning message")
    logger.error("Error message")
    logger.critical("Critical system failure")

    # With context
    logger.info("Video created", extra={
        "video_id": "abc123",
        "user_id": "user_123",
        "operation": "create_video"
    })

    # Logging exceptions
    try:
        raise ValueError("Something went wrong")
    except Exception as e:
        log_exception(logger, e, {"video_id": "abc123"})

    # Logging requests
    log_request(logger, "POST", "/api/videos", 201, duration_ms=150, user_id="user_123")
