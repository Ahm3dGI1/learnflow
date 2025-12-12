"""
Flashcard generation service for LearnFlow.
Handles business logic for generating flashcards from video transcripts.
Uses spaced repetition principles for effective learning.
"""

import json
from llm import get_client


def format_transcript_for_flashcards(snippets):
    """
    Format transcript snippets for flashcard generation.

    Args:
        snippets (list): List of transcript snippets with text, start, duration

    Returns:
        str: Formatted transcript text

    Raises:
        ValueError: If snippet is missing required fields
    """
    formatted_lines = []

    for idx, snippet in enumerate(snippets):
        # Validate required fields
        if not isinstance(snippet, dict):
            raise ValueError(f"Snippet at index {idx} is not a dictionary")

        if 'text' not in snippet:
            raise ValueError(
                f"Snippet at index {idx} is missing 'text' field"
            )

        if 'start' not in snippet:
            raise ValueError(
                f"Snippet at index {idx} is missing 'start' field"
            )

        text = snippet['text'].strip()
        formatted_lines.append(text)

    return ' '.join(formatted_lines)


def get_flashcard_prompt(formatted_transcript, num_cards, video_id):
    """
    Generate the prompt for flashcard generation.

    Args:
        formatted_transcript (str): Formatted transcript text
        num_cards (int): Number of flashcards to generate
        video_id (str): YouTube video ID for context

    Returns:
        str: Prompt for LLM
    """
    return f"""You are an expert educator creating flashcards for spaced repetition learning.

Analyze the following video transcript and create {num_cards} high-quality flashcards that help learners remember key concepts, definitions, facts, and important ideas.

VIDEO TRANSCRIPT:
{formatted_transcript}

INSTRUCTIONS:
1. Create {num_cards} flashcards from the most important concepts in the transcript
2. Each flashcard should have:
   - front: A clear question or concept prompt (what the learner needs to recall)
   - back: The answer or explanation (what they should remember)
   - category: A short category label (e.g., "Definition", "Concept", "Process", "Fact")
   - hint: An optional memory hint or mnemonic (can be empty string if not needed)
3. Make questions specific and testable
4. Keep answers concise but complete
5. Focus on understanding, not just memorization
6. Vary question types: definitions, comparisons, processes, applications
7. Order cards from foundational concepts to more advanced ones

RESPONSE FORMAT:
Return ONLY a valid JSON object with no additional text:
{{
    "flashcards": [
        {{
            "front": "What is [concept]?",
            "back": "Clear, concise answer explaining the concept",
            "category": "Definition",
            "hint": "Optional memory tip"
        }},
        ...more cards
    ]
}}

Generate exactly {num_cards} flashcards. Return ONLY the JSON, no explanation or markdown."""


def validate_flashcard_response(response_data, expected_cards):
    """
    Validate the flashcard response from LLM.

    Args:
        response_data (dict): Parsed JSON response from LLM
        expected_cards (int): Expected number of flashcards

    Returns:
        bool: True if valid, False otherwise
    """
    if not isinstance(response_data, dict):
        return False

    if 'flashcards' not in response_data:
        return False

    flashcards = response_data['flashcards']
    if not isinstance(flashcards, list) or len(flashcards) == 0:
        return False

    # Validate each flashcard
    for card in flashcards:
        if not isinstance(card, dict):
            return False

        required_fields = ['front', 'back']
        if not all(field in card for field in required_fields):
            return False

        # Check for empty content
        if not card['front'].strip() or not card['back'].strip():
            return False

    return True


def generate_flashcards(transcript_data, video_id, num_cards=10):
    """
    Generate flashcards from video transcript.

    Args:
        transcript_data (dict): Transcript data with snippets
            {
                "snippets": [...],
                "language": "English",
                "languageCode": "en"
            }
        video_id (str): YouTube video ID
        num_cards (int): Number of flashcards to generate (default: 10)

    Returns:
        dict: Flashcard data
            {
                "videoId": "abc123",
                "language": "en",
                "flashcards": [
                    {
                        "id": 1,
                        "front": "Question or concept",
                        "back": "Answer or explanation",
                        "category": "Definition",
                        "hint": "Memory tip"
                    }
                ],
                "totalCards": 10
            }

    Raises:
        ValueError: If transcript data is invalid or LLM response is invalid
        Exception: If LLM generation fails
    """
    # Extract data
    snippets = transcript_data.get('snippets', [])
    language_code = transcript_data.get('languageCode', 'en')

    if not snippets:
        raise ValueError("Transcript snippets are empty")

    # Validate num_cards
    if not isinstance(num_cards, int) or num_cards < 1 or num_cards > 30:
        raise ValueError("Number of flashcards must be between 1 and 30")

    # Format transcript
    formatted_transcript = format_transcript_for_flashcards(snippets)

    # Limit transcript length for API efficiency
    max_chars = 10000
    if len(formatted_transcript) > max_chars:
        formatted_transcript = formatted_transcript[:max_chars] + "..."

    # Generate prompt
    prompt = get_flashcard_prompt(
        formatted_transcript=formatted_transcript,
        num_cards=num_cards,
        video_id=video_id
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
        if not validate_flashcard_response(response_data, num_cards):
            raise ValueError("Invalid flashcard response format from LLM")

        # Process flashcards
        flashcards = []
        for idx, card in enumerate(response_data['flashcards'], 1):
            flashcards.append({
                'id': idx,
                'front': card['front'],
                'back': card['back'],
                'category': card.get('category', 'Concept'),
                'hint': card.get('hint', '')
            })

        return {
            'videoId': video_id,
            'language': language_code,
            'flashcards': flashcards,
            'totalCards': len(flashcards)
        }

    except json.JSONDecodeError as e:
        raise ValueError(f"Failed to parse LLM response as JSON: {str(e)}")
    except Exception as e:
        raise Exception(f"Failed to generate flashcards: {str(e)}")
