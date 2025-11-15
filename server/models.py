"""
We use SQLAlchemy ORM so each table becomes a Python class and 
we interact with the database using objects instead of raw SQL.

Main concepts in this schema:
- Users (from Firebase Auth)
- Videos uploaded or added to LearnFlow
- Checkpoints (time-based quiz questions inside a video)
- Options for MCQ-type questions
- User progress while watching each video
- User answers to checkpoints
"""

from datetime import datetime

from sqlalchemy import (
    Column, Integer, String, Text, Boolean,
    ForeignKey, DateTime, UniqueConstraint
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

    videos = relationship("Video", back_populates="owner")
    video_progress = relationship("UserVideoProgress", back_populates="user")
    checkpoint_responses = relationship("UserCheckpointResponse", back_populates="user")

    def __repr__(self):
        return f"<User id={self.id} email={self.email!r}>"


class Video(Base):
    __tablename__ = "videos"

    id = Column(Integer, primary_key=True)
    owner_user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String(255), nullable=False)
    description = Column(Text)
    video_url = Column(Text, nullable=False)
    duration_seconds = Column(Integer)
    transcript = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="videos")
    checkpoints = relationship(
        "Checkpoint",
        back_populates="video",
        cascade="all, delete-orphan",
    )
    progress_records = relationship(
        "UserVideoProgress",
        back_populates="video",
    )

    def __repr__(self):
        return f"<Video id={self.id} title={self.title!r}>"


class Checkpoint(Base):
    __tablename__ = "checkpoints"

    id = Column(Integer, primary_key=True)
    video_id = Column(Integer, ForeignKey("videos.id"), nullable=False)
    time_seconds = Column(Integer, nullable=False)
    question_type = Column(String(32), default="mcq")   # 'mcq' | 'true_false' | 'open'
    question_text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    video = relationship("Video", back_populates="checkpoints")
    options = relationship(
        "CheckpointOption",
        back_populates="checkpoint",
        cascade="all, delete-orphan",
    )
    responses = relationship("UserCheckpointResponse", back_populates="checkpoint")

    def __repr__(self):
        return f"<Checkpoint id={self.id} video_id={self.video_id} t={self.time_seconds}>"


class CheckpointOption(Base):
    __tablename__ = "checkpoint_options"

    id = Column(Integer, primary_key=True)
    checkpoint_id = Column(Integer, ForeignKey("checkpoints.id"), nullable=False)
    option_text = Column(Text, nullable=False)
    is_correct = Column(Boolean, default=False, nullable=False)

    checkpoint = relationship("Checkpoint", back_populates="options")

    def __repr__(self):
        return f"<CheckpointOption id={self.id} text={self.option_text[:20]!r}>"


class UserVideoProgress(Base):
    __tablename__ = "user_video_progress"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    video_id = Column(Integer, ForeignKey("videos.id"), nullable=False)
    last_position_seconds = Column(Integer, nullable=False, default=0)
    is_completed = Column(Boolean, nullable=False, default=False)
    last_watched_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="video_progress")
    video = relationship("Video", back_populates="progress_records")

    __table_args__ = (
        UniqueConstraint("user_id", "video_id", name="uq_user_video_progress"),
    )

    def __repr__(self):
        return (
            f"<UserVideoProgress user_id={self.user_id} "
            f"video_id={self.video_id} pos={self.last_position_seconds}>"
        )


class UserCheckpointResponse(Base):
    __tablename__ = "user_checkpoint_responses"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    checkpoint_id = Column(Integer, ForeignKey("checkpoints.id"), nullable=False)
    selected_option_id = Column(Integer, ForeignKey("checkpoint_options.id"))
    is_correct = Column(Boolean, nullable=False)
    answered_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="checkpoint_responses")
    checkpoint = relationship("Checkpoint", back_populates="responses")
    selected_option = relationship("CheckpointOption")

    def __repr__(self):
        return (
            f"<UserCheckpointResponse user_id={self.user_id} "
            f"cp_id={self.checkpoint_id} correct={self.is_correct}>"
        )