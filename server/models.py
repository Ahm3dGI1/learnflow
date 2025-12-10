"""
LearnFlow database schema using SQLAlchemy ORM.

Required core tables based on project features:
- users
- videos (with cached transcript and AI-generated content)
- user_video_progress
- checkpoints
- user_checkpoint_completion
- quizzes
- user_quiz_attempts
- chat_messages
"""

from datetime import datetime

from sqlalchemy import (
    Column, Integer, String, Text, Boolean,
    ForeignKey, DateTime, UniqueConstraint, Index, CheckConstraint, Float,  
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    firebase_uid = Column(String(128), unique=True, nullable=False)  # from Firebase
    email = Column(String(255), nullable=False)
    display_name = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow)  # when the user was created
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow) 

    # Relationships
    video_progress = relationship("UserVideoProgress", back_populates="user")
    checkpoint_completions = relationship("UserCheckpointCompletion", back_populates="user")
    quiz_attempts = relationship("UserQuizAttempt", back_populates="user")
    chat_messages = relationship("ChatMessage", back_populates="user")

    __table_args__ = (
        UniqueConstraint("email", name="uq_user_email"),
    )

    def __repr__(self):
        return f"<User id={self.id} email={self.email!r}>"


class Video(Base):
    __tablename__ = "videos"

    id = Column(Integer, primary_key=True)

    youtube_video_id = Column(String(32), unique=True, nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    duration_seconds = Column(Integer, CheckConstraint("duration_seconds >= 0"), default=0)
    language = Column(String(8))
    thumbnail_url = Column(Text)

    # Cached transcript (stored as JSON string or plain text)
    transcript = Column(Text)
    transcript_cached_at = Column(DateTime)
    # Cached AI outputs (stored as JSON strings)
    checkpoints_data = Column(Text)  # e.g. JSON list of checkpoints
    quiz_data = Column(Text)         # e.g. JSON for a quick default quiz
    summary = Column(Text)           # AI-generated summary
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    total_views = Column(Integer, default=0)

    # relationships
    progress_records = relationship("UserVideoProgress", back_populates="video")
    checkpoints = relationship("Checkpoint", back_populates="video", cascade="all, delete-orphan")
    quizzes = relationship("Quiz", back_populates="video")
    chat_messages = relationship("ChatMessage", back_populates="video")

    def __repr__(self):
        return f"<Video id={self.id} title={self.title!r}>"


class UserVideoProgress(Base):
    __tablename__ = "user_video_progress"

    id = Column(Integer, primary_key=True)

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    video_id = Column(Integer, ForeignKey("videos.id"), nullable=False, index=True)

    # Progress tracking
    last_position_seconds = Column(Integer, nullable=False, default=0)
    is_completed = Column(Boolean, nullable=False, default=False)
    watch_count = Column(Integer, nullable=False, default=0)

    # Timestamps
    first_watched_at = Column(DateTime, default=datetime.utcnow)
    last_watched_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="video_progress")
    video = relationship("Video", back_populates="progress_records")

    __table_args__ = (
        UniqueConstraint("user_id", "video_id", name="uq_user_video_progress"),
        Index("ix_user_video_progress_last_watched_at", "last_watched_at"),
    )

    def __repr__(self):
        return (
            f"<UserVideoProgress user_id={self.user_id} "
            f"video_id={self.video_id} pos={self.last_position_seconds}>"
        )

class Checkpoint(Base):
    __tablename__ = "checkpoints"

    id = Column(Integer, primary_key=True)
    video_id = Column(Integer, ForeignKey("videos.id"), nullable=False, index=True)
    time_seconds = Column(Integer, CheckConstraint("time_seconds >= 0"), nullable=False)

    title = Column(String(255))                     # e.g., "Introduction to Variables"
    subtopic = Column(Text)                         # e.g., explanation text
    order_index = Column(Integer)                   # sequence 1, 2, 3, ...
    question_data = Column(Text)                    # JSON: {question, options, correctAnswer, explanation}
    # meta data
    created_at = Column(DateTime, default=datetime.utcnow)

    video = relationship("Video", back_populates="checkpoints")
    completions = relationship(
        "UserCheckpointCompletion",
        back_populates="checkpoint",
        cascade="all, delete-orphan",
    )

    def __repr__(self):
        return (
            f"<Checkpoint id={self.id} video_id={self.video_id} "
            f"time={self.time_seconds}>"
        )

class UserCheckpointCompletion(Base):
    __tablename__ = "user_checkpoint_completion"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    checkpoint_id = Column(Integer, ForeignKey("checkpoints.id"), nullable=False, index=True)

    is_completed = Column(Boolean, nullable=False, default=False)
    completed_at = Column(DateTime)
    attempt_count = Column(Integer, nullable=False, default=0)

    user = relationship("User", back_populates="checkpoint_completions")
    checkpoint = relationship("Checkpoint", back_populates="completions")

    __table_args__ = (
        UniqueConstraint("user_id", "checkpoint_id", name="uq_user_checkpoint_completion"),
    )

    def __repr__(self):
        return (
            f"<UserCheckpointCompletion user_id={self.user_id} "
            f"checkpoint_id={self.checkpoint_id} completed={self.is_completed}>"
        )
    
class Quiz(Base):
    __tablename__ = "quizzes"

    id = Column(Integer, primary_key=True)
    video_id = Column(Integer, ForeignKey("videos.id"), nullable=False, index=True)

    title = Column(String(255), nullable=False, default="Test Your Knowledge")
    num_questions = Column(Integer)
    difficulty = Column(String(32))  # "beginner" | "intermediate" | "advanced"

    # Full quiz content as JSON blob
    questions_data = Column(Text)

    created_at = Column(DateTime, default=datetime.utcnow)

    video = relationship("Video", back_populates="quizzes")
    attempts = relationship("UserQuizAttempt", back_populates="quiz")

    def __repr__(self):
        return f"<Quiz id={self.id} video_id={self.video_id}>"


class UserQuizAttempt(Base):
    """
    A record of a user's attempt at a quiz.
    """

    __tablename__ = "user_quiz_attempts"

    id = Column(Integer, primary_key=True)

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"), nullable=False, index=True)

    score = Column(Float)  # e.g., 0.8 for 80%
    answers = Column(Text)  # JSON blob of selected answers and correctness
    time_taken_seconds = Column(Integer)

    started_at = Column(DateTime, default=datetime.utcnow)
    submitted_at = Column(DateTime)

    user = relationship("User", back_populates="quiz_attempts")
    quiz = relationship("Quiz", back_populates="attempts")

    def __repr__(self):
        return (
            f"<UserQuizAttempt user_id={self.user_id} "
            f"quiz_id={self.quiz_id} score={self.score}>"
        )

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True)

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    video_id = Column(Integer, ForeignKey("videos.id"), nullable=False, index=True)

    role = Column(String(32), nullable=False)  # "user" | "assistant"
    message = Column(Text, nullable=False)
    timestamp_context = Column(String(32))  # e.g., "05:30"

    session_id = Column(String(64))  # optional conversation grouping
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="chat_messages")
    video = relationship("Video", back_populates="chat_messages")

    def __repr__(self):
        return (
            f"<ChatMessage id={self.id} user_id={self.user_id} role={self.role}>"
        )