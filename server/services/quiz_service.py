"""
Quiz generation service for LearnFlow.
Handles business logic for generating quiz questions from video transcripts.
"""

import json
from llm import get_client
from prompts.quiz_prompt import get_quiz_prompt
from utils.logger import get_logger

logger = get_logger(__name__)


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

        if 'start' not in snippet:
            raise ValueError(
                f"Snippet at index {idx} is missing 'start' field"
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
    # Validate each question
    for idx, question in enumerate(questions):
        if not isinstance(question, dict):
            logger.debug(f"Quiz Validation Error: Question {idx} is not a dict")
            return False

        required_fields = ['question', 'options', 'correctAnswer']
        if not all(field in question for field in required_fields):
            logger.debug(f"Quiz Validation Error: Question {idx} missing fields. Found keys: {question.keys()}")
            return False

        # Check for empty question text
        if not question['question'].strip():
            logger.debug(f"Quiz Validation Error: Question {idx} has empty text")
            return False

        # Validate options
        options = question['options']
        if not isinstance(options, list) or len(options) != 4:
            logger.debug(f"Quiz Validation Error: Question {idx} options not a list of 4: {options}")
            return False

        # Check for duplicate options (common LLM mistake)
        if len(set(options)) != len(options):
            logger.debug(f"Quiz Validation Error: Question {idx} has duplicate options: {options}")
            return False

        # Validate correctAnswer (normalize without mutating input)
        correct_answer = question['correctAnswer']
        normalized_correct_answer = correct_answer
        
        # Convert string "0" to 0
        if isinstance(correct_answer, str) and correct_answer.isdigit():
            normalized_correct_answer = int(correct_answer)
        # Convert "A", "B", "C", "D" to 0, 1, 2, 3
        elif isinstance(correct_answer, str) and correct_answer.upper() in ['A', 'B', 'C', 'D']:
            mapping = {'A': 0, 'B': 1, 'C': 2, 'D': 3}
            normalized_correct_answer = mapping[correct_answer.upper()]

        if not isinstance(normalized_correct_answer, int) or normalized_correct_answer not in [0, 1, 2, 3]:
            logger.debug(f"Quiz Validation Error: Question {idx} invalid correctAnswer: {correct_answer}")
            return False

    return True


def normalize_quiz_response(response_data):
    """
    Normalize quiz response by fixing common LLM errors.
    This function transforms the response data after validation.
    """
    for question in response_data['questions']:
        correct_answer = question['correctAnswer']
        
        # Convert string "0" to 0
        if isinstance(correct_answer, str) and correct_answer.isdigit():
            question['correctAnswer'] = int(correct_answer)
            
        # Convert "A", "B", "C", "D" to 0, 1, 2, 3
        elif isinstance(correct_answer, str) and correct_answer.upper() in ['A', 'B', 'C', 'D']:
            mapping = {'A': 0, 'B': 1, 'C': 2, 'D': 3}
            question['correctAnswer'] = mapping[correct_answer.upper()]


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
        logger.debug(f"Generated Quiz Data: {json.dumps(response_data, indent=2)}")

        # Validate response
        if not validate_quiz_response(response_data, num_questions):
            raise ValueError("Invalid quiz response format from LLM")

        # Normalize response (fix common LLM errors)
        normalize_quiz_response(response_data)

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
