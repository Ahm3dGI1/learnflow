"""
Basic tests for checkpoint completion service and routes.

These tests are lightweight and intended for local verification.
Run them with `python -m pytest server/tests` if pytest is installed, or
run directly as a script for manual checks.
"""
from database import SessionLocal
from models import User, Video, Checkpoint
from services.checkpoint_completion_service import (
    mark_checkpoint_complete,
    get_checkpoint_progress,
)


def setup_sample(session):
    user = session.query(User).filter_by(firebase_uid='test-uid').one_or_none()
    if not user:
        user = User(firebase_uid='test-uid', email='test@example.com', display_name='Tester')
        session.add(user)
        session.commit()

    video = session.query(Video).filter_by(youtube_video_id='vid-test-1').one_or_none()
    if not video:
        video = Video(youtube_video_id='vid-test-1', title='Test Video', duration_seconds=120)
        session.add(video)
        session.commit()

    cp = session.query(Checkpoint).filter_by(video_id=video.id, time_seconds=10).one_or_none()
    if not cp:
        cp = Checkpoint(video_id=video.id, time_seconds=10, title='CP1', order_index=1)
        session.add(cp)
        session.commit()

    return user, video, cp


def test_mark_and_get():
    session = SessionLocal()
    try:
        user, video, cp = setup_sample(session)
        # mark completion
        uc = mark_checkpoint_complete(user.id, cp.id)
        assert uc.user_id == user.id
        assert uc.checkpoint_id == cp.id

        # get progress
        progress = get_checkpoint_progress(user.id, video.id)
        assert progress['total'] >= 1
        assert cp.id in progress['completed_ids']
    finally:
        session.close()


if __name__ == '__main__':
    test_mark_and_get()
    print('Test completed')
