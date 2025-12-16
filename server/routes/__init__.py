"""
Routes module for LearnFlow.
Contains API route blueprints.
"""

# Import all route blueprints
from .checkpoint_routes import checkpoint_bp
from .chat_routes import chat_bp
from .quiz_routes import quiz_bp
from .summary_routes import summary_bp
from .checkpoint_progress_routes import checkpoint_progress_bp
from .health_routes import health_bp
from .video_routes import video_bp
from .user_routes import user_bp
from .progress_routes import progress_bp

__all__ = [
    'checkpoint_bp',
    'chat_bp',
    'quiz_bp',
    'summary_bp',
    'checkpoint_progress_bp',
    'health_bp',
    'video_bp',
    'user_bp',
    'progress_bp'
]
