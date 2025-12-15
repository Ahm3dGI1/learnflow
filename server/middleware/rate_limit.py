"""
Rate limiting middleware for LearnFlow API endpoints.

Provides a decorator to limit the number of requests from users or per video
to prevent abuse and protect API costs.
"""

import time
from functools import wraps
from flask import request, jsonify, g


class RateLimiter:
    """
    Simple in-memory rate limiter using sliding window algorithm.
    
    Tracks request timestamps and enforces limits per key (user or video).
    """
    
    def __init__(self):
        """Initialize rate limiter with empty request storage."""
        # Storage: {key: [timestamp1, timestamp2, ...]}
        self.requests = {}
    
    def is_allowed(self, key, max_requests, window_seconds):
        """
        Check if request is allowed under rate limit.
        
        Args:
            key (str): Identifier (user_id or video_id)
            max_requests (int): Maximum requests allowed
            window_seconds (int): Time window in seconds
        
        Returns:
            tuple: (allowed: bool, retry_after: int or None)
        """
        now = time.time()
        
        # Get existing requests for this key
        if key not in self.requests:
            self.requests[key] = []
        
        # Remove old requests outside the time window
        cutoff = now - window_seconds
        self.requests[key] = [ts for ts in self.requests[key] if ts > cutoff]
        
        # Check if under limit
        if len(self.requests[key]) < max_requests:
            # Allow request and record timestamp
            self.requests[key].append(now)
            return True, None
        else:
            # Rate limit exceeded - calculate retry time
            oldest_request = min(self.requests[key])
            retry_after = int(oldest_request + window_seconds - now) + 1
            return False, retry_after
    
    def clear(self, key=None):
        """
        Clear rate limit data.
        
        Args:
            key (str, optional): Clear specific key, or all if None
        """
        if key:
            self.requests.pop(key, None)
        else:
            self.requests.clear()


# Global rate limiter instance
rate_limiter = RateLimiter()


def rate_limit(max_requests, window_seconds, scope='user'):
    """
    Decorator to enforce rate limiting on endpoints.
    
    Args:
        max_requests (int): Maximum requests allowed in window
        window_seconds (int): Time window in seconds
        scope (str): 'user' to limit per user, 'video' to limit per video
    
    Returns:
        callable: Decorated function with rate limiting
    
    Example:
        @rate_limit(max_requests=10, window_seconds=60, scope='user')
        @auth_required
        def my_endpoint():
            return jsonify({'status': 'ok'})
    """
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            # Determine the rate limit key based on scope
            if scope == 'user':
                # Requires @auth_required decorator before this
                if not hasattr(g, 'firebase_user'):
                    return jsonify({
                        'error': 'Authentication required for rate limiting'
                    }), 401
                
                key = f"user:{g.firebase_user.get('uid')}"
            
            elif scope == 'video':
                # Extract video_id from request body or URL params
                data = request.get_json(silent=True) or {}
                video_id = data.get('videoId') or request.args.get('videoId')
                
                if not video_id:
                    return jsonify({
                        'error': 'videoId required for rate limiting'
                    }), 400
                
                key = f"video:{video_id}"
            
            else:
                return jsonify({'error': 'Invalid rate limit scope'}), 500
            
            # Check rate limit
            allowed, retry_after = rate_limiter.is_allowed(
                key, max_requests, window_seconds
            )
            
            if not allowed:
                return jsonify({
                    'error': 'Rate limit exceeded',
                    'message': f'Too many requests. Please wait {retry_after} seconds.',
                    'retryAfter': retry_after
                }), 429
            
            # Request allowed - proceed
            return f(*args, **kwargs)
        
        return wrapper
    return decorator
