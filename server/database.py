from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

DATABASE_URL = "sqlite:///./learnflow.db"  # DB file in server/

engine = create_engine(
    DATABASE_URL,
    echo=True,      # shows SQL in console; set False later
    future=True,
)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
)