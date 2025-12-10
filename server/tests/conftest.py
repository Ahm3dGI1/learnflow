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
    direct database access. Uses transaction rollback for test isolation.
    """
    # Create a connection and begin a transaction
    connection = engine.connect()
    transaction = connection.begin()

    # Create session bound to this connection
    db = SessionLocal(bind=connection)

    yield db

    # Rollback transaction and close connection for isolation
    db.close()
    transaction.rollback()
    connection.close()
