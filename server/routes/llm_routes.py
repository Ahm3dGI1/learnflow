"""
LLM-related API routes for LearnFlow.
Handles endpoints for checkpoint generation, chat, and other AI features.
"""

import json
import logging
import traceback
from datetime import datetime, timedelta, timezone
from flask import Blueprint, request, jsonify, Response, g
from database import SessionLocal
from services import (
    generate_checkpoints,
    generate_chat_response,
    generate_chat_response_stream,
    generate_quiz,
    generate_summary,
    get_video_by_youtube_id,
    cache_checkpoints,
    save_chat_message,
    get_chat_history,
    generate_session_id
)
from utils import checkpoint_cache, quiz_cache, summary_cache
from models import Checkpoint, Quiz, UserQuizAttempt, UserCheckpointCompletion, User, Video
from middleware.auth import auth_required


# Configure logging
logger = logging.getLogger(__name__)

# Blueprint for LLM routes
llm_bp = Blueprint('llm', __name__, url_prefix='/api/llm')


# ========== HELPER FUNCTIONS ==========

def get_cached_checkpoints_from_db(video_id):
    """
    Get cached checkpoints from database Checkpoint records.

    Args:
        video_id: YouTube video ID

    Returns:
        dict: Checkpoint data with IDs or None if not found/error
    """
    db = SessionLocal()
    try:
        video = get_video_by_youtube_id(video_id, db)
        if not video:
            return None

        # Get Checkpoint records ordered by order_index
        checkpoint_records = db.query(Checkpoint).filter_by(
            video_id=video.id
        ).order_by(Checkpoint.order_index).all()

        if not checkpoint_records:
            # Fall back to Video.checkpoints_data JSON if no Checkpoint records
            if video.checkpoints_data:
                try:
                    return json.loads(video.checkpoints_data)
                except json.JSONDecodeError as e:
                    print(f"Error parsing cached checkpoints: {e}")
                    return None
            return None

        # Build checkpoints response from database records
        checkpoints = []
        for cp in checkpoint_records:
            # Parse question_data JSON
            question_data = {}
            if cp.question_data:
                try:
                    question_data = json.loads(cp.question_data)
                except json.JSONDecodeError:
                    question_data = {}

            # Convert seconds to MM:SS format
            minutes = cp.time_seconds // 60
            seconds = cp.time_seconds % 60
            timestamp = f"{minutes:02d}:{seconds:02d}"

            checkpoints.append({
                'id': cp.id,
                'timestamp': timestamp,
                'timestampSeconds': cp.time_seconds,
                'title': cp.title or '',
                'subtopic': cp.subtopic or '',
                'question': question_data.get('question', ''),
                'options': question_data.get('options', []),
                'correctAnswer': question_data.get('correctAnswer', ''),
                'explanation': question_data.get('explanation', '')
            })

        return {
            'videoId': video_id,
            'language': 'en',  # Default, could be stored in Video model
            'checkpoints': checkpoints,
            'totalCheckpoints': len(checkpoints)
        }

    except Exception as e:
        print(f"Error reading checkpoints from database: {e}")
        traceback.print_exc()
        return None
    finally:
        db.close()


def get_cached_quiz_from_db(video_id):
    """
    Get cached quiz from database Quiz records.

    Args:
        video_id: YouTube video ID

    Returns:
        dict: Quiz data with ID or None if not found/error
    """
    db = SessionLocal()
    try:
        video = get_video_by_youtube_id(video_id, db)
        if not video:
            return None

        # Get most recent Quiz record for this video
        quiz_record = db.query(Quiz).filter_by(
            video_id=video.id
        ).order_by(Quiz.created_at.desc()).first()

        if not quiz_record:
            # Fall back to Video.quiz_data JSON if no Quiz record
            if video.quiz_data:
                try:
                    return json.loads(video.quiz_data)
                except json.JSONDecodeError as e:
                    print(f"Error parsing cached quiz: {e}")
                    return None
            return None

        # Parse questions_data JSON
        questions = []
        if quiz_record.questions_data:
            try:
                questions = json.loads(quiz_record.questions_data)
            except json.JSONDecodeError:
                questions = []

        return {
            'quizId': quiz_record.id,
            'videoId': video_id,
            'language': 'en',  # Default
            'questions': questions,
            'totalQuestions': len(questions)
        }

    except Exception as e:
        print(f"Error reading quiz from database: {e}")
        traceback.print_exc()
        return None
    finally:
        db.close()


