"""
Routes module for LearnFlow.
Contains API route blueprints.
"""

from .llm_routes import llm_bp
from .video_routes import video_bp

__all__ = ['llm_bp', 'video_bp']
