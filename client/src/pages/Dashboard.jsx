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
import { useState } from "react";
import { useVideoHistory } from "../hooks/useVideoHistory";
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
  const { history, addToHistory, removeFromHistory, clearHistory } = useVideoHistory();

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
  const handleLoadVideo = async () => {
    const videoId = extractVideoId(videoUrl);
    if (videoId) {
      // Add to history (fire and forget - errors are handled in hook)
      try {
        await addToHistory({
          videoId,
          embedUrl: `https://www.youtube.com/embed/${videoId}`,
          title: `YouTube Video - ${videoId}`,
        });
      } catch (err) {
        // Error already logged in hook, continue with navigation
        console.error('Failed to add video to history:', err);
      }

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
  const handleDeleteFromHistory = async (id) => {
    if (window.confirm('Remove this video from your history?')) {
      try {
        await removeFromHistory(id);
      } catch (err) {
        // Error already logged in hook
        console.error('Failed to remove video from history:', err);
        alert('Failed to remove video from history. Please try again.');
      }
    }
  };

  /**
   * Handle Clear All History
   * 
   * Removes all videos from user's history after confirmation.
   * Warns user that action cannot be undone.
   */
  const handleClearAllHistory = async () => {
    if (window.confirm('Clear all video history? This cannot be undone.')) {
      try {
        await clearHistory();
      } catch (err) {
        // Error already logged in hook
        console.error('Failed to clear history:', err);
        alert('Failed to clear history. Please try again.');
      }
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
          <div className="welcome-content">
            <h2>Welcome back!</h2>
            <p>Transform any YouTube video into an interactive learning experience with AI-powered checkpoints, tutoring, and study materials.</p>
          </div>
        </div>

        <div className="video-section-dashboard">
          <div className="section-header">
            <div className="section-icon-wrapper">
              <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 7l-7 5 7 5V7z"/>
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
              </svg>
            </div>
            <div>
              <h3>Load a Video</h3>
              <p className="section-subtitle">Paste a YouTube URL to get started</p>
            </div>
          </div>
          <InputBar
            videoUrl={videoUrl}
            setVideoUrl={setVideoUrl}
            onSend={handleLoadVideo}
          />
        </div>

        {history.length > 0 && (
          <div className="stats-section">
            <div className="stat-card">
              <div className="stat-icon-wrapper">
                <svg className="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                </svg>
              </div>
              <div className="stat-content">
                <div className="stat-number">{history.length}</div>
                <div className="stat-label">Videos Learned</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon-wrapper">
                <svg className="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <div className="stat-content">
                <div className="stat-number">{history.length}</div>
                <div className="stat-label">Learning Sessions</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon-wrapper">
                <svg className="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5"/>
                  <path d="M2 12l10 5 10-5"/>
                </svg>
              </div>
              <div className="stat-content">
                <div className="stat-number">∞</div>
                <div className="stat-label">Knowledge Gained</div>
              </div>
            </div>
          </div>
        )}

        {history.length > 0 && (
          <div className="history-section">
            <div className="history-header">
              <div className="section-header">
                <div className="section-icon-wrapper">
                  <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                  </svg>
                </div>
                <div>
                  <h3>Your Learning History</h3>
                  <p className="section-subtitle">Continue where you left off</p>
                </div>
              </div>
              <button onClick={handleClearAllHistory} className="clear-history-button">
                Clear All
              </button>
            </div>
            <div className="history-grid">
              {history.map((video) => (
                <VideoHistoryCard
                  key={video.id}
                  video={video}
                  onSelect={handleSelectFromHistory}
                  onDelete={handleDeleteFromHistory}
                />
              ))}
            </div>
          </div>
        )}

        {history.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon-wrapper">
              <svg className="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M23 7l-7 5 7 5V7z"/>
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
              </svg>
            </div>
            <h3>No videos yet</h3>
            <p>Start your learning journey by loading a YouTube video above</p>
            <div className="empty-features">
              <div className="empty-feature">
                <div className="empty-feature-icon-wrapper">
                  <svg className="empty-feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                  </svg>
                </div>
                <span>AI Analysis</span>
              </div>
              <div className="empty-feature">
                <div className="empty-feature-icon-wrapper">
                  <svg className="empty-feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <span>Interactive Checkpoints</span>
              </div>
              <div className="empty-feature">
                <div className="empty-feature-icon-wrapper">
                  <svg className="empty-feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                </div>
                <span>AI Tutor</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
