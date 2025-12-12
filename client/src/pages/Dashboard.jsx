/**
 * Dashboard Page Component
 *
 * Main authenticated user interface for LearnFlow. Provides a central hub
 * for loading videos and accessing learning history. Videos are opened in
 * the dedicated VideoPage for the full learning experience.
 *
 * Features:
 * - YouTube URL input to load videos
 * - Automatic history tracking with timestamps
 * - History grid with thumbnails and quick access
 * - Clear all history functionality
 * - User info display and logout
 * - Empty state guidance for new users
 * - Direct navigation to VideoPage
 *
 * @module Dashboard
 */

import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useAuth } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useVideoHistory } from "../hooks/useVideoHistory";
import { videoService, progressService } from "../services";
import InputBar from "../components/InputBar";
import VideoHistoryCard from "../components/VideoHistoryCard";
import "./Dashboard.css";

/**
 * Dashboard Component
 *
 * Protected main page for authenticated users. Provides video URL input
 * and history management. Videos are opened in dedicated VideoPage for
 * full learning experience with AI tutor, checkpoints, and quizzes.
 *
 * @returns {React.ReactElement} Dashboard with video input and history
 *
 * @example
 * // Used in main App routing with protection
 * <Route
 *   path="/dashboard"
 *   element={
 *     <ProtectedRoute>
 *       <Dashboard />
 *     </ProtectedRoute>
 *   }
 * />
 */
export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [videoUrl, setVideoUrl] = useState("");
  const [progressMap, setProgressMap] = useState({});
  const { history, addToHistory, removeFromHistory, clearHistory } = useVideoHistory();

  /**
   * Fetch Progress Data for History Videos
   *
   * Fetches progress information for all videos in history whenever the history
   * changes. Creates a map of YouTube video ID to progress data for efficient lookup.
   */
  useEffect(() => {
    const fetchProgressForHistory = async () => {
      if (!user || history.length === 0) {
        setProgressMap({});
        return;
      }

      const newProgressMap = {};

      // Fetch progress for each video in history
      for (const historyVideo of history) {
        try {
          // First, get the database video record to get its database ID
          const videoData = await videoService.getVideo(historyVideo.videoId);

          if (videoData && videoData.id) {
            // Then fetch progress using database video ID
            const progressData = await progressService.getProgress(user.uid, videoData.id);
            if (progressData) {
              newProgressMap[historyVideo.videoId] = progressData;
            }
          }
        } catch (err) {
          // Ignore errors for individual videos
          console.error(`Error fetching progress for ${historyVideo.videoId}:`, err);
        }
      }

      setProgressMap(newProgressMap);
    };

    fetchProgressForHistory();
  }, [history, user]);

  /**
   * Extract Video ID from YouTube URL
   *
   * Parses various YouTube URL formats to extract the video ID.
   *
   * @param {string} url - YouTube URL
   * @returns {string|null} Video ID if found, null if invalid URL
   */
  const extractVideoId = (url) => {
    const patterns = [
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([^&]+)/,
      /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([^?]+)/,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([^?]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }
    return null;
  };

  /**
   * Handle Load Video
   *
   * Extracts video ID from input URL and navigates to VideoPage.
   * Also adds video to history for quick access.
   */
  const handleLoadVideo = () => {
    const videoId = extractVideoId(videoUrl);
    if (videoId) {
      // Add to history (non-blocking, handle error silently to prevent crash)
      addToHistory({
        videoId,
        embedUrl: `https://www.youtube.com/embed/${videoId}`,
        title: `YouTube Video - ${videoId}`,
      }).catch(err => {
        console.warn("Failed to add to history from Dashboard:", err);
      });

      // Navigate to video page
      navigate(`/video/${videoId}`);
    } else if (videoUrl.trim()) {
      alert("Please enter a valid YouTube URL");
    }
  };

  /**
   * Handle Select Video from History
   *
   * Opens the selected video in the dedicated VideoPage.
   *
   * @param {Object} video - Video history entry
   * @param {string} video.videoId - YouTube video ID
   */
  const handleSelectFromHistory = (video) => {
    navigate(`/video/${video.videoId}`);
  };

  /**
   * Handle Delete Single Video from History
   * 
   * Removes a single video from history after user confirmation.
   * Shows native confirmation dialog to prevent accidental deletion.
   * 
   * @param {number} id - Unique history entry ID
   */
  const handleDeleteFromHistory = (id) => {
    if (window.confirm('Remove this video from your history?')) {
      removeFromHistory(id);
    }
  };

  /**
   * Handle Clear All History
   * 
   * Removes all videos from user's history after confirmation.
   * Warns user that action cannot be undone.
   */
  const handleClearAllHistory = () => {
    if (window.confirm('Clear all video history? This cannot be undone.')) {
      clearHistory();
    }
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>LearnFlow</h1>
        <div className="user-info">
          <span className="user-email">{user?.email}</span>
          <button onClick={() => signOut(auth)} className="logout-button">
            Logout
          </button>
        </div>
      </header>

      <div className="dashboard-content">
        <div className="welcome-section">
          <h2>Welcome back!</h2>
          <p>Start learning by pasting a YouTube video link below</p>
        </div>

        <div className="video-section-dashboard">
          <h3>Load a Video</h3>
          <InputBar
            videoUrl={videoUrl}
            setVideoUrl={setVideoUrl}
            onSend={handleLoadVideo}
          />
        </div>

        {history.length > 0 && (
          <div className="history-section">
            <div className="history-header">
              <h3>Your Learning History</h3>
              <button onClick={handleClearAllHistory} className="clear-history-button">
                Clear All
              </button>
            </div>
            <div className="history-grid">
              {history.map((video) => (
                <VideoHistoryCard
                  key={video.id}
                  video={video}
                  progress={progressMap[video.videoId]}
                  onSelect={handleSelectFromHistory}
                  onDelete={handleDeleteFromHistory}
                />
              ))}
            </div>
          </div>
        )}

        {history.length === 0 && (
          <div className="empty-state">
            <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1">
              <path d="M23 7l-7 5 7 5V7z" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
            <h3>No videos yet</h3>
            <p>Start learning by loading a YouTube video above</p>
          </div>
        )}
      </div>
    </div>
  );
}
