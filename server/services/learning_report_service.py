"""
Learning report service for LearnFlow.
Handles business logic for aggregating user learning statistics and progress.
Generates comprehensive learning reports showing user achievements and progress.
"""

from datetime import datetime, timedelta, date
from sqlalchemy import func
from models import (
    User, UserVideoProgress, UserQuizAttempt, UserCheckpointCompletion,
    Video, Quiz, Checkpoint
)


def get_learning_report(user_id, db):
    """
    Get comprehensive learning report for a user.
    
    Aggregates statistics about:
    - Total videos watched and completion rate
    - Total quiz attempts and average score
    - Checkpoints completed
    - Learning streaks and timeline
    
    Args:
        user_id (int): Database user ID
        db: Database session
    
    Returns:
        dict: Comprehensive learning report with statistics
        {
            "userId": 1,
            "totalVideosWatched": 5,
            "totalVideosCompleted": 3,
            "completionRate": 60.0,
            "totalWatchTime": 3600,  # in seconds
            "totalQuizAttempts": 12,
            "totalQuizzesTaken": 3,
            "averageQuizScore": 78.5,
            "highestQuizScore": 95.0,
            "lowestQuizScore": 65.0,
            "totalCheckpointsCompleted": 15,
            "recentActivity": [
                {
                    "date": "2025-01-20",
                    "videosWatched": 2,
                    "quizAttempts": 1,
                    "checkpointsCompleted": 3
                }
            ],
            "learningStreak": 5,  # days
            "lastActivityDate": "2025-01-20"
        }
    
    Raises:
        ValueError: If user doesn't exist
    """
    # Check if user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise ValueError(f"User with id {user_id} not found")
    
    # Get video progress statistics
    video_progress = db.query(UserVideoProgress).filter(
        UserVideoProgress.user_id == user_id
    ).all()
    
    total_videos_watched = len(video_progress)
    total_videos_completed = sum(1 for vp in video_progress if vp.is_completed)
    completion_rate = (total_videos_completed / total_videos_watched * 100) if total_videos_watched > 0 else 0
    
    # Calculate total watch time
    total_watch_time = sum(vp.last_position_seconds for vp in video_progress)
    
    # Get quiz statistics
    quiz_attempts = db.query(UserQuizAttempt).filter(
        UserQuizAttempt.user_id == user_id
    ).all()
    
    total_quiz_attempts = len(quiz_attempts)
    
    # Get unique quizzes taken
    quizzes_taken = db.query(func.count(func.distinct(UserQuizAttempt.quiz_id))).filter(
        UserQuizAttempt.user_id == user_id
    ).scalar()
    quizzes_taken = quizzes_taken or 0
    
    # Calculate quiz scores
    if quiz_attempts:
        scores = [qa.score for qa in quiz_attempts if qa.score is not None]
        average_quiz_score = sum(scores) / len(scores) if scores else 0
        highest_quiz_score = max(scores) if scores else 0
        lowest_quiz_score = min(scores) if scores else 0
    else:
        average_quiz_score = 0
        highest_quiz_score = 0
        lowest_quiz_score = 0
    
    # Convert scores to percentages
    if average_quiz_score > 0:
        average_quiz_score = average_quiz_score * 100
    if highest_quiz_score > 0:
        highest_quiz_score = highest_quiz_score * 100
    if lowest_quiz_score > 0:
        lowest_quiz_score = lowest_quiz_score * 100
    
    # Get checkpoint completion statistics
    checkpoint_completions = db.query(UserCheckpointCompletion).filter(
        UserCheckpointCompletion.user_id == user_id,
        UserCheckpointCompletion.is_completed == True
    ).all()
    
    total_checkpoints_completed = len(checkpoint_completions)
    
    # Calculate learning streak (consecutive days with activity)
    learning_streak = _calculate_learning_streak(user_id, db)
    
    # Get recent activity (last 7 days)
    recent_activity = _get_recent_activity(user_id, db, days=7)
    
    # Get last activity date
    last_activity_date = _get_last_activity_date(user_id, db)
    
    return {
        "userId": user_id,
        "totalVideosWatched": total_videos_watched,
        "totalVideosCompleted": total_videos_completed,
        "completionRate": round(completion_rate, 1),
        "totalWatchTime": total_watch_time,  # in seconds
        "totalQuizAttempts": total_quiz_attempts,
        "totalQuizzesTaken": quizzes_taken,
        "averageQuizScore": round(average_quiz_score, 1),
        "highestQuizScore": round(highest_quiz_score, 1),
        "lowestQuizScore": round(lowest_quiz_score, 1),
        "totalCheckpointsCompleted": total_checkpoints_completed,
        "recentActivity": recent_activity,
        "learningStreak": learning_streak,
        "lastActivityDate": last_activity_date,
    }