def save_quiz_to_db(video_id, quiz_data):
    """
    Save quiz to database as a Quiz record.

    Args:
        video_id: YouTube video ID
        quiz_data: Quiz data dict with 'questions' array

    Returns:
        dict: Updated quiz_data with database ID, or None if failed
    """
    db = SessionLocal()
    try:
        video = get_video_by_youtube_id(video_id, db)
        if not video:
            return None

        # Create Quiz record
        num_questions = len(quiz_data.get('questions', []))
        quiz_record = Quiz(
            video_id=video.id,
            title="Test Your Knowledge",
            num_questions=num_questions,
            difficulty="intermediate",  # Default, could be determined by analysis
            questions_data=json.dumps(quiz_data.get('questions', []))
        )
        db.add(quiz_record)
        db.commit()
        db.refresh(quiz_record)

        # Update quiz_data with database ID
        quiz_data_with_id = quiz_data.copy()
        quiz_data_with_id['quizId'] = quiz_record.id

        return quiz_data_with_id

    except Exception as e:
        print(f"Error saving quiz to database: {e}")
        traceback.print_exc()
        db.rollback()
        return None
    finally:
        db.close()


def save_checkpoints_to_db(video_id, checkpoints_data):
    """
    Save checkpoints to database as individual Checkpoint records.

    Args:
        video_id: YouTube video ID
        checkpoints_data: Checkpoint data dict with 'checkpoints' array

    Returns:
        dict: Updated checkpoints_data with database IDs, or None if failed
    """
    db = SessionLocal()
    try:
        video = get_video_by_youtube_id(video_id, db)
        if not video:
            return None

        # Delete existing checkpoints for this video to avoid duplicates
        db.query(Checkpoint).filter_by(video_id=video.id).delete()

        # Create Checkpoint records for each checkpoint
        checkpoint_records = []
        checkpoints_list = checkpoints_data.get('checkpoints', [])

        for idx, cp_data in enumerate(checkpoints_list, start=1):
            # Create Checkpoint record
            checkpoint_record = Checkpoint(
                video_id=video.id,
                time_seconds=cp_data.get('timestampSeconds', 0),
                title=cp_data.get('title', ''),
                subtopic=cp_data.get('subtopic', ''),
                order_index=idx,
                question_data=json.dumps({
                    'question': cp_data.get('question', ''),
                    'options': cp_data.get('options', []),
                    'correctAnswer': cp_data.get('correctAnswer', ''),
                    'explanation': cp_data.get('explanation', '')
                })
            )
            db.add(checkpoint_record)
            checkpoint_records.append(checkpoint_record)

        # Commit to get IDs
        db.commit()

        # Update checkpoints_data with database IDs
        for idx, checkpoint_record in enumerate(checkpoint_records):
            db.refresh(checkpoint_record)
            checkpoints_list[idx]['id'] = checkpoint_record.id

        # Also cache in Video.checkpoints_data for backward compatibility
        cache_checkpoints(video.id, checkpoints_data, db)

        return checkpoints_data

    except Exception as e:
        print(f"Error saving checkpoints to database: {e}")
        traceback.print_exc()
        db.rollback()
        return None
    finally:
        db.close()


