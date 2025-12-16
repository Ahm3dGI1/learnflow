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
    """
    Represents a registered user in the LearnFlow platform.

    Users are authenticated via Firebase and can track video progress,
    complete checkpoints, take quizzes, and interact with the AI chat.

    Attributes:
        id: Primary key.
        firebase_uid: Unique identifier from Firebase Authentication.
        email: User's email address (unique).
        display_name: User's display name.
        created_at: Timestamp when the user was created.
        updated_at: Timestamp of the last update.
    """

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
    """
    Represents a YouTube video in the LearnFlow platform.

    Stores video metadata, cached transcript, and AI-generated content
    such as checkpoints, quizzes, and summaries.

    Attributes:
        id: Primary key.
        youtube_video_id: YouTube video ID (e.g., 'dQw4w9WgXcQ').
        title: Video title.
        description: Video description.
        duration_seconds: Video duration in seconds.
        language: Primary language code (e.g., 'en').
        thumbnail_url: URL to the video thumbnail.
        transcript: Cached transcript text or JSON.
        transcript_cached_at: When the transcript was cached.
        checkpoints_data: JSON string of AI-generated checkpoints.
        quiz_data: JSON string of default quiz data.
        summary: AI-generated video summary.
        created_at: Timestamp when the video was added.
        updated_at: Timestamp of the last update.
        total_views: Total view count across all users.
    """

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
    """
    Tracks a user's watching progress for a specific video.

    Records the user's last position, completion status, and watch history
    to enable resume functionality and progress tracking.

    Attributes:
        id: Primary key.
        user_id: Foreign key to the user.
        video_id: Foreign key to the video.
        last_position_seconds: Last watched position in seconds.
        is_completed: Whether the user has completed the video.
        watch_count: Number of times the user has watched the video.
        first_watched_at: Timestamp of first watch.
        last_watched_at: Timestamp of most recent watch.
    """

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
    """
    Represents an AI-generated learning checkpoint within a video.

    Checkpoints are placed at key moments in the video and include
    comprehension questions to test the user's understanding.

    Attributes:
        id: Primary key.
        video_id: Foreign key to the video.
        time_seconds: Position in the video (in seconds) where the checkpoint appears.
        title: Checkpoint title (e.g., 'Introduction to Variables').
        subtopic: Detailed explanation or context for the checkpoint.
        order_index: Sequential order of the checkpoint (1, 2, 3, ...).
        question_data: JSON containing question, options, correctAnswer, and explanation.
        created_at: Timestamp when the checkpoint was created.
    """

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
    """
    Tracks a user's completion status for a specific checkpoint.

    Records whether the user has correctly answered the checkpoint question
    and how many attempts were needed.

    Attributes:
        id: Primary key.
        user_id: Foreign key to the user.
        checkpoint_id: Foreign key to the checkpoint.
        is_completed: Whether the user answered correctly.
        completed_at: Timestamp when the checkpoint was completed.
        attempt_count: Number of attempts made.
    """

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
    """
    Represents an AI-generated quiz for a video.

    Quizzes contain multiple-choice questions generated from the video
    content to assess user comprehension.

    Attributes:
        id: Primary key.
        video_id: Foreign key to the video.
        title: Quiz title (default: 'Test Your Knowledge').
        num_questions: Number of questions in the quiz.
        difficulty: Difficulty level ('beginner', 'intermediate', 'advanced').
        questions_data: JSON blob containing the full quiz questions and answers.
        created_at: Timestamp when the quiz was created.
    """

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
    Records a user's attempt at completing a quiz.

    Stores the user's answers, score, and timing information for each
    quiz attempt to track learning progress over time.

    Attributes:
        id: Primary key.
        user_id: Foreign key to the user.
        quiz_id: Foreign key to the quiz.
        score: Score as a decimal (e.g., 0.8 for 80%).
        answers: JSON blob of selected answers and correctness.
        time_taken_seconds: Time spent on the quiz in seconds.
        started_at: Timestamp when the quiz attempt started.
        submitted_at: Timestamp when the quiz was submitted.
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
    """
    Stores a message in the AI chat conversation for a video.

    Messages can be from the user or the AI assistant, and are grouped
    by session to maintain conversation context.

    Attributes:
        id: Primary key.
        user_id: Foreign key to the user.
        video_id: Foreign key to the video.
        role: Message sender ('user' or 'assistant').
        message: The message content.
        timestamp_context: Video timestamp context (e.g., '05:30').
        session_id: Optional conversation session identifier.
        created_at: Timestamp when the message was created.
    """

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