def _calculate_learning_streak(user_id, db):
    """
    Calculate the current learning streak (consecutive days with activity).
    
    Args:
        user_id (int): Database user ID
        db: Database session
    
    Returns:
        int: Number of consecutive days with learning activity
    """
    # Get all unique dates with activity using database-level queries
    activity_dates = set()

    # Helper to coerce various DB return types to a date object
    def _to_date_val(val):
        if val is None:
            return None
        if isinstance(val, datetime):
            return val.date()
        if isinstance(val, date):
            return val
        if isinstance(val, str):
            try:
                return datetime.fromisoformat(val).date()
            except Exception:
                return None
        return None

    # Get unique dates from video progress updates
    video_dates = db.query(func.date(UserVideoProgress.last_watched_at)).filter(
        UserVideoProgress.user_id == user_id,
        UserVideoProgress.last_watched_at != None
    ).distinct().all()
    activity_dates.update(_to_date_val(d[0]) for d in video_dates if _to_date_val(d[0]) is not None)

    # Get unique dates from quiz attempts
    quiz_dates = db.query(func.date(UserQuizAttempt.submitted_at)).filter(
        UserQuizAttempt.user_id == user_id,
        UserQuizAttempt.submitted_at != None
    ).distinct().all()
    activity_dates.update(_to_date_val(d[0]) for d in quiz_dates if _to_date_val(d[0]) is not None)

    # Get unique dates from checkpoint completions
    checkpoint_dates = db.query(func.date(UserCheckpointCompletion.completed_at)).filter(
        UserCheckpointCompletion.user_id == user_id,
        UserCheckpointCompletion.is_completed == True,
        UserCheckpointCompletion.completed_at != None
    ).distinct().all()
    activity_dates.update(_to_date_val(d[0]) for d in checkpoint_dates if _to_date_val(d[0]) is not None)
    
    if not activity_dates:
        return 0
    
    # Sort dates in descending order
    sorted_dates = sorted(activity_dates, reverse=True)
    
    # Check if there's recent activity (within last day or today)
    today = datetime.utcnow().date()
    if sorted_dates[0] != today and sorted_dates[0] != today - timedelta(days=1):
        return 0  # Streak is broken
    
    # Count consecutive days
    streak = 1
    current_date = sorted_dates[0]
    for i in range(1, len(sorted_dates)):
        prev_date = sorted_dates[i]
        if current_date - prev_date == timedelta(days=1):
            streak += 1
            current_date = prev_date
        else:
            break
    
    return streak


def _get_recent_activity(user_id, db, days=7):
    """
    Get daily activity breakdown for the last N days.
    
    Args:
        user_id (int): Database user ID
        db: Database session
        days (int): Number of days to look back
    
    Returns:
        list: List of daily activity objects
    """
    activity_by_date = {}
    
    # Get cutoff date
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    
    # Get video watch events
    video_progress = db.query(UserVideoProgress).filter(
        UserVideoProgress.user_id == user_id,
        UserVideoProgress.last_watched_at >= cutoff_date
    ).all()
    
    for vp in video_progress:
        date = vp.last_watched_at.date().isoformat()
        if date not in activity_by_date:
            activity_by_date[date] = {
                "date": date,
                "videosWatched": 0,
                "quizAttempts": 0,
                "checkpointsCompleted": 0
            }
        activity_by_date[date]["videosWatched"] += 1
    
    # Get quiz attempts
    quiz_attempts = db.query(UserQuizAttempt).filter(
        UserQuizAttempt.user_id == user_id,
        UserQuizAttempt.submitted_at >= cutoff_date
    ).all()
    
    for qa in quiz_attempts:
        date = qa.submitted_at.date().isoformat() if qa.submitted_at else None
        if date:
            if date not in activity_by_date:
                activity_by_date[date] = {
                    "date": date,
                    "videosWatched": 0,
                    "quizAttempts": 0,
                    "checkpointsCompleted": 0
                }
            activity_by_date[date]["quizAttempts"] += 1
    
    # Get checkpoint completions
    checkpoint_completions = db.query(UserCheckpointCompletion).filter(
        UserCheckpointCompletion.user_id == user_id,
        UserCheckpointCompletion.is_completed == True,
        UserCheckpointCompletion.completed_at >= cutoff_date
    ).all()
    
    for cc in checkpoint_completions:
        date = cc.completed_at.date().isoformat() if cc.completed_at else None
        if date:
            if date not in activity_by_date:
                activity_by_date[date] = {
                    "date": date,
                    "videosWatched": 0,
                    "quizAttempts": 0,
                    "checkpointsCompleted": 0
                }
            activity_by_date[date]["checkpointsCompleted"] += 1
    
    # Sort by date descending and return as list
    sorted_activity = sorted(
        activity_by_date.values(),
        key=lambda x: x["date"],
        reverse=True
    )
    
    return sorted_activity


def _get_last_activity_date(user_id, db):
    """
    Get the most recent activity date for the user.
    
    Args:
        user_id (int): Database user ID
        db: Database session
    
    Returns:
        str: ISO format date string or None if no activity
    """
    last_dates = []
    
    # Check last video watch
    last_video = db.query(UserVideoProgress).filter(
        UserVideoProgress.user_id == user_id
    ).order_by(UserVideoProgress.last_watched_at.desc()).first()
    if last_video and last_video.last_watched_at:
        last_dates.append(last_video.last_watched_at)
    
    # Check last quiz attempt
    last_quiz = db.query(UserQuizAttempt).filter(
        UserQuizAttempt.user_id == user_id
    ).order_by(UserQuizAttempt.submitted_at.desc()).first()
    if last_quiz and last_quiz.submitted_at:
        last_dates.append(last_quiz.submitted_at)
    
    # Check last checkpoint completion
    last_checkpoint = db.query(UserCheckpointCompletion).filter(
        UserCheckpointCompletion.user_id == user_id,
        UserCheckpointCompletion.is_completed.is_(True)
    ).order_by(UserCheckpointCompletion.completed_at.desc()).first()
    if last_checkpoint and last_checkpoint.completed_at:
        last_dates.append(last_checkpoint.completed_at)
    
    if not last_dates:
        return None
    
    # Return the most recent date
    last_date = max(last_dates)
    return last_date.date().isoformat()
