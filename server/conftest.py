import pytest
from database import SessionLocal, engine
from models import Base


@pytest.fixture(scope="session", autouse=True)
def setup_db():
    """Initialize the DB schema for tests run at the server root.

    This mirrors `server/tests/conftest.py` but for top-level tests like
    `server/test_db.py`. It creates all tables at session start and drops
    on teardown.
    """
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def session():
    """Provide a SQLAlchemy session for tests that require direct DB access."""
    s = SessionLocal()
    try:
        yield s
    finally:
        s.close()