@llm_bp.route('/checkpoints/generate', methods=['POST'])
def generate_checkpoints_route():
    """
    Generate learning checkpoints from video transcript.

    Request Body:
        {
            "videoId": "abc123",
            "transcript": {
                "snippets": [
                    {"text": "...", "start": 0.0, "duration": 1.5},
                    ...
                ],
                "language": "English",
                "languageCode": "en",
                "isGenerated": false
            },
            "options": {
                "maxCheckpoints": 8,
                "minInterval": 120
            }
        }

    Returns:
        {
            "videoId": "abc123",
            "language": "en",
            "cached": false,
            "checkpoints": [...],
            "totalCheckpoints": 5
        }

    Status Codes:
        200: Success
        400: Invalid request data
        500: Internal server error
    """
    try:
        # Parse request data
        data = request.get_json()

        if not data:
            return jsonify({'error': 'No data provided'}), 400

        video_id = data.get('videoId')
        transcript_data = data.get('transcript')

        # Validation
        if not video_id:
            return jsonify({'error': 'videoId is required'}), 400

        if not transcript_data:
            return jsonify({'error': 'transcript is required'}), 400

        if not transcript_data.get('snippets'):
            return jsonify({'error': 'transcript.snippets is required'}), 400

        language_code = transcript_data.get('languageCode', 'en')

        # Check cache first (memory)
        cache_key = f"{video_id}:{language_code}"
        cached_data = checkpoint_cache.get(cache_key)
        if cached_data:
            response = cached_data.copy()
            response['cached'] = True
            response['source'] = 'memory'
            return jsonify(response), 200

        # Check database cache
        db_checkpoints = get_cached_checkpoints_from_db(video_id)
        if db_checkpoints:
            # Cache in memory for faster subsequent access
            checkpoint_cache.set(cache_key, db_checkpoints)
            response = db_checkpoints.copy()
            response['cached'] = True
            response['source'] = 'database'
            return jsonify(response), 200

        # Generate checkpoints
        checkpoints = generate_checkpoints(transcript_data, video_id)

        # Save to database and get updated data with IDs
        checkpoints_with_ids = save_checkpoints_to_db(video_id, checkpoints)

        # Use the version with IDs if available, otherwise use original
        final_checkpoints = checkpoints_with_ids if checkpoints_with_ids else checkpoints

        # Cache the result with IDs in memory
        checkpoint_cache.set(cache_key, final_checkpoints)

        # Add cached flag
        response = final_checkpoints.copy()
        response['cached'] = False
        response['source'] = 'generated'

        return jsonify(response), 200

    except ValueError as e:
        # ValueError messages are safe to expose (validation errors only)
        logger.warning(
            f"Validation error generating checkpoints for video "
            f"{video_id}: {str(e)}"
        )
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(
            f"Error generating checkpoints for video {video_id}: {str(e)}",
            exc_info=True
        )
        return jsonify({'error': 'Failed to generate checkpoints'}), 500


@llm_bp.route('/checkpoints/cache/clear', methods=['POST'])
def clear_checkpoint_cache():
    """
    Clear the checkpoint cache (for testing/admin purposes).

    Returns:
        {"message": "Cache cleared", "clearedItems": 5}
    """
    cleared_count = checkpoint_cache.clear()
    return jsonify({
        'message': 'Cache cleared',
        'clearedItems': cleared_count
    }), 200


@llm_bp.route('/health', methods=['GET'])
def health_check():
    """
    Health check endpoint for LLM routes.

    Returns:
        {"status": "ok", "cacheSize": 3}
    """
    return jsonify({
        'status': 'ok',
        'checkpointCacheSize': checkpoint_cache.size(),
        'quizCacheSize': quiz_cache.size(),
        'summaryCacheSize': summary_cache.size()
    }), 200


# ========== CHAT ROUTES ==========

@llm_bp.route('/chat/send', methods=['POST'])
@auth_required
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
        if not user_id:
            return jsonify({'error': 'userId is required'}), 400
        if not video_youtube_id:
            return jsonify({'error': 'videoId is required'}), 400

        # Verify user exists and matches authenticated user
        user = db.query(User).filter_by(id=user_id).first()
        if not user:
            return jsonify({'error': 'User not found'}), 404

        firebase_uid = g.firebase_user.get('uid')
        if user.firebase_uid != firebase_uid:
            return jsonify({'error': 'Unauthorized: Cannot send message for another user'}), 401

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


@llm_bp.route('/chat/stream', methods=['POST'])
@auth_required
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
        if not user_id:
            return jsonify({'error': 'userId is required'}), 400
        if not video_youtube_id:
            return jsonify({'error': 'videoId is required'}), 400

        # Verify user exists and matches authenticated user
        user = db.query(User).filter_by(id=user_id).first()
        if not user:
            return jsonify({'error': 'User not found'}), 404

        firebase_uid = g.firebase_user.get('uid')
        if user.firebase_uid != firebase_uid:
            return jsonify({'error': 'Unauthorized: Cannot send message for another user'}), 401

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
        
        def generate():
            try:
                for chunk in generate_chat_response_stream(
                    message=message,
                    video_context=video_context,
                    timestamp=timestamp
                ):
                    full_response.append(chunk)
                    yield chunk
                
                # Save assistant response after streaming completes
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
                yield f"\n[Error: {str(e)}]"

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


