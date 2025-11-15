"""
Quiz generation service for LearnFlow.
Handles business logic for generating quiz questions from video transcripts.
"""

import json
from llm import get_client
from prompts.quiz_prompt import get_quiz_prompt


def format_transcript_for_quiz(snippets):
    """
    Format transcript snippets for quiz generation.

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

        text = snippet['text'].strip()
        formatted_lines.append(text)

    return ' '.join(formatted_lines)


def validate_quiz_response(response_data, expected_questions):
    """
    Validate the quiz response from LLM.

    Args:
        response_data (dict): Parsed JSON response from LLM
        expected_questions (int): Expected number of questions

    Returns:
        bool: True if valid, False otherwise
    """
    if not isinstance(response_data, dict):
        return False

    if 'questions' not in response_data:
        return False

    questions = response_data['questions']
    if not isinstance(questions, list) or len(questions) == 0:
        return False

    # Validate each question
    for question in questions:
        if not isinstance(question, dict):
            return False

        required_fields = ['question', 'options', 'correctAnswer']
        if not all(field in question for field in required_fields):
            return False

        # Validate options
        options = question['options']
        if not isinstance(options, list) or len(options) != 4:
            return False

        # Validate correctAnswer is valid index
        correct_answer = question['correctAnswer']
        if not isinstance(correct_answer, int) or correct_answer not in [0, 1, 2, 3]:
            return False

    return True


def generate_quiz(transcript_data, video_id, num_questions=5):
    """
    Generate quiz questions from video transcript.

    Args:
        transcript_data (dict): Transcript data with snippets
            {
                "snippets": [...],
                "language": "English",
                "languageCode": "en"
            }
        video_id (str): YouTube video ID
        num_questions (int): Number of questions to generate (default: 5)

    Returns:
        dict: Quiz data
            {
                "videoId": "abc123",
                "language": "en",
                "questions": [
                    {
                        "id": 1,
                        "question": "Question text?",
                        "options": ["A", "B", "C", "D"],
                        "correctAnswer": 0,
                        "explanation": "Why this is correct"
                    }
                ],
                "totalQuestions": 5
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

    # Validate num_questions
    if not isinstance(num_questions, int) or num_questions < 1 or num_questions > 20:
        raise ValueError("Number of questions must be between 1 and 20")

    # Format transcript
    formatted_transcript = format_transcript_for_quiz(snippets)

    # Limit transcript length for API efficiency
    max_chars = 8000
    if len(formatted_transcript) > max_chars:
        formatted_transcript = formatted_transcript[:max_chars] + "..."

    # Generate prompt
    prompt = get_quiz_prompt(
        formatted_transcript=formatted_transcript,
        num_questions=num_questions,
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
        if not validate_quiz_response(response_data, num_questions):
            raise ValueError("Invalid quiz response format from LLM")

        # Process questions
        questions = []
        for idx, question in enumerate(response_data['questions'], 1):
            questions.append({
                'id': idx,
                'question': question['question'],
                'options': question['options'],
                'correctAnswer': question['correctAnswer'],
                'explanation': question.get('explanation', '')
            })

        return {
            'videoId': video_id,
            'language': language_code,
            'questions': questions,
            'totalQuestions': len(questions)
        }

    except json.JSONDecodeError as e:
        raise ValueError(f"Failed to parse LLM response as JSON: {str(e)}")
    except Exception as e:
        raise Exception(f"Failed to generate quiz: {str(e)}")
