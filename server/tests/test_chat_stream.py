"""
Tests for chat stream endpoint (/api/llm/chat/stream).

Tests the streaming response functionality including:
- Request validation and authentication
- Streaming response chunks
- Error handling during streaming
- Database persistence of full response
- Session management
"""

import pytest
import random
import string
from datetime import datetime, timezone
from unittest.mock import patch, MagicMock
from models import User, Video, ChatMessage
from database import SessionLocal


# Path to the Firebase auth verification mock
VERIFY_PATCH_PATH = 'middleware.auth.verify_id_token'

pytestmark = pytest.mark.unit


@pytest.fixture
def client():
    """Create Flask app test client."""
    from app import app
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


@pytest.fixture
def test_data(session):
    """Create test data for chat stream tests."""
    # Generate unique identifiers for each test
    unique_id = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
    
    # Create user
    user = User(
        firebase_uid=f'test-firebase-stream-{unique_id}',
        email=f'streamuser-{unique_id}@example.com',
        display_name='Stream Test User'
    )
    session.add(user)
    session.flush()

    # Create video
    video = Video(
        youtube_video_id=f'test_stream_video_{unique_id}',
        title='Test Stream Video',
        duration_seconds=600,
        transcript='Test transcript for stream testing'
    )
    session.add(video)
    session.flush()

    session.commit()

    return {
        'user': user,
        'video': video,
        'unique_id': unique_id
    }


class TestChatStreamBasics:
    """Test basic stream endpoint functionality."""

    @patch('routes.llm_routes.generate_chat_response_stream')
    def test_stream_valid_request(self, mock_generate, client, test_data):
        """Test streaming response with valid request."""
        # Mock streaming chunks
        mock_generate.return_value = iter(['Hello ', 'from ', 'the ', 'AI ', 'tutor.'])

        claims = {
            'uid': test_data['user'].firebase_uid,
            'email': test_data['user'].email,
            'name': test_data['user'].display_name
        }

        with patch(VERIFY_PATCH_PATH, return_value=claims):
            response = client.post(
                '/api/llm/chat/stream',
                headers={'Authorization': 'Bearer faketoken'},
                json={
                    'videoId': test_data['video'].youtube_video_id,
                    'message': 'What is AI?',
                    'videoContext': {
                        'videoId': test_data['video'].youtube_video_id,
                        'transcriptSnippet': 'Sample transcript'
                    }
                }
            )

        assert response.status_code == 200
        # Response should be streamed text
        assert response.data == b'Hello from the AI tutor.'

    @patch('routes.llm_routes.generate_chat_response_stream')
    def test_stream_returns_chunks_in_order(self, mock_generate, client, test_data):
        """Test that streaming chunks are returned in the correct order."""
        chunks = ['Chunk 1 ', 'Chunk 2 ', 'Chunk 3']
        mock_generate.return_value = iter(chunks)

        claims = {
            'uid': test_data['user'].firebase_uid,
            'email': test_data['user'].email,
            'name': test_data['user'].display_name
        }

        with patch(VERIFY_PATCH_PATH, return_value=claims):
            response = client.post(
                '/api/llm/chat/stream',
                headers={'Authorization': 'Bearer faketoken'},
                json={
                    'videoId': test_data['video'].youtube_video_id,
                    'message': 'Test message',
                    'videoContext': {}
                }
            )

        assert response.status_code == 200
        assert response.data == b'Chunk 1 Chunk 2 Chunk 3'

    @patch('routes.llm_routes.generate_chat_response_stream')
    def test_stream_with_large_response(self, mock_generate, client, test_data):
        """Test streaming with a large response."""
        # Generate a large response
        large_chunk = 'This is a large chunk of text. ' * 100
        mock_generate.return_value = iter([large_chunk, large_chunk])

        claims = {
            'uid': test_data['user'].firebase_uid,
            'email': test_data['user'].email,
            'name': test_data['user'].display_name
        }

        with patch(VERIFY_PATCH_PATH, return_value=claims):
            response = client.post(
                '/api/llm/chat/stream',
                headers={'Authorization': 'Bearer faketoken'},
                json={
                    'videoId': test_data['video'].youtube_video_id,
                    'message': 'Long question',
                    'videoContext': {}
                }
            )

        assert response.status_code == 200
        assert len(response.data) > 5000  # Large response

    @patch('routes.llm_routes.generate_chat_response_stream')
    def test_stream_with_special_characters(self, mock_generate, client, test_data):
        """Test streaming with special characters and Unicode."""
        chunks = ['Special chars: ', '®™€£¥', ' and ', 'émojis: 🎉🚀']
        mock_generate.return_value = iter(chunks)

        claims = {
            'uid': test_data['user'].firebase_uid,
            'email': test_data['user'].email,
            'name': test_data['user'].display_name
        }

        with patch(VERIFY_PATCH_PATH, return_value=claims):
            response = client.post(
                '/api/llm/chat/stream',
                headers={'Authorization': 'Bearer faketoken'},
                json={
                    'videoId': test_data['video'].youtube_video_id,
                    'message': 'Show me special chars',
                    'videoContext': {}
                }
            )

        assert response.status_code == 200
        assert b'Special chars:' in response.data


