"""
Tests for rate limiting middleware.

Tests the RateLimiter class and rate_limit decorator to ensure
proper request throttling and error responses.
"""

import time
import pytest
from unittest.mock import patch
from middleware.rate_limit import RateLimiter, rate_limit, rate_limiter
from middleware.auth import auth_required
from flask import Flask, jsonify


# ========== Test Fixtures ==========

@pytest.fixture
def limiter():
    """Create fresh rate limiter for each test."""
    limiter = RateLimiter()
    yield limiter
    limiter.clear()


@pytest.fixture
def app():
    """Create Flask app for testing decorators."""
    app = Flask(__name__)
    
    # Test endpoint with user-based rate limiting
    @app.route('/test/user')
    @auth_required
    @rate_limit(max_requests=3, window_seconds=10, scope='user')
    def user_endpoint():
        return jsonify({'status': 'ok'})
    
    # Test endpoint with video-based rate limiting
    @app.route('/test/video', methods=['POST'])
    @rate_limit(max_requests=2, window_seconds=10, scope='video')
    def video_endpoint():
        return jsonify({'status': 'ok'})
    
    return app


@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()


# ========== RateLimiter Class Tests ==========

def test_rate_limiter_allows_requests_under_limit(limiter):
    """Test that requests under limit are allowed."""
    key = "user:test123"
    
    # Should allow first 5 requests
    for i in range(5):
        allowed, retry_after = limiter.is_allowed(key, max_requests=5, window_seconds=60)
        assert allowed is True
        assert retry_after is None


def test_rate_limiter_blocks_requests_over_limit(limiter):
    """Test that requests over limit are blocked."""
    key = "user:test123"
    
    # Fill up the limit (3 requests)
    for i in range(3):
        allowed, _ = limiter.is_allowed(key, max_requests=3, window_seconds=60)
        assert allowed is True
    
    # 4th request should be blocked
    allowed, retry_after = limiter.is_allowed(key, max_requests=3, window_seconds=60)
    assert allowed is False
    assert retry_after is not None
    assert retry_after > 0


def test_rate_limiter_resets_after_window(limiter):
    """Test that rate limit resets after time window expires."""
    key = "user:test123"
    
    # Use up all requests (2 allowed)
    limiter.is_allowed(key, max_requests=2, window_seconds=1)
    limiter.is_allowed(key, max_requests=2, window_seconds=1)
    
    # Should be blocked now
    allowed, _ = limiter.is_allowed(key, max_requests=2, window_seconds=1)
    assert allowed is False
    
    # Wait for window to expire
    time.sleep(1.1)
    
    # Should be allowed again
    allowed, retry_after = limiter.is_allowed(key, max_requests=2, window_seconds=1)
    assert allowed is True
    assert retry_after is None


def test_rate_limiter_different_keys_independent(limiter):
    """Test that different keys have independent rate limits."""
    user1 = "user:alice"
    user2 = "user:bob"
    
    # User 1 uses up their limit
    for i in range(3):
        limiter.is_allowed(user1, max_requests=3, window_seconds=60)
    
    # User 1 should be blocked
    allowed, _ = limiter.is_allowed(user1, max_requests=3, window_seconds=60)
    assert allowed is False
    
    # User 2 should still be allowed
    allowed, retry_after = limiter.is_allowed(user2, max_requests=3, window_seconds=60)
    assert allowed is True
    assert retry_after is None


def test_rate_limiter_clear_specific_key(limiter):
    """Test clearing rate limit for specific key."""
    key = "user:test123"
    
    # Use up limit
    for i in range(3):
        limiter.is_allowed(key, max_requests=3, window_seconds=60)
    
    # Should be blocked
    allowed, _ = limiter.is_allowed(key, max_requests=3, window_seconds=60)
    assert allowed is False
    
    # Clear this key
    limiter.clear(key)
    
    # Should be allowed again
    allowed, _ = limiter.is_allowed(key, max_requests=3, window_seconds=60)
    assert allowed is True


