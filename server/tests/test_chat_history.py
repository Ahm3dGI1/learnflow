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

    @patch('routes.llm_routes.generate_chat_response')
    def test_send_chat_ignores_body_user_and_uses_auth(self, mock_generate, client, test_data, session):
        """Server should ignore userId in body and use authenticated Firebase UID."""
        # Mock LLM response
        mock_generate.return_value = {
            'response': 'This is the AI response',
            'videoId': test_data['video'].youtube_video_id,
            'timestamp': None
        }

        unique_id = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))

        claims = {
            'uid': f'different-firebase-uid-{unique_id}',
            'email': f'different-{unique_id}@example.com',
            'name': 'Different User'
        }

        # Create user matching the authenticated Firebase UID
        other_user = User(
            firebase_uid=claims['uid'],
            email=claims['email'],
            display_name=claims['name']
        )
        session.add(other_user)
        session.commit()

        with patch(VERIFY_PATCH_PATH, return_value=claims):
            response = client.post(
                '/api/llm/chat/send',
                headers={'Authorization': 'Bearer faketoken'},
                json={
                    'userId': test_data['user'].id,  # Should be ignored
                    'videoId': test_data['video'].youtube_video_id,
                    'message': 'Test message'
                }
            )

        assert response.status_code == 200
        data = response.get_json()
        assert 'response' in data
        assert 'sessionId' in data

        # Ensure message stored under authenticated user
        messages = session.query(ChatMessage).filter_by(user_id=other_user.id).all()
        assert any(msg.message == 'Test message' for msg in messages)

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
        
        assert 'data' in data
        assert 'videoId' in data
        assert 'pagination' in data
        assert data['videoId'] == test_data['video'].youtube_video_id
        assert data['pagination']['total'] == 3
        assert len(data['data']) == 3
        
        # Check message order (should be ascending by creation time)
        assert data['data'][0]['role'] == 'user'
        assert data['data'][0]['message'] == 'What is photosynthesis?'
        assert data['data'][1]['role'] == 'assistant'
        assert data['data'][2]['role'] == 'user'
        assert data['data'][2]['message'] == 'Can you explain it in simpler terms?'

    def test_get_history_no_userId(self, client, test_data):
        """Server should use authenticated user when userId is omitted."""
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

        assert response.status_code == 200
        data = response.get_json()
        assert 'data' in data
        assert len(data['data']) == 3

    def test_get_history_unauthorized(self, client, test_data):
        """Test get history without authentication."""
        response = client.get(
            f'/api/llm/chat/history/{test_data["video"].youtube_video_id}?userId={test_data["user"].id}'
        )

        assert response.status_code == 401

    def test_get_history_wrong_user(self, client, test_data, session):
        """Authenticated user should see only their own history; body userId is ignored."""
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

        assert response.status_code == 200
        data = response.get_json()
        assert data['data'] == []

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
        assert 'pagination' in data
        assert data['pagination']['total'] == 0
        assert len(data['data']) == 0

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
        assert 'pagination' in data
        assert len(data['data']) == 2
        assert data['pagination']['limit'] == 2
        assert data['pagination']['total'] == 3


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