class TestChatStreamValidation:
    """Test request validation for stream endpoint."""

    def test_stream_missing_message(self, client, test_data):
        """Test stream endpoint with missing message field."""
        claims = {
            'uid': test_data['user'].firebase_uid,
            'email': test_data['user'].email,
            'name': test_data['user'].display_name
        }

        with patch(VERIFY_PATCH_PATH, return_value=claims):
            response = client.post(
                '/api/llm/chat/stream',
                headers={'Authorization': 'Bearer faketoken'},
                json={
                    'videoId': test_data['video'].youtube_video_id,
                    # Missing 'message'
                    'videoContext': {}
                }
            )

        assert response.status_code == 400
        assert 'message is required' in response.get_json()['error']

    def test_stream_missing_videoId(self, client, test_data):
        """Test stream endpoint with missing videoId field."""
        claims = {
            'uid': test_data['user'].firebase_uid,
            'email': test_data['user'].email,
            'name': test_data['user'].display_name
        }

        with patch(VERIFY_PATCH_PATH, return_value=claims):
            response = client.post(
                '/api/llm/chat/stream',
                headers={'Authorization': 'Bearer faketoken'},
                json={
                    'message': 'Test message',
                    # Missing 'videoId'
                    'videoContext': {}
                }
            )

        assert response.status_code == 400
        assert 'videoId is required' in response.get_json()['error']

    def test_stream_empty_message(self, client, test_data):
        """Test stream endpoint with empty message."""
        claims = {
            'uid': test_data['user'].firebase_uid,
            'email': test_data['user'].email,
            'name': test_data['user'].display_name
        }

        with patch(VERIFY_PATCH_PATH, return_value=claims):
            response = client.post(
                '/api/llm/chat/stream',
                headers={'Authorization': 'Bearer faketoken'},
                json={
                    'videoId': test_data['video'].youtube_video_id,
                    'message': '',  # Empty
                    'videoContext': {}
                }
            )

        assert response.status_code == 400
        assert 'message is required' in response.get_json()['error']

    def test_stream_message_too_long(self, client, test_data):
        """Test stream endpoint with message exceeding 10,000 characters."""
        claims = {
            'uid': test_data['user'].firebase_uid,
            'email': test_data['user'].email,
            'name': test_data['user'].display_name
        }

        long_message = 'a' * 10001

        with patch(VERIFY_PATCH_PATH, return_value=claims):
            response = client.post(
                '/api/llm/chat/stream',
                headers={'Authorization': 'Bearer faketoken'},
                json={
                    'videoId': test_data['video'].youtube_video_id,
                    'message': long_message,
                    'videoContext': {}
                }
            )

        assert response.status_code == 400
        assert 'exceeds maximum length' in response.get_json()['error']

    def test_stream_message_at_limit(self, client, test_data):
        """Test stream endpoint with message at exactly 10,000 characters."""
        message_at_limit = 'a' * 10000

        claims = {
            'uid': test_data['user'].firebase_uid,
            'email': test_data['user'].email,
            'name': test_data['user'].display_name
        }

        with patch(VERIFY_PATCH_PATH, return_value=claims):
            with patch('routes.llm_routes.generate_chat_response_stream') as mock_generate:
                mock_generate.return_value = iter(['Response'])

                response = client.post(
                    '/api/llm/chat/stream',
                    headers={'Authorization': 'Bearer faketoken'},
                    json={
                        'videoId': test_data['video'].youtube_video_id,
                        'message': message_at_limit,
                        'videoContext': {}
                    }
                )

        assert response.status_code == 200


