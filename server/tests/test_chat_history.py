"""
Tests for chat history persistence endpoints.
"""

import pytest
import random
import string
from datetime import datetime, timezone
from unittest.mock import patch
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
    """Create test data for chat history tests."""
    # Generate unique identifiers for each test
    unique_id = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
    
    # Create user
    user = User(
        firebase_uid=f'test-firebase-chat-{unique_id}',
        email=f'chatuser-{unique_id}@example.com',
        display_name='Chat User'
    )
    session.add(user)
    session.flush()

    # Create video
    video = Video(
        youtube_video_id=f'test_chat_video_{unique_id}',
        title='Test Chat Video',
        duration_seconds=600,
        transcript='Test transcript for chat'
    )
    session.add(video)
    session.flush()

    # Create chat messages
    session_id = 'test-session-123'
    
    msg1 = ChatMessage(
        user_id=user.id,
        video_id=video.id,
        role='user',
        message='What is photosynthesis?',
        session_id=session_id,
        timestamp_context='05:30',
        created_at=datetime.now(timezone.utc)
    )
    session.add(msg1)
    
    msg2 = ChatMessage(
        user_id=user.id,
        video_id=video.id,
        role='assistant',
        message='Photosynthesis is the process by which plants convert light energy into chemical energy.',
        session_id=session_id,
        timestamp_context='05:30',
        created_at=datetime.now(timezone.utc)
    )
    session.add(msg2)
    
    msg3 = ChatMessage(
        user_id=user.id,
        video_id=video.id,
        role='user',
        message='Can you explain it in simpler terms?',
        session_id=session_id,
        timestamp_context='05:35',
        created_at=datetime.now(timezone.utc)
    )
    session.add(msg3)
    
    session.commit()

    return {
        'user': user,
        'video': video,
        'messages': [msg1, msg2, msg3],
        'session_id': session_id
    }


class TestChatSendEndpoint:
    """Tests for POST /api/llm/chat/send endpoint."""

    @patch('routes.llm_routes.generate_chat_response')
    def test_send_chat_success(self, mock_generate, client, test_data, session):
        """Test successful chat message send and save."""
        # Mock LLM response
        mock_generate.return_value = {
            'response': 'This is the AI response',
            'videoId': 'test_chat_video',
            'timestamp': '10:00'
        }

        claims = {
            'uid': test_data['user'].firebase_uid,
            'email': test_data['user'].email,
            'name': test_data['user'].display_name
        }

        with patch(VERIFY_PATCH_PATH, return_value=claims):
            response = client.post(
                '/api/llm/chat/send',
                headers={'Authorization': 'Bearer faketoken'},
                json={
                    'userId': test_data['user'].id,
                    'videoId': test_data['video'].youtube_video_id,
                    'message': 'Test question',
                    'videoContext': {
                        'videoId': 'test_chat_video',
                        'transcriptSnippet': 'relevant text',
                        'language': 'en'
                    },
                    'timestamp': '10:00'
                }
            )

        assert response.status_code == 200
        data = response.get_json()
        assert 'response' in data
        assert 'sessionId' in data
        assert data['response'] == 'This is the AI response'

        # Verify messages were saved to database (filter by the new session ID)
        session_id = data['sessionId']
        messages = session.query(ChatMessage).filter_by(
            user_id=test_data['user'].id,
            video_id=test_data['video'].id,
            session_id=session_id
        ).order_by(ChatMessage.created_at.asc()).all()
        
        assert len(messages) == 2
        assert messages[0].role == 'user'
        assert messages[0].message == 'Test question'
        assert messages[1].role == 'assistant'
        assert messages[1].message == 'This is the AI response'

    def test_send_chat_no_message(self, client, test_data):
        """Test send chat with missing message."""
        claims = {
            'uid': test_data['user'].firebase_uid,
            'email': test_data['user'].email,
            'name': test_data['user'].display_name
        }

        with patch(VERIFY_PATCH_PATH, return_value=claims):
            response = client.post(
                '/api/llm/chat/send',
                headers={'Authorization': 'Bearer faketoken'},
                json={
                    'userId': test_data['user'].id,
                    'videoId': test_data['video'].youtube_video_id,
                    'videoContext': {}
                }
            )

        assert response.status_code == 400
        data = response.get_json()
        assert 'error' in data
        assert 'message is required' in data['error']

    def test_send_chat_unauthorized(self, client, test_data):
        """Test send chat without authentication."""
        response = client.post(
            '/api/llm/chat/send',
            json={
                'userId': test_data['user'].id,
                'videoId': test_data['video'].youtube_video_id,
                'message': 'Test message'
            }
        )

        assert response.status_code == 401

    def test_send_chat_wrong_user(self, client, test_data, session):
        """Test authenticated user trying to send message as another user."""
        # Generate unique identifier for this test
        unique_id = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))

        claims = {
            'uid': f'different-firebase-uid-{unique_id}',
            'email': f'different-{unique_id}@example.com',
            'name': 'Different User'
        }

        # Create different user
        other_user = User(
            firebase_uid=f'different-firebase-uid-{unique_id}',
            email=f'different-{unique_id}@example.com',
            display_name='Different User'
        )
        session.add(other_user)
        session.commit()

        with patch(VERIFY_PATCH_PATH, return_value=claims):
            response = client.post(
                '/api/llm/chat/send',
                headers={'Authorization': 'Bearer faketoken'},
                json={
                    'userId': test_data['user'].id,  # Trying to send as different user
                    'videoId': test_data['video'].youtube_video_id,
                    'message': 'Test message'
                }
            )

        assert response.status_code == 401
        data = response.get_json()
        assert 'Unauthorized' in data['error']

    def test_send_chat_video_not_found(self, client, test_data):
        """Test send chat with non-existent video."""
        claims = {
            'uid': test_data['user'].firebase_uid,
            'email': test_data['user'].email,
            'name': test_data['user'].display_name
        }

        with patch(VERIFY_PATCH_PATH, return_value=claims):
            response = client.post(
                '/api/llm/chat/send',
                headers={'Authorization': 'Bearer faketoken'},
                json={
                    'userId': test_data['user'].id,
                    'videoId': 'nonexistent_video',
                    'message': 'Test message'
                }
            )

        assert response.status_code == 404
        data = response.get_json()
        assert 'Video not found' in data['error']


