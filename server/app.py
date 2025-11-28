"""
LearnFlow Flask Application.

This module initializes and configures the LearnFlow Flask server,
registers API blueprints, and sets up CORS for cross-origin requests.
The application serves as the main entry point for all backend API endpoints.
"""

from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os
from routes import llm_bp, video_bp, user_bp, checkpoint_bp

# Load environment variables from .env file
load_dotenv()

# Initialize Flask application
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Register API blueprints
app.register_blueprint(llm_bp)  # LLM routes (checkpoints, quiz, chat)
app.register_blueprint(video_bp)  # Video routes (CRUD, metadata, transcripts)
app.register_blueprint(user_bp) # User routes (create/update, fetch by Firebase UID)
app.register_blueprint(checkpoint_bp)  # Checkpoint completion routes

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