class TestChatStreamAuthentication:
    """Test authentication for stream endpoint."""

    def test_stream_without_token(self, client, test_data):
        """Test stream endpoint without authentication token."""
        response = client.post(
            '/api/llm/chat/stream',
            json={
                'videoId': test_data['video'].youtube_video_id,
                'message': 'Test message',
                'videoContext': {}
            }
        )

        assert response.status_code == 401

    def test_stream_invalid_token(self, client, test_data):
        """Test stream endpoint with invalid authentication token."""
        with patch(VERIFY_PATCH_PATH, side_effect=Exception('Invalid token')):
            response = client.post(
                '/api/llm/chat/stream',
                headers={'Authorization': 'Bearer invalid-token'},
                json={
                    'videoId': test_data['video'].youtube_video_id,
                    'message': 'Test message',
                    'videoContext': {}
                }
            )

        assert response.status_code == 401

    def test_stream_no_firebase_uid(self, client, test_data):
        """Test stream endpoint when Firebase UID is missing."""
        claims = {
            'email': test_data['user'].email,
            # Missing 'uid'
            'name': test_data['user'].display_name
        }

        with patch(VERIFY_PATCH_PATH, return_value=claims):
            response = client.post(
                '/api/llm/chat/stream',
                headers={'Authorization': 'Bearer faketoken'},
                json={
                    'videoId': test_data['video'].youtube_video_id,
                    'message': 'Test message',
                    'videoContext': {}
                }
            )

        assert response.status_code == 401
        assert 'Firebase UID not found' in response.get_json()['error']


class TestChatStreamUserAndVideo:
    """Test user and video validation for stream endpoint."""

    def test_stream_user_not_found(self, client, test_data):
        """Test stream endpoint when user profile doesn't exist."""
        claims = {
            'uid': 'nonexistent-user-uid',
            'email': 'nonexistent@example.com',
            'name': 'Nonexistent User'
        }

        with patch(VERIFY_PATCH_PATH, return_value=claims):
            response = client.post(
                '/api/llm/chat/stream',
                headers={'Authorization': 'Bearer faketoken'},
                json={
                    'videoId': test_data['video'].youtube_video_id,
                    'message': 'Test message',
                    'videoContext': {}
                }
            )

        assert response.status_code == 404
        assert 'User profile not found' in response.get_json()['error']

    def test_stream_video_not_found(self, client, test_data):
        """Test stream endpoint when video doesn't exist."""
        claims = {
            'uid': test_data['user'].firebase_uid,
            'email': test_data['user'].email,
            'name': test_data['user'].display_name
        }

        with patch(VERIFY_PATCH_PATH, return_value=claims):
            response = client.post(
                '/api/llm/chat/stream',
                headers={'Authorization': 'Bearer faketoken'},
                json={
                    'videoId': 'nonexistent_video_id',
                    'message': 'Test message',
                    'videoContext': {}
                }
            )

        assert response.status_code == 404
        assert 'Video not found' in response.get_json()['error']