@llm_bp.route('/chat/history/<video_id>', methods=['GET'])
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
        if not user_id:
            return jsonify({'error': 'userId is required'}), 400
        
        # Verify user exists and matches authenticated user
        user = db.query(User).filter_by(id=user_id).first()
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        firebase_uid = g.firebase_user.get('uid')
        if user.firebase_uid != firebase_uid:
            return jsonify({'error': 'Unauthorized: Cannot access another user\'s chat history'}), 401
        
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


# ========== QUIZ ROUTES ==========

@llm_bp.route('/quiz/generate', methods=['POST'])
def generate_quiz_route():
    """
    Generate quiz questions from video transcript.

    Request Body:
        {
            "videoId": "abc123",
            "transcript": {
                "snippets": [
                    {"text": "...", "start": 0.0, "duration": 1.5},
                    ...
                ],
                "language": "English",
                "languageCode": "en"
            },
            "numQuestions": 5
        }

    Returns:
        {
            "videoId": "abc123",
            "language": "en",
            "cached": false,
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

    Status Codes:
        200: Success
        400: Invalid request data
        500: Internal server error
    """
    try:
        data = request.get_json()

        if not data:
            return jsonify({'error': 'No data provided'}), 400

        video_id = data.get('videoId')
        transcript_data = data.get('transcript')
        num_questions = data.get('numQuestions', 5)

        # Validation
        if not video_id:
            return jsonify({'error': 'videoId is required'}), 400

        if not transcript_data:
            return jsonify({'error': 'transcript is required'}), 400

        if not transcript_data.get('snippets'):
            return jsonify({'error': 'transcript.snippets is required'}), 400

        language_code = transcript_data.get('languageCode', 'en')

        # Check cache first (memory)
        cache_key = f"{video_id}:{language_code}:{num_questions}"
        cached_data = quiz_cache.get(cache_key)
        if cached_data:
            response = cached_data.copy()
            response['cached'] = True
            response['source'] = 'memory'
            return jsonify(response), 200

        # Check database cache
        db_quiz = get_cached_quiz_from_db(video_id)
        if db_quiz:
            # Cache in memory for faster subsequent access
            quiz_cache.set(cache_key, db_quiz)
            response = db_quiz.copy()
            response['cached'] = True
            response['source'] = 'database'
            return jsonify(response), 200

        # Generate quiz
        quiz = generate_quiz(
            transcript_data=transcript_data,
            video_id=video_id,
            num_questions=num_questions
        )

        # Save to database and get updated data with ID
        quiz_with_id = save_quiz_to_db(video_id, quiz)

        # Use the version with ID if available, otherwise use original
        final_quiz = quiz_with_id if quiz_with_id else quiz

        # Cache the result with ID in memory
        quiz_cache.set(cache_key, final_quiz)

        # Add cached flag
        response = final_quiz.copy()
        response['cached'] = False
        response['source'] = 'generated'

        return jsonify(response), 200

    except ValueError as e:
        # ValueError messages are safe to expose (validation errors only)
        logger.warning(
            f"Validation error generating quiz for video {video_id}: {str(e)}"
        )
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(
            f"Error generating quiz for video {video_id}: {str(e)}",
            exc_info=True
        )
        return jsonify({'error': 'Failed to generate quiz'}), 500


@llm_bp.route('/quiz/cache/clear', methods=['POST'])
def clear_quiz_cache():
    """
    Clear the quiz cache (for testing/admin purposes).

    Returns:
        {"message": "Cache cleared", "clearedItems": 5}
    """
    cleared_count = quiz_cache.clear()
    return jsonify({
        'message': 'Quiz cache cleared',
        'clearedItems': cleared_count
    }), 200


# ========== SUMMARY ROUTES ==========

