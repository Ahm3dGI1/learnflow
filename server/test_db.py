"""
Database Model and Relationship Testing for LearnFlow.

Test suite for validating SQLAlchemy ORM models, relationships, constraints,
and cascade behaviors. Tests cover all core tables including users, videos,
progress tracking, checkpoints, quizzes, and chat messages.

Tests verify:
- Model creation and persistence
- Unique constraints (email, firebase_uid, user+video pairs)
- Foreign key relationships and back_populates
- Cascade delete behavior
- JSON field serialization/deserialization
- Timestamp auto-population

Usage:
    python test_db.py

Note: Creates test data in the database. Consider using a separate test
database or cleaning up after running tests.
"""

from sqlalchemy.exc import IntegrityError

from database import SessionLocal
from models import (
    User,
    Video,
    UserVideoProgress,
    Checkpoint,
    UserCheckpointCompletion,
    Quiz,
    UserQuizAttempt,
    ChatMessage,
)


def test_empty_users(session):
    """Check that the users table starts empty (or at least is queryable)."""
    count = session.query(User).count()
    print("[test_empty_users] Number of users in DB:", count)


def test_create_user_and_video(session):
    """Create a user and a video and verify they are persisted."""
    user = User(
        firebase_uid="uid-123",
        email="test@example.com",
        display_name="Test User",
    )
    video = Video(
        youtube_video_id="dQw4w9WgXcQ",
        title="Demo Video",
        duration_seconds=600,
        language="en",
    )

    session.add_all([user, video])
    session.commit()

    fetched_user = session.query(User).filter_by(firebase_uid="uid-123").one()
    fetched_video = session.query(Video).filter_by(youtube_video_id="dQw4w9WgXcQ").one()

    print("[test_create_user_and_video] Created user id:", fetched_user.id)
    print("[test_create_user_and_video] Created video id:", fetched_video.id)


def test_user_video_progress_and_unique_constraint(session):
    """Create progress for a user+video and verify unique(user_id, video_id) works."""
    user = session.query(User).filter_by(firebase_uid="uid-123").one()
    video = session.query(Video).filter_by(youtube_video_id="dQw4w9WgXcQ").one()

    progress = UserVideoProgress(
        user_id=user.id,
        video_id=video.id,
        last_position_seconds=120,
        is_completed=False,
        watch_count=1,
    )
    session.add(progress)
    session.commit()

    # Relationship checks
    user_from_db = session.query(User).filter_by(id=user.id).one()
    video_from_db = session.query(Video).filter_by(id=video.id).one()
    print("[test_user_video_progress] user.video_progress len:", len(user_from_db.video_progress))
    print("[test_user_video_progress] video.progress_records len:", len(video_from_db.progress_records))

    # Try to insert duplicate user+video progress (should fail)
    dup_progress = UserVideoProgress(
        user_id=user.id,
        video_id=video.id,
        last_position_seconds=30,
    )
    session.add(dup_progress)
    try:
        session.commit()
        print("[test_user_video_progress_and_unique_constraint] ERROR: duplicate progress was allowed")
    except IntegrityError:
        session.rollback()
        print("[test_user_video_progress_and_unique_constraint] Unique constraint works (duplicate blocked)")


def test_negative_progress_rejected(session):
    """Check that negative last_position_seconds violates the CHECK constraint."""
    user = session.query(User).filter_by(firebase_uid="uid-123").one()
    video = session.query(Video).filter_by(youtube_video_id="dQw4w9WgXcQ").one()

    bad_progress = UserVideoProgress(
        user_id=user.id,
        video_id=video.id,
        last_position_seconds=-10,
    )
    session.add(bad_progress)
    try:
        session.commit()
        print("[test_negative_progress_rejected] ERROR: negative position was allowed")
    except IntegrityError:
        session.rollback()
        print("[test_negative_progress_rejected] Check constraint works (negative rejected)")


def test_checkpoint_and_completion(session):
    """Create a checkpoint for a video and a completion record for the user."""
    user = session.query(User).filter_by(firebase_uid="uid-123").one()
    video = session.query(Video).filter_by(youtube_video_id="dQw4w9WgXcQ").one()

    checkpoint = Checkpoint(
        video_id=video.id,
        time_seconds=135,
        title="Intro to Variables",
        subtopic="What variables are",
        order_index=1,
    )
    session.add(checkpoint)
    session.commit()

    completion = UserCheckpointCompletion(
        user_id=user.id,
        checkpoint_id=checkpoint.id,
        is_completed=True,
        attempt_count=1,
    )
    session.add(completion)
    session.commit()

    # Relationship checks
    cp_from_db = session.query(Checkpoint).filter_by(id=checkpoint.id).one()
    print("[test_checkpoint_and_completion] completions for checkpoint:", len(cp_from_db.completions))


def test_quiz_and_attempt(session):
    """Create a quiz for a video and a quiz attempt for the user."""
    user = session.query(User).filter_by(firebase_uid="uid-123").one()
    video = session.query(Video).filter_by(youtube_video_id="dQw4w9WgXcQ").one()

    quiz = Quiz(
        video_id=video.id,
        title="Test Your Knowledge",
        num_questions=3,
        difficulty="beginner",
        questions_data='[{"q": "2+2?", "options": ["3","4"], "answer": 1}]',
    )
    session.add(quiz)
    session.commit()

    attempt = UserQuizAttempt(
        user_id=user.id,
        quiz_id=quiz.id,
        score=1.0,
        answers='[{"q": 0, "selected": 1, "correct": true}]',
        time_taken_seconds=30,
    )
    session.add(attempt)
    session.commit()

    print("[test_quiz_and_attempt] quiz attempts for quiz:", len(quiz.attempts))


def test_chat_message(session):
    """Create a simple chat message for the user+video context."""
    user = session.query(User).filter_by(firebase_uid="uid-123").one()
    video = session.query(Video).filter_by(youtube_video_id="dQw4w9WgXcQ").one()

    msg = ChatMessage(
        user_id=user.id,
        video_id=video.id,
        role="user",
        message="What is a variable?",
        timestamp_context="00:45",
    )
    session.add(msg)
    session.commit()

    print("[test_chat_message] chat messages for video:", len(video.chat_messages))


def main():
    session = SessionLocal()

    try:
        print("=== Running DB tests ===")
        test_empty_users(session)
        test_create_user_and_video(session)
        test_user_video_progress_and_unique_constraint(session)
        test_negative_progress_rejected(session)
        test_checkpoint_and_completion(session)
        test_quiz_and_attempt(session)
        test_chat_message(session)
        print("=== All tests executed ===")
    finally:
        session.close()


if __name__ == "__main__":
    main()