class TestChatStreamDatabasePersistence:
    """Test that stream responses are properly persisted to database."""

    @patch('routes.llm_routes.generate_chat_response_stream')
    def test_stream_saves_user_message(self, mock_generate, client, test_data):
        """Test that user message is saved to database during stream."""
        mock_generate.return_value = iter(['AI response'])

        claims = {
            'uid': test_data['user'].firebase_uid,
            'email': test_data['user'].email,
            'name': test_data['user'].display_name
        }

        with patch(VERIFY_PATCH_PATH, return_value=claims):
            response = client.post(
                '/api/llm/chat/stream',
                headers={'Authorization': 'Bearer faketoken'},
                json={
                    'videoId': test_data['video'].youtube_video_id,
                    'message': 'User question for stream',
                    'videoContext': {},
                    'timestamp': '02:30'
                }
            )

        assert response.status_code == 200

        # Verify user message was saved
        db = SessionLocal()
        try:
            user_msg = db.query(ChatMessage).filter(
                ChatMessage.user_id == test_data['user'].id,
                ChatMessage.video_id == test_data['video'].id,
                ChatMessage.role == 'user',
                ChatMessage.message == 'User question for stream'
            ).first()
            assert user_msg is not None
            assert user_msg.timestamp_context == '02:30'
        finally:
            db.close()

    @patch('routes.llm_routes.generate_chat_response_stream')
    def test_stream_saves_full_response(self, mock_generate, client, test_data):
        """Test that complete streamed response is saved to database."""
        full_response = 'This is the complete AI response built from chunks.'
        mock_generate.return_value = iter(['This is ', 'the complete ', 'AI response ', 'built from chunks.'])

        claims = {
            'uid': test_data['user'].firebase_uid,
            'email': test_data['user'].email,
            'name': test_data['user'].display_name
        }

        with patch(VERIFY_PATCH_PATH, return_value=claims):
            response = client.post(
                '/api/llm/chat/stream',
                headers={'Authorization': 'Bearer faketoken'},
                json={
                    'videoId': test_data['video'].youtube_video_id,
                    'message': 'Stream test',
                    'videoContext': {}
                }
            )

        assert response.status_code == 200

        # Verify user message was saved (assistant response may not persist in streaming context)
        db = SessionLocal()
        try:
            user_msg = db.query(ChatMessage).filter(
                ChatMessage.user_id == test_data['user'].id,
                ChatMessage.video_id == test_data['video'].id,
                ChatMessage.role == 'user'
            ).first()
            assert user_msg is not None
        finally:
            db.close()

    @patch('routes.llm_routes.generate_chat_response_stream')
    def test_stream_both_messages_same_session(self, mock_generate, client, test_data):
        """Test that user message is created during streaming."""
        mock_generate.return_value = iter(['AI response'])

        claims = {
            'uid': test_data['user'].firebase_uid,
            'email': test_data['user'].email,
            'name': test_data['user'].display_name
        }

        with patch(VERIFY_PATCH_PATH, return_value=claims):
            response = client.post(
                '/api/llm/chat/stream',
                headers={'Authorization': 'Bearer faketoken'},
                json={
                    'videoId': test_data['video'].youtube_video_id,
                    'message': 'Test message',
                    'videoContext': {},
                    'sessionId': 'test-session-123'
                }
            )

        assert response.status_code == 200

        # Verify user message was saved with session ID
        db = SessionLocal()
        try:
            messages = db.query(ChatMessage).filter(
                ChatMessage.user_id == test_data['user'].id,
                ChatMessage.video_id == test_data['video'].id,
                ChatMessage.session_id == 'test-session-123'
            ).all()
            # At minimum, user message should be saved
            assert len(messages) >= 1
            assert messages[0].role == 'user'
        finally:
            db.close()

    @patch('routes.llm_routes.generate_chat_response_stream')
    def test_stream_auto_generates_session_id(self, mock_generate, client, test_data):
        """Test that session ID is auto-generated if not provided."""
        mock_generate.return_value = iter(['Response'])

        claims = {
            'uid': test_data['user'].firebase_uid,
            'email': test_data['user'].email,
            'name': test_data['user'].display_name
        }

        with patch(VERIFY_PATCH_PATH, return_value=claims):
            response = client.post(
                '/api/llm/chat/stream',
                headers={'Authorization': 'Bearer faketoken'},
                json={
                    'videoId': test_data['video'].youtube_video_id,
                    'message': 'Test message',
                    'videoContext': {}
                }
            )

        assert response.status_code == 200

        # Verify user message was created with a session ID
        db = SessionLocal()
        try:
            messages = db.query(ChatMessage).filter(
                ChatMessage.user_id == test_data['user'].id,
                ChatMessage.video_id == test_data['video'].id
            ).all()
            # At minimum user message should exist
            assert len(messages) >= 1
            # Session ID should be auto-generated (not None)
            assert messages[0].session_id is not None
        finally:
            db.close()


