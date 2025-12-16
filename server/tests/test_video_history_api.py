"""
Test suite for the Video History API.

Tests for video watch history endpoints:
- GET /api/videos/history/{firebase_uid}
- POST /api/videos/history/{firebase_uid}
- DELETE /api/videos/history/{firebase_uid}/{video_id}
- DELETE /api/videos/history/{firebase_uid}

This file uses:
- Flask test client
- unittest.mock.patch to mock Firebase token verification
- SQLAlchemy SessionLocal for DB checks and cleanup

How to run:
    cd server
    pytest tests/test_video_history_api.py -v
"""

from unittest.mock import patch
import pytest
from datetime import datetime
from app import app
from database import SessionLocal
from models import User, Video, UserVideoProgress

VERIFY_PATCH_PATH = "middleware.auth.verify_id_token"


@pytest.fixture
def client():
    """Provide a Flask test client."""
    app.testing = True
    with app.test_client() as client:
        yield client


@pytest.fixture
def db():
    """Provide a database session for tests."""
    session = SessionLocal()
    yield session
    session.close()


def cleanup_test_data(db, firebase_uid, video_ids=None):
    """
    Clean up test data from database.
    
    Args:
        db: Database session
        firebase_uid: Firebase UID of test user
        video_ids: Optional list of YouTube video IDs to clean up
    """
    # Get user
    user = db.query(User).filter(User.firebase_uid == firebase_uid).first()
    if user:
        # Delete all UserVideoProgress records for this user
        db.query(UserVideoProgress).filter(UserVideoProgress.user_id == user.id).delete()
        
        # Delete user
        db.delete(user)
    
    # Optionally clean up videos (only if they have no other references)
    if video_ids:
        for video_id in video_ids:
            video = db.query(Video).filter(Video.youtube_video_id == video_id).first()
            if video:
                # Check if video has any other progress records
                progress_count = db.query(UserVideoProgress).filter(
                    UserVideoProgress.video_id == video.id
                ).count()
                if progress_count == 0:
                    db.delete(video)
    
    db.commit()


