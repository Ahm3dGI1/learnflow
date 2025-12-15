"""
LearnFlow Flask Application.

This module initializes and configures the LearnFlow Flask server,
registers API blueprints, and sets up CORS for cross-origin requests.
The application serves as the main entry point for all backend API endpoints.
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
import os
from pathlib import Path
from routes import llm_bp, video_bp, user_bp, progress_bp
from database import init_db
from utils.logger import get_logger, log_request
from utils.exceptions import APIError, get_error_response
from datetime import datetime

# Load environment variables from .env file
# Look in both server/ directory and parent (root) directory
load_dotenv()  # Try current directory first
load_dotenv(Path(__file__).parent.parent / '.env')  # Then try root directory

# Initialize database tables (creates them if they don't exist)
init_db()

# Initialize Flask application
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Get logger
logger = get_logger(__name__)

# Register API blueprints
app.register_blueprint(llm_bp)  # LLM routes (checkpoints, quiz, chat)
app.register_blueprint(video_bp)  # Video routes (CRUD, metadata, transcripts)
app.register_blueprint(user_bp)  # User routes (create/update, fetch by Firebase UID)
app.register_blueprint(progress_bp)  # Progress routes (video watch tracking, resume)


# ==================== Global Error Handlers ====================

@app.errorhandler(APIError)
def handle_api_error(error):
    """
    Handle custom API errors.

    Args:
        error: APIError instance

    Returns:
        JSON error response with appropriate status code
    """
    logger.warning(
        f"API Error: {error.user_message}",
        extra={
            "error_code": error.error_code,
            "status_code": error.status_code,
            "path": request.path,
            "method": request.method
        }
    )

    response, status_code = get_error_response(error, include_details=app.debug)
    return jsonify(response), status_code


@app.errorhandler(404)
def handle_not_found(error):
    """Handle 404 Not Found errors."""
    logger.warning(
        f"404 Not Found: {request.path}",
        extra={"method": request.method}
    )
    return jsonify({
        "error": "Endpoint not found",
        "code": "NOT_FOUND"
    }), 404


@app.errorhandler(405)
def handle_method_not_allowed(error):
    """Handle 405 Method Not Allowed errors."""
    logger.warning(
        f"405 Method Not Allowed: {request.method} {request.path}"
    )
    return jsonify({
        "error": f"Method {request.method} not allowed for this endpoint",
        "code": "METHOD_NOT_ALLOWED"
    }), 405


@app.errorhandler(Exception)
def handle_unexpected_error(error):
    """
    Handle unexpected errors (bugs).

    Logs full stack trace and returns generic error message to user.
    """
    logger.error(
        f"Unexpected error: {str(error)}",
        exc_info=True,
        extra={
            "path": request.path,
            "method": request.method
        }
    )

    response = {
        "error": "An unexpected error occurred. Please try again later.",
        "code": "INTERNAL_ERROR"
    }

    # Include details in debug mode
    if app.debug:
        response['details'] = str(error)

    return jsonify(response), 500


# ==================== Request Logging ====================

@app.before_request
def log_request_info():
    """Log incoming requests."""
    # Store request start time for duration calculation
    request.start_time = datetime.utcnow()


@app.after_request
def log_response_info(response):
    """Log outgoing responses with duration."""
    # Calculate request duration
    if hasattr(request, 'start_time'):
        duration = (datetime.utcnow() - request.start_time).total_seconds() * 1000
        duration_ms = int(duration)
    else:
        duration_ms = None

    # Don't log health check endpoint (too noisy)
    if request.path != '/':
        log_request(
            logger,
            request.method,
            request.path,
            response.status_code,
            duration_ms=duration_ms
        )

    return response

# Get server configuration from environment
PORT = int(os.getenv('PORT', 5000))


@app.route('/')
def health_check():
    """
    Health check endpoint to verify API is running.

    Returns:
        dict: JSON response with status message
            {
                "message": "LearnFlow API is running"
            }
    """
    return jsonify({'message': 'LearnFlow API is running'})


if __name__ == '__main__':
    print(f"Server running on http://localhost:{PORT}")
    app.run(debug=True, port=PORT)
