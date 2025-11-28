"""
Summary generation service for LearnFlow.
Handles business logic for generating video summaries from transcripts.
"""

import json
import re
from llm import get_client
from prompts.summary_prompt import get_summary_prompt


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


def validate_summary_response(response_data):
    """
    Validate the summary response from LLM.

    Args:
        response_data (dict): Parsed JSON response from LLM

    Returns:
        bool: True if valid, False otherwise
    """
    if not isinstance(response_data, dict):
        return False

    if 'summary' not in response_data:
        return False

    summary = response_data['summary']
    if not isinstance(summary, str) or len(summary.strip()) == 0:
        return False

    # Basic validation: summary should be reasonable length (50-500 words)
    word_count = len(summary.split())
    if word_count < 50 or word_count > 500:
        return False

    return True


def generate_summary(transcript_data, video_id):
    """
    Generate a concise summary from video transcript.

    Args:
        transcript_data (dict): Transcript data with snippets, language, etc.
            {
                "snippets": [...],
                "language": "English",
                "languageCode": "en"
            }
        video_id (str): YouTube video ID

    Returns:
        dict: Summary data
            {
                "videoId": "abc123",
                "language": "en",
                "summary": "The summary text...",
                "wordCount": 150
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
    prompt = get_summary_prompt(
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
        if not validate_summary_response(response_data):
            raise ValueError("Invalid summary response format from LLM")

        summary_text = response_data['summary'].strip()
        word_count = len(summary_text.split())

        return {
            'videoId': video_id,
            'language': language_code,
            'summary': summary_text,
            'wordCount': word_count
        }

    except json.JSONDecodeError as e:
        raise ValueError(f"Failed to parse LLM response as JSON: {str(e)}")
    except Exception as e:
        raise Exception(f"Failed to generate summary: {str(e)}")
