from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get database configuration from environment
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./learnflow.db")
SQL_ECHO = os.getenv("SQL_ECHO", "True").lower() in ("true", "1", "yes")

engine = create_engine(
    DATABASE_URL,
    echo=SQL_ECHO,
    future=True,
)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
)