class TestChatHistoryPagination:
    """Tests for chat history pagination features."""

    def test_pagination_with_offset(self, client, test_data, session):
        """Test pagination with offset parameter to fetch different pages."""
        # Add more messages to test pagination (we already have 3)
        for i in range(22):
            msg = ChatMessage(
                user_id=test_data['user'].id,
                video_id=test_data['video'].id,
                role='user' if i % 2 == 0 else 'assistant',
                message=f'Message {i + 4}',
                session_id=test_data['session_id'],
                timestamp_context='10:00',
                created_at=datetime.now(timezone.utc)
            )
            session.add(msg)
        session.commit()

        claims = {
            'uid': test_data['user'].firebase_uid,
            'email': test_data['user'].email,
            'name': test_data['user'].display_name
        }

        # Fetch page 1 (first 10)
        with patch(VERIFY_PATCH_PATH, return_value=claims):
            response = client.get(
                f'/api/llm/chat/history/{test_data["video"].youtube_video_id}?limit=10&offset=0',
                headers={'Authorization': 'Bearer faketoken'}
            )

        assert response.status_code == 200
        data = response.get_json()
        assert 'pagination' in data
        assert data['pagination']['total'] == 25
        assert data['pagination']['limit'] == 10
        assert data['pagination']['offset'] == 0
        assert data['pagination']['hasMore'] is True
        assert len(data['data']) == 10

        # Fetch page 2 (next 10)
        with patch(VERIFY_PATCH_PATH, return_value=claims):
            response = client.get(
                f'/api/llm/chat/history/{test_data["video"].youtube_video_id}?limit=10&offset=10',
                headers={'Authorization': 'Bearer faketoken'}
            )

        assert response.status_code == 200
        data = response.get_json()
        assert data['pagination']['total'] == 25
        assert data['pagination']['limit'] == 10
        assert data['pagination']['offset'] == 10
        assert data['pagination']['hasMore'] is True
        assert len(data['data']) == 10

        # Fetch page 3 (last 5)
        with patch(VERIFY_PATCH_PATH, return_value=claims):
            response = client.get(
                f'/api/llm/chat/history/{test_data["video"].youtube_video_id}?limit=10&offset=20',
                headers={'Authorization': 'Bearer faketoken'}
            )

        assert response.status_code == 200
        data = response.get_json()
        assert data['pagination']['total'] == 25
        assert data['pagination']['limit'] == 10
        assert data['pagination']['offset'] == 20
        assert data['pagination']['hasMore'] is False
        assert len(data['data']) == 5

    def test_pagination_hasMore_flag(self, client, test_data, session):
        """Test that hasMore flag is correctly set."""
        # Add more messages (we have 3, add 12 more for total of 15)
        for i in range(12):
            msg = ChatMessage(
                user_id=test_data['user'].id,
                video_id=test_data['video'].id,
                role='user' if i % 2 == 0 else 'assistant',
                message=f'Extra message {i + 1}',
                session_id=test_data['session_id'],
                timestamp_context='11:00',
                created_at=datetime.now(timezone.utc)
            )
            session.add(msg)
        session.commit()

        claims = {
            'uid': test_data['user'].firebase_uid,
            'email': test_data['user'].email,
            'name': test_data['user'].display_name
        }

        # Test hasMore=True when there's more data
        with patch(VERIFY_PATCH_PATH, return_value=claims):
            response = client.get(
                f'/api/llm/chat/history/{test_data["video"].youtube_video_id}?limit=10&offset=0',
                headers={'Authorization': 'Bearer faketoken'}
            )

        assert response.status_code == 200
        data = response.get_json()
        assert data['pagination']['hasMore'] is True

        # Test hasMore=False when we're at the end
        with patch(VERIFY_PATCH_PATH, return_value=claims):
            response = client.get(
                f'/api/llm/chat/history/{test_data["video"].youtube_video_id}?limit=10&offset=10',
                headers={'Authorization': 'Bearer faketoken'}
            )

        assert response.status_code == 200
        data = response.get_json()
        assert data['pagination']['hasMore'] is False
        assert len(data['data']) == 5

        # Test hasMore=False when fetching all at once
        with patch(VERIFY_PATCH_PATH, return_value=claims):
            response = client.get(
                f'/api/llm/chat/history/{test_data["video"].youtube_video_id}?limit=20&offset=0',
                headers={'Authorization': 'Bearer faketoken'}
            )

        assert response.status_code == 200
        data = response.get_json()
        assert data['pagination']['hasMore'] is False
        assert len(data['data']) == 15

    def test_pagination_offset_beyond_total(self, client, test_data):
        """Test pagination when offset is beyond total count."""
        claims = {
            'uid': test_data['user'].firebase_uid,
            'email': test_data['user'].email,
            'name': test_data['user'].display_name
        }

        # Request offset beyond total (we only have 3 messages from test_data)
        with patch(VERIFY_PATCH_PATH, return_value=claims):
            response = client.get(
                f'/api/llm/chat/history/{test_data["video"].youtube_video_id}?limit=10&offset=100',
                headers={'Authorization': 'Bearer faketoken'}
            )

        assert response.status_code == 200
        data = response.get_json()
        assert data['pagination']['total'] == 3
        assert data['pagination']['offset'] == 100
        assert data['pagination']['hasMore'] is False
        assert len(data['data']) == 0

    def test_pagination_invalid_limit(self, client, test_data):
        """Test validation of limit parameter."""
        claims = {
            'uid': test_data['user'].firebase_uid,
            'email': test_data['user'].email,
            'name': test_data['user'].display_name
        }

        # Test limit = 0
        with patch(VERIFY_PATCH_PATH, return_value=claims):
            response = client.get(
                f'/api/llm/chat/history/{test_data["video"].youtube_video_id}?limit=0',
                headers={'Authorization': 'Bearer faketoken'}
            )

        assert response.status_code == 400
        assert 'Invalid limit parameter. Must be between 1 and 1000.' in response.get_json()['error']

        # Test limit > 1000
        with patch(VERIFY_PATCH_PATH, return_value=claims):
            response = client.get(
                f'/api/llm/chat/history/{test_data["video"].youtube_video_id}?limit=1001',
                headers={'Authorization': 'Bearer faketoken'}
            )

        assert response.status_code == 400
        assert 'Invalid limit parameter. Must be between 1 and 1000.' in response.get_json()['error']

        # Test negative limit
        with patch(VERIFY_PATCH_PATH, return_value=claims):
            response = client.get(
                f'/api/llm/chat/history/{test_data["video"].youtube_video_id}?limit=-5',
                headers={'Authorization': 'Bearer faketoken'}
            )

        assert response.status_code == 400
        assert 'Invalid limit parameter. Must be between 1 and 1000.' in response.get_json()['error']

    def test_pagination_invalid_offset(self, client, test_data):
        """Test validation of offset parameter."""
        claims = {
            'uid': test_data['user'].firebase_uid,
            'email': test_data['user'].email,
            'name': test_data['user'].display_name
        }

        # Test negative offset
        with patch(VERIFY_PATCH_PATH, return_value=claims):
            response = client.get(
                f'/api/llm/chat/history/{test_data["video"].youtube_video_id}?offset=-10',
                headers={'Authorization': 'Bearer faketoken'}
            )

        assert response.status_code == 400
        assert 'Invalid offset parameter. Must be >= 0.' in response.get_json()['error']

    def test_pagination_default_values(self, client, test_data, session):
        """Test that default pagination values are applied correctly."""
        # Add messages to go over default limit (we have 3, add 27 more for 30 total)
        for i in range(27):
            msg = ChatMessage(
                user_id=test_data['user'].id,
                video_id=test_data['video'].id,
                role='user' if i % 2 == 0 else 'assistant',
                message=f'Default test message {i + 1}',
                session_id=test_data['session_id'],
                timestamp_context='12:00',
                created_at=datetime.now(timezone.utc)
            )
            session.add(msg)
        session.commit()

        claims = {
            'uid': test_data['user'].firebase_uid,
            'email': test_data['user'].email,
            'name': test_data['user'].display_name
        }

        # Request without limit/offset params
        with patch(VERIFY_PATCH_PATH, return_value=claims):
            response = client.get(
                f'/api/llm/chat/history/{test_data["video"].youtube_video_id}',
                headers={'Authorization': 'Bearer faketoken'}
            )

        assert response.status_code == 200
        data = response.get_json()
        assert data['pagination']['limit'] == 20  # Default limit
        assert data['pagination']['offset'] == 0  # Default offset
        assert data['pagination']['total'] == 30
        assert data['pagination']['hasMore'] is True
        assert len(data['data']) == 20