@llm_bp.route('/summary/generate', methods=['POST'])
def generate_summary_route():
    """
    Generate video summary from transcript.

    Request Body:
        {
            "videoId": "abc123",
            "transcript": {
                "snippets": [
                    {"text": "...", "start": 0.0, "duration": 1.5},
                    ...
                ],
                "language": "English",
                "languageCode": "en"
            }
        }

    Returns:
        {
            "videoId": "abc123",
            "language": "en",
            "cached": false,
            "summary": "The video summary text...",
            "wordCount": 150
        }

    Status Codes:
        200: Success
        400: Invalid request data
        500: Internal server error
    """
    try:
        data = request.get_json()

        if not data:
            return jsonify({'error': 'No data provided'}), 400

        video_id = data.get('videoId')
        transcript_data = data.get('transcript')

        # Validation
        if not video_id:
            return jsonify({'error': 'videoId is required'}), 400

        if not transcript_data:
            return jsonify({'error': 'transcript is required'}), 400

        if not transcript_data.get('snippets'):
            return jsonify({'error': 'transcript.snippets is required'}), 400

        language_code = transcript_data.get('languageCode', 'en')

        # Check cache first
        cache_key = f"{video_id}:{language_code}:summary"
        cached_data = summary_cache.get(cache_key)
        if cached_data:
            response = cached_data.copy()
            response['cached'] = True
            return jsonify(response), 200

        # Generate summary
        summary = generate_summary(
            transcript_data=transcript_data,
            video_id=video_id
        )

        # Cache the result
        summary_cache.set(cache_key, summary)

        # Add cached flag
        response = summary.copy()
        response['cached'] = False

        return jsonify(response), 200

    except ValueError as e:
        # ValueError messages are safe to expose (validation errors only)
        logger.warning(
            f"Validation error generating summary for video "
            f"{video_id}: {str(e)}"
        )
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(
            f"Error generating summary for video {video_id}: {str(e)}",
            exc_info=True
        )
        return jsonify({'error': 'Failed to generate summary'}), 500


@llm_bp.route('/summary/cache/clear', methods=['POST'])
def clear_summary_cache():
    """
    Clear the summary cache (for testing/admin purposes).

    Returns:
        {"message": "Cache cleared", "clearedItems": 5}
    """
    cleared_count = summary_cache.clear()
    return jsonify({
        'message': 'Summary cache cleared',
        'clearedItems': cleared_count
    }), 200


# ========== QUIZ SUBMISSION ROUTES ==========

@llm_bp.route('/quiz/submit', methods=['POST'])
@auth_required
def submit_quiz():
    """
    Submit quiz answers and calculate score.

    Requires authentication via Firebase ID token in Authorization header.
    Answer validation is performed server-side against stored quiz questions.
    Do NOT send isCorrect field - it will be calculated server-side.

    Request Body:
        {
            "userId": 1,
            "quizId": 5,
            "answers": [
                {"questionIndex": 0, "selectedAnswer": "Option B"},
                {"questionIndex": 1, "selectedAnswer": "Option A"},
                ...
            ],
            "timeTakenSeconds": 120
        }

    Returns:
        {
            "attemptId": 15,
            "score": 0.75,
            "totalQuestions": 4,
            "correctAnswers": 3,
            "submittedAt": "2025-12-07T18:30:00",
            "startedAt": "2025-12-07T18:28:00"
        }

    Status Codes:
        200: Success
        400: Invalid request data (missing userId, quizId, or answers)
        401: Unauthorized (invalid/missing token or user mismatch)
        404: User or quiz not found
        500: Server error (including invalid quiz data)
    """
    data = request.get_json()

    # Validate required fields
    required_fields = ['userId', 'quizId', 'answers']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing required field: {field}'}), 400

    user_id = data['userId']
    quiz_id = data['quizId']
    answers = data['answers']
    time_taken = data.get('timeTakenSeconds')

    if not isinstance(answers, list) or len(answers) == 0:
        return jsonify({'error': 'Answers must be a non-empty array'}), 400

    db = SessionLocal()
    try:
        # Verify user exists and matches authenticated user
        user = db.query(User).filter_by(id=user_id).first()
        if not user:
            return jsonify({'error': 'User not found'}), 404

        # Check that authenticated user matches the userId in request
        firebase_uid = g.firebase_user.get('uid')
        if user.firebase_uid != firebase_uid:
            return jsonify({'error': 'Unauthorized: Cannot submit quiz for another user'}), 401

        # Verify quiz exists
        quiz = db.query(Quiz).filter_by(id=quiz_id).first()
        if not quiz:
            return jsonify({'error': 'Quiz not found'}), 404

        # Parse quiz questions to validate answers server-side
        quiz_questions = []
        if quiz.questions_data:
            try:
                quiz_questions = json.loads(quiz.questions_data)
            except json.JSONDecodeError:
                return jsonify({'error': 'Invalid quiz data'}), 500

        # Validate answers server-side - DO NOT trust client's isCorrect field
        # Use quiz_questions length to prevent cheating (users can't cherry-pick questions)
        total_questions = len(quiz_questions)
        correct_count = 0

        for answer in answers:
            question_idx = answer.get('questionIndex')
            selected_answer = answer.get('selectedAnswer')

            # Validate against server-side quiz data
            if (isinstance(question_idx, int) and
                0 <= question_idx < len(quiz_questions) and
                selected_answer is not None):
                correct_answer = quiz_questions[question_idx].get('correctAnswer')
                if selected_answer == correct_answer:
                    correct_count += 1

        score = correct_count / total_questions if total_questions > 0 else 0

        # Calculate started_at based on time_taken
        submitted_at = datetime.now(timezone.utc)
        started_at = submitted_at
        if time_taken:
            started_at = submitted_at - timedelta(seconds=time_taken)

        # Create quiz attempt record
        attempt = UserQuizAttempt(
            user_id=user_id,
            quiz_id=quiz_id,
            score=score,
            answers=json.dumps(answers),
            time_taken_seconds=time_taken,
            started_at=started_at,
            submitted_at=submitted_at
        )

        db.add(attempt)
        db.commit()
        db.refresh(attempt)

        return jsonify({
            'attemptId': attempt.id,
            'score': score,
            'totalQuestions': total_questions,
            'correctAnswers': correct_count,
            'submittedAt': attempt.submitted_at.isoformat(),
            'startedAt': attempt.started_at.isoformat() if attempt.started_at else None
        }), 200

    except Exception as e:
        db.rollback()
        print(f"Error submitting quiz: {e}")
        traceback.print_exc()
        return jsonify({'error': 'Failed to submit quiz'}), 500
    finally:
        db.close()