def test_rate_limiter_clear_all(limiter):
    """Test clearing all rate limit data."""
    user1 = "user:alice"
    user2 = "user:bob"
    
    # Use up limits for both users
    for i in range(3):
        limiter.is_allowed(user1, max_requests=3, window_seconds=60)
        limiter.is_allowed(user2, max_requests=3, window_seconds=60)
    
    # Clear all
    limiter.clear()
    
    # Both should be allowed again
    allowed1, _ = limiter.is_allowed(user1, max_requests=3, window_seconds=60)
    allowed2, _ = limiter.is_allowed(user2, max_requests=3, window_seconds=60)
    assert allowed1 is True
    assert allowed2 is True


# ========== Decorator Tests ==========

@patch('middleware.auth.verify_id_token')
def test_decorator_user_scope_requires_auth(mock_verify, client):
    """Test that user-scoped rate limit requires authentication."""
    # Mock verify_id_token to raise error (invalid token)
    mock_verify.side_effect = Exception('Invalid token')
    
    # Should return 401
    response = client.get('/test/user', headers={'Authorization': 'Bearer invalid'})
    assert response.status_code == 401
    data = response.get_json()
    assert 'error' in data


@patch('middleware.auth.verify_id_token')
def test_decorator_user_scope_allows_under_limit(mock_verify, client):
    """Test that user-scoped rate limit allows requests under limit."""
    # Mock verify_id_token to return user claims
    mock_verify.return_value = {'uid': 'test_user_123', 'email': 'test@example.com'}
    
    # Clear rate limiter
    rate_limiter.clear()
    
    # First 3 requests should succeed (limit is 3)
    for i in range(3):
        response = client.get('/test/user', headers={'Authorization': 'Bearer valid_token'})
        assert response.status_code == 200


@patch('middleware.auth.verify_id_token')
def test_decorator_user_scope_blocks_over_limit(mock_verify, client):
    """Test that user-scoped rate limit blocks requests over limit."""
    # Mock verify_id_token to return user claims
    mock_verify.return_value = {'uid': 'test_user_456', 'email': 'test@example.com'}
    
    # Clear rate limiter
    rate_limiter.clear()
    
    # Use up limit (3 requests)
    for i in range(3):
        response = client.get('/test/user', headers={'Authorization': 'Bearer valid_token'})
        assert response.status_code == 200
    
    # 4th request should be blocked with 429
    response = client.get('/test/user', headers={'Authorization': 'Bearer valid_token'})
    assert response.status_code == 429
    data = response.get_json()
    assert 'error' in data
    assert data['error'] == 'Rate limit exceeded'
    assert 'retryAfter' in data


def test_decorator_video_scope_requires_video_id(client):
    """Test that video-scoped rate limit requires videoId."""
    # Clear rate limiter
    rate_limiter.clear()
    
    # No videoId - should return 400
    response = client.post('/test/video', json={})
    assert response.status_code == 400
    data = response.get_json()
    assert 'error' in data
    assert 'videoId required' in data['error']


def test_decorator_video_scope_allows_under_limit(client):
    """Test that video-scoped rate limit allows requests under limit."""
    # Clear rate limiter
    rate_limiter.clear()
    
    video_data = {'videoId': 'abc123'}
    
    # First 2 requests should succeed (limit is 2)
    for i in range(2):
        response = client.post('/test/video', json=video_data)
        assert response.status_code == 200


def test_decorator_video_scope_blocks_over_limit(client):
    """Test that video-scoped rate limit blocks requests over limit."""
    # Clear rate limiter
    rate_limiter.clear()
    
    video_data = {'videoId': 'xyz789'}
    
    # Use up limit (2 requests)
    for i in range(2):
        response = client.post('/test/video', json=video_data)
        assert response.status_code == 200
    
    # 3rd request should be blocked
    response = client.post('/test/video', json=video_data)
    assert response.status_code == 429
    data = response.get_json()
    assert data['error'] == 'Rate limit exceeded'
    assert 'retryAfter' in data
    assert data['retryAfter'] > 0


def test_decorator_video_scope_different_videos_independent(client):
    """Test that different videos have independent rate limits."""
    # Clear rate limiter
    rate_limiter.clear()
    
    video1 = {'videoId': 'video1'}
    video2 = {'videoId': 'video2'}
    
    # Use up limit for video1 (2 requests)
    client.post('/test/video', json=video1)
    client.post('/test/video', json=video1)
    
    # video1 should be blocked
    response = client.post('/test/video', json=video1)
    assert response.status_code == 429
    
    # video2 should still be allowed
    response = client.post('/test/video', json=video2)
    assert response.status_code == 200
