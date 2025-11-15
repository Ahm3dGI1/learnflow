from database import SessionLocal
from models import User

# Any tests cases can be done here. Later, this file should be deleted.
def main():
    session = SessionLocal()

    try:
        # Just count how many users we have -> should be 0
        count = session.query(User).count()
        print("Number of users in DB:", count)
    finally:
        session.close()

if __name__ == "__main__":
    main()
