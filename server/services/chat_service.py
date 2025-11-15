"""
Chat service for LearnFlow AI tutor.
Handles business logic for conversational tutoring interactions.
"""

from llm import get_client
from prompts.chat_prompt import get_chat_prompt
from prompts.system import system_instructions


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

    # Get LLM client and generate response
    client = get_client()

    try:
        response_text = client.generate_content(
            prompt=prompt,
            system_instruction=system_instructions,
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

    # Get LLM client and stream response
    client = get_client()

    try:
        for chunk in client.generate_content_stream(
            prompt=prompt,
            system_instruction=system_instructions,
            temperature=0.8
        ):
            yield chunk

    except Exception as e:
        raise Exception(f"Failed to generate streaming chat response: {str(e)}")
