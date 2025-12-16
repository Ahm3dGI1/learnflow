"""
Health check and utility routes for LLM services.
Provides health status and cache size information.
"""

from flask import Blueprint, jsonify
from utils import checkpoint_cache, quiz_cache, summary_cache

# Blueprint for health check routes
health_bp = Blueprint('health', __name__, url_prefix='/api/llm')


@health_bp.route('/health', methods=['GET'])
def health_check():
    """
    Health check endpoint for LLM routes.

    Returns:
        {"status": "ok", "cacheSize": 3}
    """
    return jsonify({
        'status': 'ok',
        'checkpointCacheSize': checkpoint_cache.size(),
        'quizCacheSize': quiz_cache.size(),
        'summaryCacheSize': summary_cache.size()
    }), 200