@llm_bp.route('/quiz/attempts', methods=['GET'])
@auth_required
def get_quiz_attempts():
    """
    Get all quiz attempts for a user on a specific video.

    Requires authentication via Firebase ID token in Authorization header.

    Query Parameters:
        videoId (str): YouTube video ID (required)

    Returns:
        {
            "attempts": [
                {
                    "attemptId": 15,
                    "quizId": 5,
                    "score": 0.8,
                    "totalQuestions": 5,
                    "correctAnswers": 4,
                    "timeTakenSeconds": 120,
                    "submittedAt": "2025-12-07T18:30:00",
                    "startedAt": "2025-12-07T18:28:00"
                },
                ...
            ],
            "totalAttempts": 3,
            "bestScore": 0.8,
            "averageScore": 0.7
        }

    Status Codes:
        200: Success
        400: Missing videoId parameter
        401: Unauthorized (invalid/missing token)
        404: Video not found
        500: Server error
    """
    video_id = request.args.get('videoId')
    
    if not video_id:
        return jsonify({'error': 'videoId query parameter is required'}), 400
    
    db = SessionLocal()
    try:
        # Get authenticated user
        firebase_uid = g.firebase_user.get('uid')
        user = db.query(User).filter_by(firebase_uid=firebase_uid).first()
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Get video by YouTube ID
        from services import get_video_by_youtube_id
        video = get_video_by_youtube_id(video_id, db)
        
        if not video:
            return jsonify({'error': 'Video not found'}), 404
        
        # Get all quizzes for this video
        quizzes = db.query(Quiz).filter_by(video_id=video.id).all()
        quiz_ids = [q.id for q in quizzes]
        
        # Create quiz lookup dictionary to avoid N+1 queries
        quiz_map = {q.id: q for q in quizzes}
        
        # Get all attempts by this user for quizzes on this video
        attempts = db.query(UserQuizAttempt).filter(
            UserQuizAttempt.user_id == user.id,
            UserQuizAttempt.quiz_id.in_(quiz_ids)
        ).order_by(UserQuizAttempt.submitted_at.desc()).all()
        
        # Parse attempts and extract question counts
        attempts_data = []
        scores = []
        
        for attempt in attempts:
            # Get the quiz from the lookup dictionary
            quiz = quiz_map.get(attempt.quiz_id)
            total_questions = 0
            
            if quiz and quiz.questions_data:
                try:
                    questions = json.loads(quiz.questions_data)
                    total_questions = len(questions)
                except (json.JSONDecodeError, TypeError) as e:
                    # Fallback to num_questions if questions_data is corrupted
                    # Note: This may not match actual questions if data is inconsistent
                    total_questions = quiz.num_questions or 0
                    print(f"Warning: Failed to parse questions_data for quiz {quiz.id}: {e}")
            
            # Calculate correct answers server-side by validating against quiz data
            correct_answers = 0
            if attempt.answers and quiz and quiz.questions_data:
                try:
                    answers = json.loads(attempt.answers)
                    questions = json.loads(quiz.questions_data)
                    
                    # Validate using questionIndex (0-based) which matches submit_quiz format
                    for ans in answers:
                        question_idx = ans.get('questionIndex')
                        selected = ans.get('selectedAnswer')
                        if (isinstance(question_idx, int) and 
                            0 <= question_idx < len(questions) and 
                            selected == questions[question_idx].get('correctAnswer')):
                            correct_answers += 1
                                
                except Exception as e:
                    print(f"Warning: Failed to validate answers for attempt {attempt.id}: {e}")
                    pass
            
            attempts_data.append({
                'attemptId': attempt.id,
                'quizId': attempt.quiz_id,
                'score': attempt.score,
                'totalQuestions': total_questions,
                'correctAnswers': correct_answers,
                'timeTakenSeconds': attempt.time_taken_seconds,
                'submittedAt': attempt.submitted_at.isoformat() if attempt.submitted_at else None,
                'startedAt': attempt.started_at.isoformat() if attempt.started_at else None
            })
            
            if attempt.score is not None:
                scores.append(attempt.score)
        
        # Calculate statistics
        best_score = max(scores) if scores else 0
        average_score = sum(scores) / len(scores) if scores else 0
        
        return jsonify({
            'attempts': attempts_data,
            'totalAttempts': len(attempts_data),
            'bestScore': best_score,
            'averageScore': round(average_score, 3)
        }), 200
    
    except Exception as e:
        print(f"Error fetching quiz attempts: {e}")
        traceback.print_exc()
        return jsonify({'error': 'Failed to fetch quiz attempts'}), 500
    finally:
        db.close()


