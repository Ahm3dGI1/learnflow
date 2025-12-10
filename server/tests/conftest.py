"""
Test configuration for pytest.

This module provides test fixtures and configuration for all tests in the
tests/ directory. It sets up database sessions and ensures proper cleanup.
"""

import sys
from pathlib import Path

# Add parent directory to path so we can import from server root
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
from database import engine, SessionLocal
from models import Base


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """
    Initialize the test database schema.

    This fixture runs once per test session and ensures all tables are
    created before any tests run. It drops all tables after all tests complete.
    """
    # Drop all existing tables to ensure clean state
    Base.metadata.drop_all(bind=engine)
    # Create all tables
    Base.metadata.create_all(bind=engine)
    yield
    # Cleanup: drop all tables after tests complete
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def session():
    """
    Provide a fresh database session for each test.

    This fixture provides a SQLAlchemy session for tests that need
    direct database access. After each test, it cleans up all data
    to ensure test isolation.
    """
    db = SessionLocal()

    yield db

    # Clean up: rollback any uncommitted changes and close
    db.rollback()

    # Clean up all tables after each test to ensure isolation
    # This prevents data from one test affecting another
    from models import (
        ChatMessage, UserQuizAttempt, UserCheckpointCompletion,
        UserVideoProgress, Quiz, Checkpoint, Video, User
    )

    # Delete in order to respect foreign key constraints
    db.query(ChatMessage).delete()
    db.query(UserQuizAttempt).delete()
    db.query(UserCheckpointCompletion).delete()
    db.query(UserVideoProgress).delete()
    db.query(Quiz).delete()
    db.query(Checkpoint).delete()
    db.query(Video).delete()
    db.query(User).delete()
    db.commit()

    db.close()
