"""
Chat interface routes for LearnFlow AI tutor.
Handles chat message sending, streaming, and history retrieval.
"""

from flask import Blueprint, request, jsonify, Response, g
from database import SessionLocal
from services import (
    generate_chat_response,
    generate_chat_response_stream,
    save_chat_message,
    get_chat_history,
    generate_session_id
)
from models import User, Video
from middleware.auth import auth_required
from middleware.rate_limit import rate_limit
from utils.logger import get_logger

# Configure logging
logger = get_logger(__name__)

# Blueprint for chat routes
chat_bp = Blueprint('chat', __name__, url_prefix='/api/llm')


@chat_bp.route('/chat/send', methods=['POST'])
@auth_required
@rate_limit(max_requests=10, window_seconds=60, scope='user')
def chat_route():
    """
    Send message to AI tutor and get response.
    
    Requires authentication via Firebase ID token in Authorization header.

    Request Body:
        {
            "userId": 1,
            "videoId": "abc123",
            "message": "I don't understand why...",
            "videoContext": {
                "videoId": "abc123",
                "transcriptSnippet": "relevant transcript...",
                "language": "en"
            },
            "timestamp": "05:30",
            "sessionId": "optional-session-id"
        }

    Returns:
        {
            "response": "AI tutor response...",
            "videoId": "abc123",
            "timestamp": "05:30",
            "sessionId": "session-uuid"
        }

    Status Codes:
        200: Success
        400: Invalid request data
        401: Unauthorized
        404: User or video not found
        500: Internal server error
    """
    db = SessionLocal()
    try:
        data = request.get_json()

        if not data:
            return jsonify({'error': 'No data provided'}), 400

        user_id = data.get('userId')
        video_youtube_id = data.get('videoId')
        message = data.get('message')
        video_context = data.get('videoContext', {})
        timestamp = data.get('timestamp')
        session_id = data.get('sessionId')

        # Validation
        if not message:
            return jsonify({'error': 'message is required'}), 400
        if len(message) > 10000:  # Limit message to 10,000 characters
            return jsonify({'error': 'message exceeds maximum length of 10,000 characters'}), 400
        if not video_youtube_id:
            return jsonify({'error': 'videoId is required'}), 400

        # Get authenticated user from Firebase token
        firebase_uid = g.firebase_user.get('uid')
        if not firebase_uid:
            return jsonify({'error': 'Unauthorized: Firebase UID not found'}), 401
        
        user = db.query(User).filter_by(firebase_uid=firebase_uid).first()
        if not user:
            return jsonify({'error': 'User profile not found. Please complete onboarding.'}), 404
        
        user_id = user.id

        # Get or create video
        video = db.query(Video).filter_by(youtube_video_id=video_youtube_id).first()
        if not video:
            return jsonify({'error': 'Video not found'}), 404

        # Generate session ID if not provided
        if not session_id:
            session_id = generate_session_id()

        # Save user message
        save_chat_message(
            user_id=user_id,
            video_id=video.id,
            role='user',
            message=message,
            session_id=session_id,
            timestamp_context=timestamp
        )

        # Generate chat response
        response = generate_chat_response(
            message=message,
            video_context=video_context,
            timestamp=timestamp
        )

        # Save assistant response
        save_chat_message(
            user_id=user_id,
            video_id=video.id,
            role='assistant',
            message=response['response'],
            session_id=session_id,
            timestamp_context=timestamp
        )

        # Add session ID to response
        response['sessionId'] = session_id

        return jsonify(response), 200

    except ValueError as e:
        # ValueError messages are safe to expose (validation errors only)
        logger.warning(f"Validation error in chat: {str(e)}")
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f"Error generating chat response: {str(e)}", exc_info=True)
        return jsonify({'error': 'Failed to generate chat response'}), 500
    finally:
        db.close()


