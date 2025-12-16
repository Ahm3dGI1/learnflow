"""
Routes module for LearnFlow.
Contains API route blueprints.
"""

from .llm_routes import llm_bp
from .video_routes import video_bp
from .user_routes import user_bp
from .progress_routes import progress_bp
from .learning_report_routes import learning_report_bp

__all__ = ['llm_bp', 'video_bp', 'user_bp', 'progress_bp', 'learning_report_bp']
