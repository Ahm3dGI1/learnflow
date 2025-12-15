"""
Chat service for LearnFlow AI tutor.
Handles business logic for conversational tutoring interactions.
"""

import uuid
from datetime import datetime, timezone

from llm import get_client
from prompts.chat_prompt import get_chat_prompt
from prompts.system import system_instructions
from models import ChatMessage
from database import SessionLocal


# Limit transcript length placed into system message to protect token usage
TRANSCRIPT_MAX_CHARS = 12000


def build_system_instruction(video_context):
    """
    Combine the base system instructions with optional video transcript context.

    Args:
        video_context (dict): Context containing fullTranscript or transcriptSnippet.

    Returns:
        str: System instruction string passed to the LLM.
    """
    transcript = video_context.get('fullTranscript') or video_context.get('transcriptSnippet') or ''
    if isinstance(transcript, list):
        transcript = ' '.join([str(t) for t in transcript])

    transcript_text = str(transcript).strip()
    if not transcript_text:
        return system_instructions

    truncated = transcript_text[:TRANSCRIPT_MAX_CHARS]
    if len(transcript_text) > TRANSCRIPT_MAX_CHARS:
        truncated += "\n[Transcript truncated for length]"

    language_hint = video_context.get('language')
    language_line = f"Language: {language_hint}" if language_hint else ""

    return f"""{system_instructions}

Video Transcript Context
{language_line}
{truncated}
"""


def generate_chat_response(message, video_context, timestamp=None):
    """
    Generate AI tutor response to student message.

    Args:
        message (str): Student's message/question
        video_context (dict): Video context including:
            {
                "videoId": "abc123",
                "transcriptSnippet": "relevant transcript text...",
                "language": "en"
            }
        timestamp (str, optional): Current video timestamp (MM:SS format)

    Returns:
        dict: Chat response
            {
                "response": "AI tutor's response text",
                "videoId": "abc123",
                "timestamp": "05:30"
            }

    Raises:
        ValueError: If message is empty or video context is invalid
        Exception: If LLM generation fails
    """
    # Validation
    if not message or not message.strip():
        raise ValueError("Message cannot be empty")

    if not isinstance(video_context, dict):
        raise ValueError("Video context must be a dictionary")

    video_id = video_context.get('videoId', 'unknown')

    # Generate prompt with video context
    prompt = get_chat_prompt(
        message=message.strip(),
        video_context=video_context,
        timestamp=timestamp
    )

    # Build system instruction including transcript when available
    system_instruction = build_system_instruction(video_context)

    # Get LLM client and generate response
    client = get_client()

    try:
        response_text = client.generate_content(
            prompt=prompt,
            system_instruction=system_instruction,
            temperature=0.8  # Slightly higher for more conversational tone
        )

        return {
            'response': response_text.strip(),
            'videoId': video_id,
            'timestamp': timestamp
        }

    except Exception as e:
        raise Exception(f"Failed to generate chat response: {str(e)}")


def generate_chat_response_stream(message, video_context, timestamp=None):
    """
    Generate streaming AI tutor response (for real-time chat UI).

    Args:
        message (str): Student's message/question
        video_context (dict): Video context
        timestamp (str, optional): Current video timestamp

    Yields:
        str: Text chunks from the model's response

    Raises:
        ValueError: If message is empty or video context is invalid
        Exception: If LLM generation fails
    """
    # Validation
    if not message or not message.strip():
        raise ValueError("Message cannot be empty")

    if not isinstance(video_context, dict):
        raise ValueError("Video context must be a dictionary")

    # Generate prompt
    prompt = get_chat_prompt(
        message=message.strip(),
        video_context=video_context,
        timestamp=timestamp
    )

    system_instruction = build_system_instruction(video_context)

    # Get LLM client and stream response
    client = get_client()

    try:
        for chunk in client.generate_content_stream(
            prompt=prompt,
            system_instruction=system_instruction,
            temperature=0.8
        ):
            yield chunk

    except Exception as e:
        raise Exception(f"Failed to generate streaming chat response: {str(e)}")


def generate_session_id():
    """
    Generate a unique session ID for chat conversations.
    
    Returns:
        str: UUID-based session ID
    """
    return str(uuid.uuid4())


def save_chat_message(user_id, video_id, role, message, session_id=None, timestamp_context=None):
    """
    Save a chat message to the database.
    
    Args:
        user_id (int): User ID
        video_id (int): Video ID
        role (str): Message role ('user' or 'assistant')
        message (str): Message content
        session_id (str, optional): Session ID for grouping conversations
        timestamp_context (str, optional): Video timestamp context (e.g., "05:30")
    
    Returns:
        ChatMessage: The saved message object
    
    Raises:
        Exception: If database operation fails
    """
    db = SessionLocal()
    try:
        chat_message = ChatMessage(
            user_id=user_id,
            video_id=video_id,
            role=role,
            message=message,
            session_id=session_id,
            timestamp_context=timestamp_context,
            created_at=datetime.now(timezone.utc)
        )
        db.add(chat_message)
        db.commit()
        db.refresh(chat_message)
        return chat_message
    except Exception as e:
        db.rollback()
        raise Exception(f"Failed to save chat message: {str(e)}")
    finally:
        db.close()


def get_chat_history(video_id, user_id, limit=50):
    """
    Retrieve chat history for a video and user.
    
    Args:
        video_id (int): Video ID
        user_id (int): User ID
        limit (int): Maximum number of messages to retrieve (default: 50)
    
    Returns:
        list: List of chat message dictionaries, ordered by creation time
    
    Raises:
        Exception: If database operation fails
    """
    db = SessionLocal()
    try:
        messages = db.query(ChatMessage).filter(
            ChatMessage.video_id == video_id,
            ChatMessage.user_id == user_id
        ).order_by(ChatMessage.created_at.asc()).limit(limit).all()
        
        return [
            {
                'id': msg.id,
                'role': msg.role,
                'message': msg.message,
                'timestamp_context': msg.timestamp_context,
                'session_id': msg.session_id,
                'created_at': msg.created_at.isoformat() if msg.created_at else None
            }
            for msg in messages
        ]
    except Exception as e:
        raise Exception(f"Failed to retrieve chat history: {str(e)}")
    finally:
        db.close()