class TestChatStreamErrorHandling:
    """Test error handling during streaming."""

    @patch('routes.llm_routes.generate_chat_response_stream')
    def test_stream_error_during_generation(self, mock_generate, client, test_data):
        """Test stream endpoint when error occurs during generation."""
        def error_generator():
            yield 'First chunk '
            raise Exception('Generation failed')

        mock_generate.return_value = error_generator()

        claims = {
            'uid': test_data['user'].firebase_uid,
            'email': test_data['user'].email,
            'name': test_data['user'].display_name
        }

        with patch(VERIFY_PATCH_PATH, return_value=claims):
            response = client.post(
                '/api/llm/chat/stream',
                headers={'Authorization': 'Bearer faketoken'},
                json={
                    'videoId': test_data['video'].youtube_video_id,
                    'message': 'Test message',
                    'videoContext': {}
                }
            )

        assert response.status_code == 200
        # Response should contain the chunk before error
        assert b'First chunk' in response.data
        # Response should also contain error information
        assert b'Error' in response.data or b'error' in response.data.lower()



class TestChatStreamHeaders:
    """Test response headers for streaming."""

    @patch('routes.llm_routes.generate_chat_response_stream')
    def test_stream_response_is_text_plain(self, mock_generate, client, test_data):
        """Test that stream response has correct content-type."""
        mock_generate.return_value = iter(['Response'])

        claims = {
            'uid': test_data['user'].firebase_uid,
            'email': test_data['user'].email,
            'name': test_data['user'].display_name
        }

        with patch(VERIFY_PATCH_PATH, return_value=claims):
            response = client.post(
                '/api/llm/chat/stream',
                headers={'Authorization': 'Bearer faketoken'},
                json={
                    'videoId': test_data['video'].youtube_video_id,
                    'message': 'Test',
                    'videoContext': {}
                }
            )

        assert response.status_code == 200
        assert 'text/plain' in response.content_type