class TestChatHistoryEndpoint:
    """Tests for GET /api/llm/chat/history/<video_id> endpoint."""

    def test_get_history_success(self, client, test_data):
        """Test successful retrieval of chat history."""
        claims = {
            'uid': test_data['user'].firebase_uid,
            'email': test_data['user'].email,
            'name': test_data['user'].display_name
        }

        with patch(VERIFY_PATCH_PATH, return_value=claims):
            response = client.get(
                f'/api/llm/chat/history/{test_data["video"].youtube_video_id}?userId={test_data["user"].id}',
                headers={'Authorization': 'Bearer faketoken'}
            )

        assert response.status_code == 200
        data = response.get_json()
        
        assert 'messages' in data
        assert 'videoId' in data
        assert 'totalMessages' in data
        assert data['videoId'] == test_data['video'].youtube_video_id
        assert data['totalMessages'] == 3
        assert len(data['messages']) == 3
        
        # Check message order (should be ascending by creation time)
        assert data['messages'][0]['role'] == 'user'
        assert data['messages'][0]['message'] == 'What is photosynthesis?'
        assert data['messages'][1]['role'] == 'assistant'
        assert data['messages'][2]['role'] == 'user'
        assert data['messages'][2]['message'] == 'Can you explain it in simpler terms?'

    def test_get_history_no_userId(self, client, test_data):
        """Test get history without userId parameter."""
        claims = {
            'uid': test_data['user'].firebase_uid,
            'email': test_data['user'].email,
            'name': test_data['user'].display_name
        }

        with patch(VERIFY_PATCH_PATH, return_value=claims):
            response = client.get(
                f'/api/llm/chat/history/{test_data["video"].youtube_video_id}',
                headers={'Authorization': 'Bearer faketoken'}
            )

        assert response.status_code == 400
        data = response.get_json()
        assert 'userId is required' in data['error']

    def test_get_history_unauthorized(self, client, test_data):
        """Test get history without authentication."""
        response = client.get(
            f'/api/llm/chat/history/{test_data["video"].youtube_video_id}?userId={test_data["user"].id}'
        )

        assert response.status_code == 401

    def test_get_history_wrong_user(self, client, test_data, session):
        """Test authenticated user trying to access another user's history."""
        # Generate unique ID for different user
        unique_id = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
        different_firebase_uid = f'different-firebase-{unique_id}'
        different_email = f'different-{unique_id}@example.com'
        
        claims = {
            'uid': different_firebase_uid,
            'email': different_email,
            'name': 'Different User'
        }

        # Create different user
        other_user = User(
            firebase_uid=different_firebase_uid,
            email=different_email,
            display_name='Different User'
        )
        session.add(other_user)
        session.commit()

        with patch(VERIFY_PATCH_PATH, return_value=claims):
            response = client.get(
                f'/api/llm/chat/history/{test_data["video"].youtube_video_id}?userId={test_data["user"].id}',
                headers={'Authorization': 'Bearer faketoken'}
            )

        assert response.status_code == 401
        data = response.get_json()
        assert 'Unauthorized' in data['error']

    def test_get_history_video_not_found(self, client, test_data):
        """Test get history for non-existent video."""
        claims = {
            'uid': test_data['user'].firebase_uid,
            'email': test_data['user'].email,
            'name': test_data['user'].display_name
        }

        with patch(VERIFY_PATCH_PATH, return_value=claims):
            response = client.get(
                f'/api/llm/chat/history/nonexistent_video?userId={test_data["user"].id}',
                headers={'Authorization': 'Bearer faketoken'}
            )

        assert response.status_code == 404
        data = response.get_json()
        assert 'Video not found' in data['error']

    def test_get_history_empty(self, client, test_data, session):
        """Test get history when no messages exist."""
        # Generate unique identifier for this test
        unique_id = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))

        # Create a new video with no messages
        new_video = Video(
            youtube_video_id=f'empty_chat_video_{unique_id}',
            title='Empty Chat Video',
            duration_seconds=300,
            transcript='Empty transcript'
        )
        session.add(new_video)
        session.commit()

        claims = {
            'uid': test_data['user'].firebase_uid,
            'email': test_data['user'].email,
            'name': test_data['user'].display_name
        }

        with patch(VERIFY_PATCH_PATH, return_value=claims):
            response = client.get(
                f'/api/llm/chat/history/{new_video.youtube_video_id}?userId={test_data["user"].id}',
                headers={'Authorization': 'Bearer faketoken'}
            )

        assert response.status_code == 200
        data = response.get_json()
        assert data['totalMessages'] == 0
        assert len(data['messages']) == 0

    def test_get_history_with_limit(self, client, test_data):
        """Test get history with limit parameter."""
        claims = {
            'uid': test_data['user'].firebase_uid,
            'email': test_data['user'].email,
            'name': test_data['user'].display_name
        }

        with patch(VERIFY_PATCH_PATH, return_value=claims):
            response = client.get(
                f'/api/llm/chat/history/{test_data["video"].youtube_video_id}?userId={test_data["user"].id}&limit=2',
                headers={'Authorization': 'Bearer faketoken'}
            )

        assert response.status_code == 200
        data = response.get_json()
        assert len(data['messages']) == 2
        assert data['totalMessages'] == 2