# ========== CHECKPOINT COMPLETION ROUTES ==========

@llm_bp.route('/checkpoints/<int:checkpoint_id>/complete', methods=['POST'])
@auth_required
def mark_checkpoint_complete(checkpoint_id):
    """
    Mark a checkpoint as completed for a user.

    Requires authentication via Firebase ID token in Authorization header.
    Answer validation is performed server-side against stored checkpoint data.

    Request Body:
        {
            "userId": 1,
            "selectedAnswer": "B"
        }

    Returns:
        {
            "completionId": 10,
            "checkpointId": 5,
            "isCompleted": true,
            "attemptCount": 2,
            "completedAt": "2025-12-07T18:30:00"
        }

    Status Codes:
        200: Success
        400: Invalid request data (missing userId or selectedAnswer)
        401: Unauthorized (invalid/missing token or user mismatch)
        404: User or checkpoint not found
        500: Server error
    """
    data = request.get_json()

    # Validate required fields
    if 'userId' not in data:
        return jsonify({'error': 'Missing required field: userId'}), 400
    if 'selectedAnswer' not in data:
        return jsonify({'error': 'Missing required field: selectedAnswer'}), 400

    user_id = data['userId']
    selected_answer = data['selectedAnswer']

    db = SessionLocal()
    try:
        # Verify user exists and matches authenticated user
        user = db.query(User).filter_by(id=user_id).first()
        if not user:
            return jsonify({'error': 'User not found'}), 404

        # Check that authenticated user matches the userId in request
        firebase_uid = g.firebase_user.get('uid')
        if user.firebase_uid != firebase_uid:
            return jsonify({'error': 'Unauthorized: Cannot mark checkpoint complete for another user'}), 401

        # Verify checkpoint exists
        checkpoint = db.query(Checkpoint).filter_by(id=checkpoint_id).first()
        if not checkpoint:
            return jsonify({'error': 'Checkpoint not found'}), 404

        # Parse checkpoint question data to validate answer server-side
        question_data = {}
        if checkpoint.question_data:
            try:
                question_data = json.loads(checkpoint.question_data)
            except json.JSONDecodeError:
                return jsonify({'error': 'Invalid checkpoint data'}), 500

        # Validate answer server-side - DO NOT trust client's isCorrect field
        correct_answer = question_data.get('correctAnswer')
        is_correct = (selected_answer == correct_answer) if correct_answer and selected_answer is not None else False

        # Check if completion record exists
        completion = db.query(UserCheckpointCompletion).filter_by(
            user_id=user_id,
            checkpoint_id=checkpoint_id
        ).first()

        if completion:
            # Update existing record
            completion.attempt_count += 1
            if is_correct and not completion.is_completed:
                completion.is_completed = True
                completion.completed_at = datetime.now(timezone.utc)
        else:
            # Create new completion record
            completion = UserCheckpointCompletion(
                user_id=user_id,
                checkpoint_id=checkpoint_id,
                is_completed=is_correct,
                completed_at=datetime.now(timezone.utc) if is_correct else None,
                attempt_count=1
            )
            db.add(completion)

        db.commit()
        db.refresh(completion)

        return jsonify({
            'completionId': completion.id,
            'checkpointId': checkpoint_id,
            'isCompleted': completion.is_completed,
            'attemptCount': completion.attempt_count,
            'completedAt': completion.completed_at.isoformat() if completion.completed_at else None
        }), 200

    except Exception as e:
        db.rollback()
        print(f"Error marking checkpoint complete: {e}")
        traceback.print_exc()
        return jsonify({'error': 'Failed to mark checkpoint complete'}), 500
    finally:
        db.close()


