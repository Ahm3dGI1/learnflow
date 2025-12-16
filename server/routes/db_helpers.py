"""
Database helper functions for LLM routes.
Provides common database operations for checkpoints, quizzes, and caching.
"""

import json
from database import SessionLocal
from services import get_video_by_youtube_id, cache_checkpoints
from models import Checkpoint, Quiz
from utils.logger import get_logger

logger = get_logger(__name__)


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
                    logger.warning(f"Error parsing cached checkpoints: {e}")
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
        logger.error(f"Error reading checkpoints from database: {e}", exc_info=True)
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
                    logger.warning(f"Error parsing cached quiz: {e}")
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
        logger.error(f"Error reading quiz from database: {e}", exc_info=True)
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
        logger.error(f"Error saving quiz to database: {e}", exc_info=True)
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
        logger.error(f"Error saving checkpoints to database: {e}", exc_info=True)
        db.rollback()
        return None
    finally:
        db.close()