@chat_bp.route('/chat/stream', methods=['POST'])
@auth_required
@rate_limit(max_requests=10, window_seconds=60, scope='user')
def chat_stream_route():
    """
    Send message to AI tutor and get streaming response.
    
    Requires authentication via Firebase ID token in Authorization header.

    Request Body: Same as /chat/send

    Returns: Text stream

    Status Codes:
        200: Success (streaming)
        400: Invalid request data
        401: Unauthorized
        404: User or video not found
        500: Internal server error
    """
    db = SessionLocal()
    try:
        data = request.get_json()

        if not data:
            return jsonify({'error': 'No data provided'}), 400

        user_id = data.get('userId')
        video_youtube_id = data.get('videoId')
        message = data.get('message')
        video_context = data.get('videoContext', {})
        timestamp = data.get('timestamp')
        session_id = data.get('sessionId')

        # Validation
        if not message:
            return jsonify({'error': 'message is required'}), 400
        if len(message) > 10000:  # Limit message to 10,000 characters
            return jsonify({'error': 'message exceeds maximum length of 10,000 characters'}), 400
        if not video_youtube_id:
            return jsonify({'error': 'videoId is required'}), 400

        # Get authenticated user from Firebase token
        firebase_uid = g.firebase_user.get('uid')
        if not firebase_uid:
            return jsonify({'error': 'Unauthorized: Firebase UID not found'}), 401
        
        user = db.query(User).filter_by(firebase_uid=firebase_uid).first()
        if not user:
            return jsonify({'error': 'User profile not found. Please complete onboarding.'}), 404
        
        user_id = user.id

        # Get video
        video = db.query(Video).filter_by(youtube_video_id=video_youtube_id).first()
        if not video:
            return jsonify({'error': 'Video not found'}), 404

        # Generate session ID if not provided
        if not session_id:
            session_id = generate_session_id()

        # Save user message
        save_chat_message(
            user_id=user_id,
            video_id=video.id,
            role='user',
            message=message,
            session_id=session_id,
            timestamp_context=timestamp
        )

        # Generate streaming response and collect it
        full_response = []
        error_occurred = False

        def generate():
            nonlocal error_occurred
            try:
                for chunk in generate_chat_response_stream(
                    message=message,
                    video_context=video_context,
                    timestamp=timestamp
                ):
                    full_response.append(chunk)
                    yield chunk

                # Save assistant response after streaming completes successfully
                if full_response:
                    save_chat_message(
                        user_id=user_id,
                        video_id=video.id,
                        role='assistant',
                        message=''.join(full_response),
                        session_id=session_id,
                        timestamp_context=timestamp
                    )
            except Exception as e:
                error_occurred = True
                error_message = f"[Error: Failed to generate response - {str(e)}]"
                yield f"\n{error_message}"

                # Save error message as assistant response for consistency
                try:
                    save_chat_message(
                        user_id=user_id,
                        video_id=video.id,
                        role='assistant',
                        message=error_message,
                        session_id=session_id,
                        timestamp_context=timestamp
                    )
                except Exception as save_error:
                    logger.error(f"Failed to save error message: {str(save_error)}")

        return Response(generate(), mimetype='text/plain'), 200

    except ValueError as e:
        # ValueError messages are safe to expose (validation errors only)
        logger.warning(f"Validation error in chat stream: {str(e)}")
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(
            f"Error generating streaming chat response: {str(e)}",
            exc_info=True
        )
        return jsonify({'error': 'Failed to generate streaming chat response'}), 500
    finally:
        db.close()


@chat_bp.route('/chat/history/<video_id>', methods=['GET'])
@auth_required
def get_chat_history_route(video_id):
    """
    Get chat history for a specific video.
    
    Requires authentication via Firebase ID token in Authorization header.
    
    URL Parameters:
        video_id (str): YouTube video ID
    
    Query Parameters:
        userId (int): User ID
        limit (int, optional): Maximum number of messages to return (default: 50)
    
    Returns:
        {
            "videoId": "abc123",
            "messages": [
                {
                    "id": 1,
                    "role": "user",
                    "message": "What is photosynthesis?",
                    "timestamp_context": "05:30",
                    "session_id": "uuid",
                    "created_at": "2025-12-10T10:30:00"
                },
                ...
            ],
            "totalMessages": 10
        }
    
    Status Codes:
        200: Success
        400: Invalid request parameters
        401: Unauthorized
        404: User or video not found
        500: Internal server error
    """
    db = SessionLocal()
    try:
        user_id = request.args.get('userId', type=int)
        limit = request.args.get('limit', type=int, default=50)

        # Validation
        if limit is not None and (limit <= 0 or limit > 1000):
            return jsonify({'error': 'limit must be between 1 and 1000'}), 400
        
        # Get authenticated user from Firebase token
        firebase_uid = g.firebase_user.get('uid')
        if not firebase_uid:
            return jsonify({'error': 'Unauthorized: Firebase UID not found'}), 401
        
        user = db.query(User).filter_by(firebase_uid=firebase_uid).first()
        if not user:
            return jsonify({'error': 'User profile not found. Please complete onboarding.'}), 404
        
        user_id = user.id
        
        # Get video
        video = db.query(Video).filter_by(youtube_video_id=video_id).first()
        if not video:
            return jsonify({'error': 'Video not found'}), 404
        
        # Get chat history
        messages = get_chat_history(
            video_id=video.id,
            user_id=user_id,
            limit=limit
        )
        
        return jsonify({
            'videoId': video_id,
            'messages': messages,
            'totalMessages': len(messages)
        }), 200
        
    except ValueError as e:
        logger.warning(f"Validation error in get chat history: {str(e)}")
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f"Error retrieving chat history: {str(e)}", exc_info=True)
        return jsonify({'error': 'Failed to retrieve chat history'}), 500
    finally:
        db.close()