@llm_bp.route('/videos/<int:video_id>/checkpoint-progress', methods=['GET'])
@auth_required
def get_checkpoint_progress(video_id):
    """
    Get checkpoint completion progress for a user on a specific video.

    Requires authentication via Firebase ID token in Authorization header.

    Query Parameters:
        userId: User ID (required)

    Returns:
        {
            "videoId": 5,
            "totalCheckpoints": 10,
            "completedCheckpoints": 3,
            "progressPercentage": 30,
            "completions": [
                {
                    "checkpointId": 1,
                    "isCompleted": true,
                    "attemptCount": 2,
                    "completedAt": "2025-12-07T18:30:00"
                },
                ...
            ]
        }

    Status Codes:
        200: Success
        400: Missing userId parameter
        401: Unauthorized (invalid/missing token or user mismatch)
        404: Video not found
        500: Server error
    """
    user_id = request.args.get('userId')
    if not user_id:
        return jsonify({'error': 'Missing required parameter: userId'}), 400

    try:
        user_id = int(user_id)
    except ValueError:
        return jsonify({'error': 'Invalid userId parameter'}), 400

    db = SessionLocal()
    try:
        # Verify user exists and matches authenticated user
        user = db.query(User).filter_by(id=user_id).first()
        if not user:
            return jsonify({'error': 'User not found'}), 404

        # Check that authenticated user matches the userId in request
        firebase_uid = g.firebase_user.get('uid')
        if user.firebase_uid != firebase_uid:
            return jsonify({'error': 'Unauthorized: Cannot get progress for another user'}), 401

        # Verify video exists
        video = db.query(Video).filter_by(id=video_id).first()
        if not video:
            return jsonify({'error': 'Video not found'}), 404

        # Get all checkpoints for this video
        checkpoints = db.query(Checkpoint).filter_by(video_id=video_id).all()
        total_checkpoints = len(checkpoints)

        if total_checkpoints == 0:
            return jsonify({
                'videoId': video_id,
                'totalCheckpoints': 0,
                'completedCheckpoints': 0,
                'progressPercentage': 0,
                'completions': []
            }), 200

        # Get completion records for this user
        completions = db.query(UserCheckpointCompletion).filter(
            UserCheckpointCompletion.user_id == user_id,
            UserCheckpointCompletion.checkpoint_id.in_([c.id for c in checkpoints])
        ).all()

        # Build completion map
        completion_map = {c.checkpoint_id: c for c in completions}

        # Count completed checkpoints
        completed_count = sum(1 for c in completions if c.is_completed)
        progress_percentage = (completed_count / total_checkpoints * 100)

        # Build response
        completion_data = []
        for checkpoint in checkpoints:
            completion = completion_map.get(checkpoint.id)
            completion_data.append({
                'checkpointId': checkpoint.id,
                'isCompleted': completion.is_completed if completion else False,
                'attemptCount': completion.attempt_count if completion else 0,
                'completedAt': completion.completed_at.isoformat() if completion and completion.completed_at else None
            })

        return jsonify({
            'videoId': video_id,
            'totalCheckpoints': total_checkpoints,
            'completedCheckpoints': completed_count,
            'progressPercentage': round(progress_percentage, 1),
            'completions': completion_data
        }), 200

    except Exception as e:
        print(f"Error getting checkpoint progress: {e}")
        traceback.print_exc()
        return jsonify({'error': 'Failed to get checkpoint progress'}), 500
    finally:
        db.close()
