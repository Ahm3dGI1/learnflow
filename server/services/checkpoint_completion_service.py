"""
Checkpoint completion service.

Provides functions to mark a checkpoint complete for a user and to fetch
checkpoint progress for a user+video.
"""
from sqlalchemy.exc import IntegrityError
from datetime import datetime

from database import SessionLocal
from models import UserCheckpointCompletion, Checkpoint


def mark_checkpoint_complete(user_id: int, checkpoint_id: int):
    """Mark the given checkpoint as completed for the user.

    This is idempotent: if a completion exists it will be updated, otherwise
    a new row will be created.

    Returns the UserCheckpointCompletion instance.
    """
    db = SessionLocal()
    try:
        existing = db.query(UserCheckpointCompletion).filter_by(
            user_id=user_id, checkpoint_id=checkpoint_id
        ).one_or_none()

        if existing:
            if not existing.is_completed:
                existing.is_completed = True
                existing.completed_at = datetime.utcnow()
            existing.attempt_count = (existing.attempt_count or 0) + 1
            db.add(existing)
            db.commit()
            db.refresh(existing)
            return existing

        # create new completion
        uc = UserCheckpointCompletion(
            user_id=user_id,
            checkpoint_id=checkpoint_id,
            is_completed=True,
            completed_at=datetime.utcnow(),
            attempt_count=1,
        )
        db.add(uc)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            # another process may have inserted; fetch and return
            existing = db.query(UserCheckpointCompletion).filter_by(
                user_id=user_id, checkpoint_id=checkpoint_id
            ).one_or_none()
            if existing:
                return existing
            raise
        db.refresh(uc)
        return uc
    finally:
        db.close()


def get_checkpoint_progress(user_id: int, video_id: int):
    """Return checkpoint progress for the user on a video.

    Returns a dict: { total, completed_count, completed_ids }
    """
    db = SessionLocal()
    try:
        total = db.query(Checkpoint).filter_by(video_id=video_id).count()

        completed_rows = (
            db.query(UserCheckpointCompletion)
            .join(Checkpoint, UserCheckpointCompletion.checkpoint_id == Checkpoint.id)
            .filter(UserCheckpointCompletion.user_id == user_id, Checkpoint.video_id == video_id, UserCheckpointCompletion.is_completed == True)
            .all()
        )

        completed_ids = [r.checkpoint_id for r in completed_rows]

        return {
            "total": total,
            "completed_count": len(completed_ids),
            "completed_ids": completed_ids,
        }
    finally:
        db.close()