def create_test_user(db, firebase_uid, email):
    """Create a test user in the database."""
    user = User(
        firebase_uid=firebase_uid,
        email=email,
        display_name="Test User",
        created_at=datetime.utcnow()
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def create_test_video(db, youtube_video_id, title="Test Video"):
    """Create a test video in the database."""
    video = Video(
        youtube_video_id=youtube_video_id,
        title=title,
        duration_seconds=300,
        total_views=0,
        created_at=datetime.utcnow()
    )
    db.add(video)
    db.commit()
    db.refresh(video)
    return video


# ========== GET VIDEO HISTORY TESTS ==========

def test_get_video_history_empty(client, db):
    """Test getting video history when user has no watched videos."""
    firebase_uid = "test-history-empty"
    claims = {"uid": firebase_uid, "email": "empty@example.com"}
    
    # Cleanup and create user
    cleanup_test_data(db, firebase_uid)
    create_test_user(db, firebase_uid, "empty@example.com")
    
    try:
        with patch(VERIFY_PATCH_PATH, return_value=claims):
            resp = client.get(
                f"/api/videos/history/{firebase_uid}",
                headers={"Authorization": "Bearer faketoken"}
            )
        
        if resp.status_code != 200:
            print(f"Error response: {resp.get_data(as_text=True)}")
        assert resp.status_code == 200
        data = resp.get_json()
        assert "data" in data
        assert data["data"] == []
        assert "pagination" in data
        assert data["pagination"]["total"] == 0
    
    finally:
        cleanup_test_data(db, firebase_uid)


def test_get_video_history_with_videos(client, db):
    """Test getting video history with multiple watched videos."""
    firebase_uid = "test-history-with-videos"
    claims = {"uid": firebase_uid, "email": "videos@example.com"}
    
    cleanup_test_data(db, firebase_uid, ["test_vid_1", "test_vid_2"])
    user = create_test_user(db, firebase_uid, "videos@example.com")
    
    # Create videos and progress records
    video1 = create_test_video(db, "test_vid_1", "First Video")
    video2 = create_test_video(db, "test_vid_2", "Second Video")
    
    progress1 = UserVideoProgress(
        user_id=user.id,
        video_id=video1.id,
        last_position_seconds=120,
        is_completed=False,
        watch_count=3,
        first_watched_at=datetime.utcnow(),
        last_watched_at=datetime.utcnow()
    )
    progress2 = UserVideoProgress(
        user_id=user.id,
        video_id=video2.id,
        last_position_seconds=300,
        is_completed=True,
        watch_count=1,
        first_watched_at=datetime.utcnow(),
        last_watched_at=datetime.utcnow()
    )
    db.add(progress1)
    db.add(progress2)
    db.commit()
    
    try:
        with patch(VERIFY_PATCH_PATH, return_value=claims):
            resp = client.get(
                f"/api/videos/history/{firebase_uid}",
                headers={"Authorization": "Bearer faketoken"}
            )
        
        assert resp.status_code == 200
        data = resp.get_json()
        assert "data" in data
        assert "pagination" in data
        assert data["pagination"]["total"] == 2
        
        # Verify video data structure
        history = data["data"]
        assert len(history) == 2
        
        # Check first video
        video_data = next(v for v in history if v["videoId"] == "test_vid_1")
        assert video_data["title"] == "First Video"
        assert video_data["lastPositionSeconds"] == 120
        assert video_data["isCompleted"] is False
        assert video_data["watchCount"] == 3
        assert "lastWatchedAt" in video_data
        assert "thumbnailUrl" in video_data
    
    finally:
        cleanup_test_data(db, firebase_uid, ["test_vid_1", "test_vid_2"])


def test_get_video_history_forbidden(client, db):
    """Test that users cannot access another user's history."""
    firebase_uid = "test-history-owner"
    other_uid = "test-history-other"
    claims = {"uid": other_uid, "email": "other@example.com"}
    
    cleanup_test_data(db, firebase_uid)
    create_test_user(db, firebase_uid, "owner@example.com")
    
    try:
        with patch(VERIFY_PATCH_PATH, return_value=claims):
            resp = client.get(
                f"/api/videos/history/{firebase_uid}",
                headers={"Authorization": "Bearer faketoken"}
            )
        
        assert resp.status_code == 403
        data = resp.get_json()
        assert "error" in data
        assert "Forbidden" in data["error"]
    
    finally:
        cleanup_test_data(db, firebase_uid)


def test_get_video_history_with_limit(client, db):
    """Test getting video history with limit parameter."""
    firebase_uid = "test-history-limit"
    claims = {"uid": firebase_uid, "email": "limit@example.com"}
    
    cleanup_test_data(db, firebase_uid, [f"test_vid_{i}" for i in range(10)])
    user = create_test_user(db, firebase_uid, "limit@example.com")
    
    # Create 10 videos with progress
    for i in range(10):
        video = create_test_video(db, f"test_vid_{i}", f"Video {i}")
        progress = UserVideoProgress(
            user_id=user.id,
            video_id=video.id,
            last_position_seconds=i * 10,
            is_completed=False,
            watch_count=1,
            first_watched_at=datetime.utcnow(),
            last_watched_at=datetime.utcnow()
        )
        db.add(progress)
    db.commit()
    
    try:
        with patch(VERIFY_PATCH_PATH, return_value=claims):
            resp = client.get(
                f"/api/videos/history/{firebase_uid}?limit=5",
                headers={"Authorization": "Bearer faketoken"}
            )
        
        assert resp.status_code == 200
        data = resp.get_json()
        assert "pagination" in data
        assert data["pagination"]["total"] == 10
        assert data["pagination"]["limit"] == 5
        assert len(data["data"]) == 5
    
    finally:
        cleanup_test_data(db, firebase_uid, [f"test_vid_{i}" for i in range(10)])


# ========== POST VIDEO HISTORY TESTS ==========

def test_add_video_to_history_new(client, db):
    """Test adding a new video to history."""
    firebase_uid = "test-add-new"
    claims = {"uid": firebase_uid, "email": "add@example.com"}
    
    cleanup_test_data(db, firebase_uid, ["new_video_123"])
    create_test_user(db, firebase_uid, "add@example.com")
    
    try:
        with patch(VERIFY_PATCH_PATH, return_value=claims):
            resp = client.post(
                f"/api/videos/history/{firebase_uid}",
                json={
                    "videoId": "new_video_123",
                    "lastPositionSeconds": 45,
                    "isCompleted": False
                },
                headers={"Authorization": "Bearer faketoken"}
            )
        
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["message"] == "Video added to history"
        assert "data" in data
        assert data["data"]["videoId"] == "new_video_123"
        assert data["data"]["lastPositionSeconds"] == 45
        
        # Verify in database
        user = db.query(User).filter(User.firebase_uid == firebase_uid).first()
        video = db.query(Video).filter(Video.youtube_video_id == "new_video_123").first()
        assert video is not None
        
        progress = db.query(UserVideoProgress).filter(
            UserVideoProgress.user_id == user.id,
            UserVideoProgress.video_id == video.id
        ).first()
        assert progress is not None
        assert progress.last_position_seconds == 45
        assert progress.watch_count == 1
    
    finally:
        cleanup_test_data(db, firebase_uid, ["new_video_123"])


def test_add_video_to_history_update_existing(client, db):
    """Test updating an existing video in history."""
    firebase_uid = "test-add-update"
    claims = {"uid": firebase_uid, "email": "update@example.com"}
    
    cleanup_test_data(db, firebase_uid, ["update_video"])
    user = create_test_user(db, firebase_uid, "update@example.com")
    video = create_test_video(db, "update_video", "Update Video")
    
    # Create initial progress
    progress = UserVideoProgress(
        user_id=user.id,
        video_id=video.id,
        last_position_seconds=100,
        is_completed=False,
        watch_count=1,
        first_watched_at=datetime.utcnow(),
        last_watched_at=datetime.utcnow()
    )
    db.add(progress)
    db.commit()
    
    try:
        with patch(VERIFY_PATCH_PATH, return_value=claims):
            resp = client.post(
                f"/api/videos/history/{firebase_uid}",
                json={
                    "videoId": "update_video",
                    "lastPositionSeconds": 200,
                    "isCompleted": True
                },
                headers={"Authorization": "Bearer faketoken"}
            )
        
        assert resp.status_code == 200
        
        # Verify updated in database
        db.refresh(progress)
        assert progress.last_position_seconds == 200
        assert progress.is_completed is True
        assert progress.watch_count == 2
    
    finally:
        cleanup_test_data(db, firebase_uid, ["update_video"])


def test_add_video_to_history_missing_fields(client, db):
    """Test adding video with missing required fields."""
    firebase_uid = "test-add-missing"
    claims = {"uid": firebase_uid, "email": "missing@example.com"}
    
    cleanup_test_data(db, firebase_uid)
    create_test_user(db, firebase_uid, "missing@example.com")
    
    try:
        # Missing videoId
        with patch(VERIFY_PATCH_PATH, return_value=claims):
            resp = client.post(
                f"/api/videos/history/{firebase_uid}",
                json={"lastPositionSeconds": 45},
                headers={"Authorization": "Bearer faketoken"}
            )
        assert resp.status_code == 400
        assert "videoId is required" in resp.get_json()["error"]
        
        # Missing lastPositionSeconds
        with patch(VERIFY_PATCH_PATH, return_value=claims):
            resp = client.post(
                f"/api/videos/history/{firebase_uid}",
                json={"videoId": "test123"},
                headers={"Authorization": "Bearer faketoken"}
            )
        assert resp.status_code == 400
        assert "lastPositionSeconds is required" in resp.get_json()["error"]
    
    finally:
        cleanup_test_data(db, firebase_uid)


def test_add_video_to_history_invalid_position(client, db):
    """Test adding video with invalid lastPositionSeconds."""
    firebase_uid = "test-add-invalid"
    claims = {"uid": firebase_uid, "email": "invalid@example.com"}
    
    cleanup_test_data(db, firebase_uid)
    create_test_user(db, firebase_uid, "invalid@example.com")
    
    try:
        # Negative position
        with patch(VERIFY_PATCH_PATH, return_value=claims):
            resp = client.post(
                f"/api/videos/history/{firebase_uid}",
                json={"videoId": "test123", "lastPositionSeconds": -10},
                headers={"Authorization": "Bearer faketoken"}
            )
        assert resp.status_code == 400
        assert "between 0 and" in resp.get_json()["error"]

        # Invalid type
        with patch(VERIFY_PATCH_PATH, return_value=claims):
            resp = client.post(
                f"/api/videos/history/{firebase_uid}",
                json={"videoId": "test123", "lastPositionSeconds": "invalid"},
                headers={"Authorization": "Bearer faketoken"}
            )
        assert resp.status_code == 400
    
    finally:
        cleanup_test_data(db, firebase_uid)


def test_add_video_to_history_forbidden(client, db):
    """Test that users cannot add to another user's history."""
    firebase_uid = "test-add-owner"
    other_uid = "test-add-other"
    claims = {"uid": other_uid, "email": "other@example.com"}
    
    cleanup_test_data(db, firebase_uid)
    create_test_user(db, firebase_uid, "owner@example.com")
    
    try:
        with patch(VERIFY_PATCH_PATH, return_value=claims):
            resp = client.post(
                f"/api/videos/history/{firebase_uid}",
                json={"videoId": "test123", "lastPositionSeconds": 45},
                headers={"Authorization": "Bearer faketoken"}
            )
        
        assert resp.status_code == 403
        assert "Forbidden" in resp.get_json()["error"]
    
    finally:
        cleanup_test_data(db, firebase_uid)


# ========== DELETE SINGLE VIDEO TESTS ==========

def test_delete_video_from_history(client, db):
    """Test deleting a specific video from history."""
    firebase_uid = "test-delete-single"
    claims = {"uid": firebase_uid, "email": "delete@example.com"}
    
    cleanup_test_data(db, firebase_uid, ["delete_video"])
    user = create_test_user(db, firebase_uid, "delete@example.com")
    video = create_test_video(db, "delete_video", "Delete Video")
    
    progress = UserVideoProgress(
        user_id=user.id,
        video_id=video.id,
        last_position_seconds=100,
        is_completed=False,
        watch_count=1,
        first_watched_at=datetime.utcnow(),
        last_watched_at=datetime.utcnow()
    )
    db.add(progress)
    db.commit()
    
    try:
        with patch(VERIFY_PATCH_PATH, return_value=claims):
            resp = client.delete(
                f"/api/videos/history/{firebase_uid}/delete_video",
                headers={"Authorization": "Bearer faketoken"}
            )
        
        assert resp.status_code == 200
        assert "Video removed from history" in resp.get_json()["message"]
        
        # Verify deleted from database
        progress_check = db.query(UserVideoProgress).filter(
            UserVideoProgress.user_id == user.id,
            UserVideoProgress.video_id == video.id
        ).first()
        assert progress_check is None
    
    finally:
        cleanup_test_data(db, firebase_uid, ["delete_video"])


def test_delete_video_not_in_history(client, db):
    """Test deleting a video that's not in user's history."""
    firebase_uid = "test-delete-notfound"
    claims = {"uid": firebase_uid, "email": "notfound@example.com"}
    
    cleanup_test_data(db, firebase_uid)
    create_test_user(db, firebase_uid, "notfound@example.com")
    
    try:
        with patch(VERIFY_PATCH_PATH, return_value=claims):
            resp = client.delete(
                f"/api/videos/history/{firebase_uid}/nonexistent_video",
                headers={"Authorization": "Bearer faketoken"}
            )
        
        assert resp.status_code == 404
        assert "not found" in resp.get_json()["error"].lower()
    
    finally:
        cleanup_test_data(db, firebase_uid)


def test_delete_video_from_history_forbidden(client, db):
    """Test that users cannot delete from another user's history."""
    firebase_uid = "test-delete-owner"
    other_uid = "test-delete-other"
    claims = {"uid": other_uid, "email": "other@example.com"}
    
    cleanup_test_data(db, firebase_uid)
    create_test_user(db, firebase_uid, "owner@example.com")
    
    try:
        with patch(VERIFY_PATCH_PATH, return_value=claims):
            resp = client.delete(
                f"/api/videos/history/{firebase_uid}/test_video",
                headers={"Authorization": "Bearer faketoken"}
            )
        
        assert resp.status_code == 403
        assert "Forbidden" in resp.get_json()["error"]
    
    finally:
        cleanup_test_data(db, firebase_uid)


# ========== CLEAR ALL HISTORY TESTS ==========

def test_clear_all_video_history(client, db):
    """Test clearing all video history for a user."""
    firebase_uid = "test-clear-all"
    claims = {"uid": firebase_uid, "email": "clear@example.com"}
    
    cleanup_test_data(db, firebase_uid, ["clear_vid_1", "clear_vid_2", "clear_vid_3"])
    user = create_test_user(db, firebase_uid, "clear@example.com")
    
    # Create multiple videos with progress
    for i in range(3):
        video = create_test_video(db, f"clear_vid_{i+1}", f"Clear Video {i+1}")
        progress = UserVideoProgress(
            user_id=user.id,
            video_id=video.id,
            last_position_seconds=i * 50,
            is_completed=False,
            watch_count=1,
            first_watched_at=datetime.utcnow(),
            last_watched_at=datetime.utcnow()
        )
        db.add(progress)
    db.commit()
    
    try:
        with patch(VERIFY_PATCH_PATH, return_value=claims):
            resp = client.delete(
                f"/api/videos/history/{firebase_uid}",
                headers={"Authorization": "Bearer faketoken"}
            )
        
        assert resp.status_code == 200
        data = resp.get_json()
        assert "Video history cleared" in data["message"]
        assert data["deletedCount"] == 3
        
        # Verify all deleted from database
        progress_count = db.query(UserVideoProgress).filter(
            UserVideoProgress.user_id == user.id
        ).count()
        assert progress_count == 0
    
    finally:
        cleanup_test_data(db, firebase_uid, ["clear_vid_1", "clear_vid_2", "clear_vid_3"])


def test_clear_empty_history(client, db):
    """Test clearing history when user has no videos."""
    firebase_uid = "test-clear-empty"
    claims = {"uid": firebase_uid, "email": "clearempty@example.com"}
    
    cleanup_test_data(db, firebase_uid)
    create_test_user(db, firebase_uid, "clearempty@example.com")
    
    try:
        with patch(VERIFY_PATCH_PATH, return_value=claims):
            resp = client.delete(
                f"/api/videos/history/{firebase_uid}",
                headers={"Authorization": "Bearer faketoken"}
            )
        
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["deletedCount"] == 0
    
    finally:
        cleanup_test_data(db, firebase_uid)


def test_clear_all_history_forbidden(client, db):
    """Test that users cannot clear another user's history."""
    firebase_uid = "test-clear-owner"
    other_uid = "test-clear-other"
    claims = {"uid": other_uid, "email": "other@example.com"}
    
    cleanup_test_data(db, firebase_uid)
    create_test_user(db, firebase_uid, "owner@example.com")
    
    try:
        with patch(VERIFY_PATCH_PATH, return_value=claims):
            resp = client.delete(
                f"/api/videos/history/{firebase_uid}",
                headers={"Authorization": "Bearer faketoken"}
            )
        
        assert resp.status_code == 403
        assert "Forbidden" in resp.get_json()["error"]
    
    finally:
        cleanup_test_data(db, firebase_uid)


# ========== PAGINATION TESTS ==========

def test_pagination_with_offset(client, db):
    """Test pagination with offset parameter to fetch different pages."""
    firebase_uid = "test-pagination-offset"
    claims = {"uid": firebase_uid, "email": "pagination@example.com"}
    
    cleanup_test_data(db, firebase_uid, [f"page_vid_{i}" for i in range(25)])
    user = create_test_user(db, firebase_uid, "pagination@example.com")
    
    # Create 25 videos with progress
    for i in range(25):
        video = create_test_video(db, f"page_vid_{i}", f"Video {i}")
        progress = UserVideoProgress(
            user_id=user.id,
            video_id=video.id,
            last_position_seconds=i * 10,
            is_completed=False,
            watch_count=1,
            first_watched_at=datetime.utcnow(),
            last_watched_at=datetime.utcnow()
        )
        db.add(progress)
    db.commit()
    
    try:
        # Fetch page 1 (first 10)
        with patch(VERIFY_PATCH_PATH, return_value=claims):
            resp = client.get(
                f"/api/videos/history/{firebase_uid}?limit=10&offset=0",
                headers={"Authorization": "Bearer faketoken"}
            )
        
        assert resp.status_code == 200
        data = resp.get_json()
        assert "pagination" in data
        assert data["pagination"]["total"] == 25
        assert data["pagination"]["limit"] == 10
        assert data["pagination"]["offset"] == 0
        assert data["pagination"]["hasMore"] is True
        assert len(data["data"]) == 10
        
        # Fetch page 2 (next 10)
        with patch(VERIFY_PATCH_PATH, return_value=claims):
            resp = client.get(
                f"/api/videos/history/{firebase_uid}?limit=10&offset=10",
                headers={"Authorization": "Bearer faketoken"}
            )
        
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["pagination"]["total"] == 25
        assert data["pagination"]["limit"] == 10
        assert data["pagination"]["offset"] == 10
        assert data["pagination"]["hasMore"] is True
        assert len(data["data"]) == 10
        
        # Fetch page 3 (last 5)
        with patch(VERIFY_PATCH_PATH, return_value=claims):
            resp = client.get(
                f"/api/videos/history/{firebase_uid}?limit=10&offset=20",
                headers={"Authorization": "Bearer faketoken"}
            )
        
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["pagination"]["total"] == 25
        assert data["pagination"]["limit"] == 10
        assert data["pagination"]["offset"] == 20
        assert data["pagination"]["hasMore"] is False
        assert len(data["data"]) == 5
    
    finally:
        cleanup_test_data(db, firebase_uid, [f"page_vid_{i}" for i in range(25)])


def test_pagination_hasMore_flag(client, db):
    """Test that hasMore flag is correctly set."""
    firebase_uid = "test-hasmore"
    claims = {"uid": firebase_uid, "email": "hasmore@example.com"}
    
    cleanup_test_data(db, firebase_uid, [f"has_vid_{i}" for i in range(15)])
    user = create_test_user(db, firebase_uid, "hasmore@example.com")
    
    # Create exactly 15 videos
    for i in range(15):
        video = create_test_video(db, f"has_vid_{i}", f"Video {i}")
        progress = UserVideoProgress(
            user_id=user.id,
            video_id=video.id,
            last_position_seconds=i * 10,
            is_completed=False,
            watch_count=1,
            first_watched_at=datetime.utcnow(),
            last_watched_at=datetime.utcnow()
        )
        db.add(progress)
    db.commit()
    
    try:
        # Test hasMore=True when there's more data
        with patch(VERIFY_PATCH_PATH, return_value=claims):
            resp = client.get(
                f"/api/videos/history/{firebase_uid}?limit=10&offset=0",
                headers={"Authorization": "Bearer faketoken"}
            )
        
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["pagination"]["hasMore"] is True
        
        # Test hasMore=False when we're at the end
        with patch(VERIFY_PATCH_PATH, return_value=claims):
            resp = client.get(
                f"/api/videos/history/{firebase_uid}?limit=10&offset=10",
                headers={"Authorization": "Bearer faketoken"}
            )
        
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["pagination"]["hasMore"] is False
        assert len(data["data"]) == 5
        
        # Test hasMore=False when fetching all at once
        with patch(VERIFY_PATCH_PATH, return_value=claims):
            resp = client.get(
                f"/api/videos/history/{firebase_uid}?limit=20&offset=0",
                headers={"Authorization": "Bearer faketoken"}
            )
        
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["pagination"]["hasMore"] is False
        assert len(data["data"]) == 15
    
    finally:
        cleanup_test_data(db, firebase_uid, [f"has_vid_{i}" for i in range(15)])


def test_pagination_offset_beyond_total(client, db):
    """Test pagination when offset is beyond total count."""
    firebase_uid = "test-offset-beyond"
    claims = {"uid": firebase_uid, "email": "beyond@example.com"}
    
    cleanup_test_data(db, firebase_uid, [f"beyond_vid_{i}" for i in range(5)])
    user = create_test_user(db, firebase_uid, "beyond@example.com")
    
    # Create only 5 videos
    for i in range(5):
        video = create_test_video(db, f"beyond_vid_{i}", f"Video {i}")
        progress = UserVideoProgress(
            user_id=user.id,
            video_id=video.id,
            last_position_seconds=i * 10,
            is_completed=False,
            watch_count=1,
            first_watched_at=datetime.utcnow(),
            last_watched_at=datetime.utcnow()
        )
        db.add(progress)
    db.commit()
    
    try:
        # Request offset beyond total
        with patch(VERIFY_PATCH_PATH, return_value=claims):
            resp = client.get(
                f"/api/videos/history/{firebase_uid}?limit=10&offset=100",
                headers={"Authorization": "Bearer faketoken"}
            )
        
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["pagination"]["total"] == 5
        assert data["pagination"]["offset"] == 100
        assert data["pagination"]["hasMore"] is False
        assert len(data["data"]) == 0
    
    finally:
        cleanup_test_data(db, firebase_uid, [f"beyond_vid_{i}" for i in range(5)])


def test_pagination_invalid_limit(client, db):
    """Test validation of limit parameter."""
    firebase_uid = "test-invalid-limit"
    claims = {"uid": firebase_uid, "email": "invalid@example.com"}
    
    cleanup_test_data(db, firebase_uid)
    create_test_user(db, firebase_uid, "invalid@example.com")
    
    try:
        # Test limit = 0
        with patch(VERIFY_PATCH_PATH, return_value=claims):
            resp = client.get(
                f"/api/videos/history/{firebase_uid}?limit=0",
                headers={"Authorization": "Bearer faketoken"}
            )
        
        assert resp.status_code == 400
        assert "Invalid limit parameter" in resp.get_json()["error"]
        
        # Test limit > 1000
        with patch(VERIFY_PATCH_PATH, return_value=claims):
            resp = client.get(
                f"/api/videos/history/{firebase_uid}?limit=1001",
                headers={"Authorization": "Bearer faketoken"}
            )
        
        assert resp.status_code == 400
        assert "Invalid limit parameter" in resp.get_json()["error"]
        
        # Test negative limit
        with patch(VERIFY_PATCH_PATH, return_value=claims):
            resp = client.get(
                f"/api/videos/history/{firebase_uid}?limit=-5",
                headers={"Authorization": "Bearer faketoken"}
            )
        
        assert resp.status_code == 400
        assert "Invalid limit parameter" in resp.get_json()["error"]
    
    finally:
        cleanup_test_data(db, firebase_uid)


def test_pagination_invalid_offset(client, db):
    """Test validation of offset parameter."""
    firebase_uid = "test-invalid-offset"
    claims = {"uid": firebase_uid, "email": "offset@example.com"}
    
    cleanup_test_data(db, firebase_uid)
    create_test_user(db, firebase_uid, "offset@example.com")
    
    try:
        # Test negative offset
        with patch(VERIFY_PATCH_PATH, return_value=claims):
            resp = client.get(
                f"/api/videos/history/{firebase_uid}?offset=-10",
                headers={"Authorization": "Bearer faketoken"}
            )
        
        assert resp.status_code == 400
        assert "Invalid offset parameter" in resp.get_json()["error"]
    
    finally:
        cleanup_test_data(db, firebase_uid)


def test_pagination_default_values(client, db):
    """Test that default pagination values are applied correctly."""
    firebase_uid = "test-defaults"
    claims = {"uid": firebase_uid, "email": "defaults@example.com"}
    
    cleanup_test_data(db, firebase_uid, [f"default_vid_{i}" for i in range(30)])
    user = create_test_user(db, firebase_uid, "defaults@example.com")
    
    # Create 30 videos
    for i in range(30):
        video = create_test_video(db, f"default_vid_{i}", f"Video {i}")
        progress = UserVideoProgress(
            user_id=user.id,
            video_id=video.id,
            last_position_seconds=i * 10,
            is_completed=False,
            watch_count=1,
            first_watched_at=datetime.utcnow(),
            last_watched_at=datetime.utcnow()
        )
        db.add(progress)
    db.commit()
    
    try:
        # Request without limit/offset params
        with patch(VERIFY_PATCH_PATH, return_value=claims):
            resp = client.get(
                f"/api/videos/history/{firebase_uid}",
                headers={"Authorization": "Bearer faketoken"}
            )
        
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["pagination"]["limit"] == 20  # Default limit
        assert data["pagination"]["offset"] == 0  # Default offset
        assert data["pagination"]["total"] == 30
        assert data["pagination"]["hasMore"] is True
        assert len(data["data"]) == 20
    
    finally:
        cleanup_test_data(db, firebase_uid, [f"default_vid_{i}" for i in range(30)])