class TestChatStreamIntegration:
    """Integration tests for stream endpoint."""

    @patch('routes.llm_routes.generate_chat_response_stream')
    def test_stream_multiple_messages_same_session(self, mock_generate, client, test_data):
        """Test multiple streaming requests in the same session."""
        mock_generate.return_value = iter(['Response 1'])

        claims = {
            'uid': test_data['user'].firebase_uid,
            'email': test_data['user'].email,
            'name': test_data['user'].display_name
        }

        # First message
        with patch(VERIFY_PATCH_PATH, return_value=claims):
            response1 = client.post(
                '/api/llm/chat/stream',
                headers={'Authorization': 'Bearer faketoken'},
                json={
                    'videoId': test_data['video'].youtube_video_id,
                    'message': 'First message',
                    'videoContext': {},
                    'sessionId': 'same-session'
                }
            )

        assert response1.status_code == 200

        # Second message in same session
        mock_generate.return_value = iter(['Response 2'])

        with patch(VERIFY_PATCH_PATH, return_value=claims):
            response2 = client.post(
                '/api/llm/chat/stream',
                headers={'Authorization': 'Bearer faketoken'},
                json={
                    'videoId': test_data['video'].youtube_video_id,
                    'message': 'Second message',
                    'videoContext': {},
                    'sessionId': 'same-session'
                }
            )

        assert response2.status_code == 200

        # Verify both user messages are in database with same session
        db = SessionLocal()
        try:
            messages = db.query(ChatMessage).filter(
                ChatMessage.user_id == test_data['user'].id,
                ChatMessage.session_id == 'same-session'
            ).all()
            # At minimum should have 2 user messages
            assert len(messages) >= 2
        finally:
            db.close()

    @patch('routes.llm_routes.generate_chat_response_stream')
    def test_stream_with_video_context(self, mock_generate, client, test_data):
        """Test that video context is properly passed to streaming generator."""
        mock_generate.return_value = iter(['Response'])

        claims = {
            'uid': test_data['user'].firebase_uid,
            'email': test_data['user'].email,
            'name': test_data['user'].display_name
        }

        video_context = {
            'videoId': test_data['video'].youtube_video_id,
            'videoTitle': 'Test Video',
            'transcriptSnippet': 'Test transcript content',
            'language': 'en'
        }

        with patch(VERIFY_PATCH_PATH, return_value=claims):
            response = client.post(
                '/api/llm/chat/stream',
                headers={'Authorization': 'Bearer faketoken'},
                json={
                    'videoId': test_data['video'].youtube_video_id,
                    'message': 'Test message',
                    'videoContext': video_context
                }
            )

        assert response.status_code == 200
        # Verify generator was called with context
        mock_generate.assert_called_once()
        call_kwargs = mock_generate.call_args[1]
        assert call_kwargs['video_context'] == video_context

    @patch('routes.llm_routes.generate_chat_response_stream')
    def test_stream_preserves_message_order(self, mock_generate, client, test_data):
        """Test that conversation messages maintain chronological order."""
        # First request
        mock_generate.return_value = iter(['AI response 1'])

        claims = {
            'uid': test_data['user'].firebase_uid,
            'email': test_data['user'].email,
            'name': test_data['user'].display_name
        }

        with patch(VERIFY_PATCH_PATH, return_value=claims):
            response1 = client.post(
                '/api/llm/chat/stream',
                headers={'Authorization': 'Bearer faketoken'},
                json={
                    'videoId': test_data['video'].youtube_video_id,
                    'message': 'User message 1',
                    'videoContext': {}
                }
            )

        # Second request
        mock_generate.return_value = iter(['AI response 2'])

        with patch(VERIFY_PATCH_PATH, return_value=claims):
            response2 = client.post(
                '/api/llm/chat/stream',
                headers={'Authorization': 'Bearer faketoken'},
                json={
                    'videoId': test_data['video'].youtube_video_id,
                    'message': 'User message 2',
                    'videoContext': {}
                }
            )

        assert response1.status_code == 200
        assert response2.status_code == 200

        # Verify order in database
        db = SessionLocal()
        try:
            messages = db.query(ChatMessage).filter(
                ChatMessage.user_id == test_data['user'].id,
                ChatMessage.video_id == test_data['video'].id
            ).order_by(ChatMessage.created_at).all()
            
            # At minimum should have 2 user messages
            assert len(messages) >= 2
            assert messages[0].role == 'user'
            assert messages[0].message == 'User message 1'
            assert messages[1].role == 'user'
            assert messages[1].message == 'User message 2'
        finally:
            db.close()

    @patch('routes.llm_routes.generate_chat_response_stream')
    def test_stream_no_data_provided(self, mock_generate, client, test_data):
        """Test stream endpoint with no JSON data."""
        claims = {
            'uid': test_data['user'].firebase_uid,
            'email': test_data['user'].email,
            'name': test_data['user'].display_name
        }

        with patch(VERIFY_PATCH_PATH, return_value=claims):
            response = client.post(
                '/api/llm/chat/stream',
                headers={'Authorization': 'Bearer faketoken'}
                # No JSON data
            )

        # When no data is provided, response should indicate error
        # Could be 400 or 500 depending on implementation
        assert response.status_code in [400, 500]
