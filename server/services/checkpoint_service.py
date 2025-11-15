"""
Checkpoint generation service for LearnFlow.
Handles business logic for generating learning checkpoints from video transcripts.
"""

import json
import re
from llm import get_client
from prompts.checkpoint_prompt import get_checkpoint_prompt


def format_transcript_for_llm(snippets):
    """
    Format transcript snippets into timestamped text for LLM.

    Args:
        snippets (list): List of transcript snippets with text, start, duration

    Returns:
        str: Formatted transcript with timestamps
        Example:
            [00:00] Hey there
            [00:01] how are you
            [00:05] today we'll learn about
    
    Raises:
        ValueError: If snippet is missing required fields
    """
    formatted_lines = []

    for idx, snippet in enumerate(snippets):
        # Validate required fields
        if not isinstance(snippet, dict):
            raise ValueError(f"Snippet at index {idx} is not a dictionary")
        
        if 'start' not in snippet:
            raise ValueError(
                f"Snippet at index {idx} is missing 'start' field"
            )
        
        if 'text' not in snippet:
            raise ValueError(
                f"Snippet at index {idx} is missing 'text' field"
            )
        
        timestamp = seconds_to_mmss(snippet['start'])
        text = snippet['text'].strip()
        formatted_lines.append(f"[{timestamp}] {text}")

    return '\n'.join(formatted_lines)


def seconds_to_mmss(seconds):
    """
    Convert seconds to MM:SS format.

    Args:
        seconds (float): Time in seconds

    Returns:
        str: Formatted time as MM:SS
    """
    minutes = int(seconds // 60)
    secs = int(seconds % 60)
    return f"{minutes:02d}:{secs:02d}"


def mmss_to_seconds(timestamp):
    """
    Convert MM:SS format to seconds.

    Args:
        timestamp (str): Time in MM:SS format

    Returns:
        int: Time in seconds
    """
    parts = timestamp.split(':')
    if len(parts) != 2:
        raise ValueError(f"Invalid timestamp format: {timestamp}")

    try:
        minutes, seconds = map(int, parts)
    except ValueError:
        raise ValueError(f"Invalid numeric values in timestamp: {timestamp}")
    return minutes * 60 + seconds


def calculate_video_duration(snippets):
    """
    Calculate total video duration from transcript snippets.

    Args:
        snippets (list): List of transcript snippets

    Returns:
        str: Duration in MM:SS format
    """
    if not snippets:
        return "00:00"

    last_snippet = snippets[-1]
    total_seconds = last_snippet['start'] + last_snippet.get('duration', 0)
    return seconds_to_mmss(total_seconds)


def validate_checkpoint_response(response_data):
    """
    Validate the checkpoint response from LLM.

    Args:
        response_data (dict): Parsed JSON response from LLM

    Returns:
        bool: True if valid, False otherwise
    """
    if not isinstance(response_data, dict):
        return False

    if 'checkpoints' not in response_data:
        return False

    checkpoints = response_data['checkpoints']
    if not isinstance(checkpoints, list) or len(checkpoints) == 0:
        return False

    # Validate each checkpoint
    for checkpoint in checkpoints:
        if not isinstance(checkpoint, dict):
            return False

        required_fields = ['timestamp', 'title', 'subtopic']
        if not all(field in checkpoint for field in required_fields):
            return False

        # Validate timestamp format (MM:SS)
        timestamp = checkpoint['timestamp']
        if not re.match(r'^\d{1,2}:[0-5]\d$', timestamp):
            return False

    return True


def generate_checkpoints(transcript_data, video_id):
    """
    Generate learning checkpoints from video transcript.

    Args:
        transcript_data (dict): Transcript data with snippets, language, etc.
            {
                "snippets": [...],
                "language": "English",
                "languageCode": "en"
            }
        video_id (str): YouTube video ID

    Returns:
        dict: Checkpoint data
            {
                "videoId": "abc123",
                "language": "en",
                "checkpoints": [
                    {
                        "id": 1,
                        "timestamp": "02:15",
                        "timestampSeconds": 135,
                        "title": "Title",
                        "subtopic": "Description"
                    }
                ],
                "totalCheckpoints": 1
            }

    Raises:
        ValueError: If transcript data is invalid or LLM response is invalid
        Exception: If LLM generation fails
    """
    # Extract data
    snippets = transcript_data.get('snippets', [])
    language = transcript_data.get('language', 'Unknown')
    language_code = transcript_data.get('languageCode', 'en')

    if not snippets:
        raise ValueError("Transcript snippets are empty")

    # Format transcript
    formatted_transcript = format_transcript_for_llm(snippets)
    duration = calculate_video_duration(snippets)

    # Generate prompt
    prompt = get_checkpoint_prompt(
        video_id=video_id,
        language=language,
        duration=duration,
        formatted_transcript=formatted_transcript
    )

    # Get LLM client and generate
    client = get_client()

    try:
        response_text = client.generate_content(
            prompt=prompt,
            temperature=0.7
        )

        # Parse JSON response
        # Remove markdown code blocks if present
        response_text = response_text.strip()
        if response_text.startswith('```'):
            # Extract JSON from code block
            lines = response_text.split('\n')
            response_text = '\n'.join(
                line for line in lines
                if not line.strip().startswith('```')
            )

        response_data = json.loads(response_text)

        # Validate response
        if not validate_checkpoint_response(response_data):
            raise ValueError("Invalid checkpoint response format from LLM")

        # Process checkpoints
        checkpoints = []
        for idx, checkpoint in enumerate(response_data['checkpoints'], 1):
            timestamp_seconds = mmss_to_seconds(checkpoint['timestamp'])
            checkpoints.append({
                'id': idx,
                'timestamp': checkpoint['timestamp'],
                'timestampSeconds': timestamp_seconds,
                'title': checkpoint['title'],
                'subtopic': checkpoint['subtopic']
            })

        return {
            'videoId': video_id,
            'language': language_code,
            'checkpoints': checkpoints,
            'totalCheckpoints': len(checkpoints)
        }

    except json.JSONDecodeError as e:
        raise ValueError(f"Failed to parse LLM response as JSON: {str(e)}")
    except Exception as e:
        raise Exception(f"Failed to generate checkpoints: {str(e)}")