class TestSessionIdGeneration:
    """Tests for session ID generation."""

    @patch('routes.llm_routes.generate_chat_response')
    def test_session_id_generated_if_not_provided(self, mock_generate, client, test_data):
        """Test that session ID is auto-generated if not provided."""
        mock_generate.return_value = {
            'response': 'AI response',
            'videoId': 'test_chat_video',
            'timestamp': '10:00'
        }

        claims = {
            'uid': test_data['user'].firebase_uid,
            'email': test_data['user'].email,
            'name': test_data['user'].display_name
        }

        with patch(VERIFY_PATCH_PATH, return_value=claims):
            response = client.post(
                '/api/llm/chat/send',
                headers={'Authorization': 'Bearer faketoken'},
                json={
                    'userId': test_data['user'].id,
                    'videoId': test_data['video'].youtube_video_id,
                    'message': 'Test message',
                    'videoContext': {}
                    # No sessionId provided
                }
            )

        assert response.status_code == 200
        data = response.get_json()
        assert 'sessionId' in data
        assert data['sessionId'] is not None
        assert len(data['sessionId']) > 0

    @patch('routes.llm_routes.generate_chat_response')
    def test_session_id_preserved_if_provided(self, mock_generate, client, test_data):
        """Test that provided session ID is preserved."""
        mock_generate.return_value = {
            'response': 'AI response',
            'videoId': 'test_chat_video',
            'timestamp': '10:00'
        }

        custom_session_id = 'custom-session-456'
        claims = {
            'uid': test_data['user'].firebase_uid,
            'email': test_data['user'].email,
            'name': test_data['user'].display_name
        }

        with patch(VERIFY_PATCH_PATH, return_value=claims):
            response = client.post(
                '/api/llm/chat/send',
                headers={'Authorization': 'Bearer faketoken'},
                json={
                    'userId': test_data['user'].id,
                    'videoId': test_data['video'].youtube_video_id,
                    'message': 'Test message',
                    'videoContext': {},
                    'sessionId': custom_session_id
                }
            )

        assert response.status_code == 200
        data = response.get_json()
        assert data['sessionId'] == custom_session_id
