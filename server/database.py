"""
Database configuration and session management for LearnFlow.

This module sets up the SQLAlchemy engine and session factory for database
operations. It configures the database connection using environment variables
and provides a SessionLocal class for creating database sessions.

The database can be configured via environment variables:
    DATABASE_URL: Database connection string (default: SQLite)
    SQL_ECHO: Whether to log SQL queries (default: True)

Usage:
    from database import SessionLocal
    
    db = SessionLocal()
    try:
        # Perform database operations
        db.query(Model).all()
        db.commit()
    finally:
        db.close()
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Get database configuration from environment variables
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./learnflow.db")
SQL_ECHO = os.getenv("SQL_ECHO", "True").lower() in ("true", "1", "yes")

# Create database engine with configuration
engine = create_engine(
    DATABASE_URL,
    echo=SQL_ECHO,  # Log SQL queries for debugging
    future=True,  # Use SQLAlchemy 2.0 style
)

# Create session factory for database operations
SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,  # Don't auto-flush before queries
    autocommit=False,  # Require explicit commits
)


def init_db():
    """
    Initialize database tables if they don't exist.

    This function is called automatically when the app starts to ensure
    all tables are created before handling any requests. It's safe to call
    multiple times - existing tables won't be affected.
    """
    from models import Base

    # Create all tables defined in models.py
    # This is idempotent - won't recreate existing tables
    Base.metadata.create_all(bind=engine)
    print("✓ Database tables initialized")