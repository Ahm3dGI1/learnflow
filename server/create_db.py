"""
Database initialization script for LearnFlow.

This script creates all database tables defined in the SQLAlchemy models.
It should be run once during initial setup or whenever the schema changes.

Usage:
    python create_db.py

The script will:
    1. Load the database engine configuration
    2. Create all tables defined in models.py
    3. Print confirmation message
"""

from database import engine
from models import Base


def init_db():
    """
    Initialize the database by creating all tables.

    Creates all tables defined in the SQLAlchemy Base metadata.
    If tables already exist, this operation is idempotent and will
    not raise an error or duplicate tables.

    Tables created:
        - users
        - videos
        - user_video_progress
        - checkpoints
        - user_checkpoint_completion
        - quizzes
        - user_quiz_attempts
        - chat_messages

    Returns:
        None

    Prints:
        Success message indicating database file location
    """
    Base.metadata.create_all(bind=engine)
    print("Database and tables created: learnflow.db")


if __name__ == "__main__":
    init_db()
