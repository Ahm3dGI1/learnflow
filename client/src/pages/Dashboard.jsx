/**
 * Dashboard Page Component
 * 
 * Main authenticated user interface for LearnFlow. Manages video playback,
 * learning history, and user session. Automatically tracks watched videos
 * in localStorage-backed history and provides interface for loading new
 * videos or resuming from history.
 * 
 * Features:
 * - Video player with URL input
 * - Automatic history tracking with timestamps
 * - History grid with thumbnails and quick access
 * - Clear all history functionality
 * - User info display and logout
 * - Empty state guidance for new users
 * 
 * @module Dashboard
 */

import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useAuth } from "../auth/AuthContext";
import { useYouTubeEmbed } from "../hooks/useYouTubeEmbed";
import { useVideoHistory } from "../hooks/useVideoHistory";
import InputBar from "../components/InputBar";
import VideoPlayer from "../components/VideoPlayer";
import VideoHistoryCard from "../components/VideoHistoryCard";
import { useEffect } from "react";
import "./Dashboard.css";

/**
 * Dashboard Component
 * 
 * Protected main page for authenticated users. Combines video player,
 * input controls, and history management in a cohesive interface.
 * Automatically adds videos to history when loaded and provides
 * quick access to previously watched content.
 * 
 * @returns {React.ReactElement} Dashboard with video player and history
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
  const { videoUrl, setVideoUrl, embedUrl, handleLoadVideo, resetVideo } = useYouTubeEmbed();
  const { history, addToHistory, removeFromHistory, clearHistory } = useVideoHistory();

  /**
   * Extract Video ID from Embed URL
   * 
   * Parses YouTube embed URL to extract the video ID using regex pattern
   * matching. Used for history tracking and thumbnail generation.
   * 
   * @param {string} url - YouTube embed URL
   * @returns {string|null} Video ID if found, null if invalid URL
   * 
   * @example
   * getVideoIdFromEmbed("https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1")
   * // Returns: "dQw4w9WgXcQ"
   */
  const getVideoIdFromEmbed = (url) => {
    if (!url) return null;
    const match = url.match(/embed\/([^?]+)/);
    return match ? match[1] : null;
  };

  /**
   * Auto-Track Video History
   * 
   * Effect hook that automatically adds videos to history when they are
   * loaded. Extracts video ID from embed URL and creates history entry
   * with metadata. Runs whenever embedUrl changes.
   */
  useEffect(() => {
    if (embedUrl) {
      const videoId = getVideoIdFromEmbed(embedUrl);
      if (videoId) {
        addToHistory({
          videoId,
          embedUrl,
          title: `YouTube Video - ${videoId}`,
        });
      }
    }
  }, [embedUrl, addToHistory]);

  /**
   * Handle Select Video from History
   * 
   * Loads a previously watched video from history. Sets the video URL
   * and triggers the load process, which will update the player and
   * move the video to the top of history.
   * 
   * @param {Object} video - Video history entry
   * @param {string} video.videoId - YouTube video ID
   */
  const handleSelectFromHistory = (video) => {
    setVideoUrl(`https://www.youtube.com/watch?v=${video.videoId}`);
    handleLoadVideo();
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
          <h3>Current Video</h3>
          {!embedUrl && (
            <InputBar
              videoUrl={videoUrl}
              setVideoUrl={setVideoUrl}
              onSend={handleLoadVideo}
            />
          )}
          {embedUrl && (
            <div className="current-video-controls">
              <VideoPlayer embedUrl={embedUrl} />
              <button onClick={resetVideo} className="new-video-button">
                Load New Video
              </button>
            </div>
          )}
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
                  onSelect={handleSelectFromHistory}
                  onDelete={handleDeleteFromHistory}
                />
              ))}
            </div>
          </div>
        )}

        {history.length === 0 && !embedUrl && (
          <div className="empty-state">
            <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1">
              <path d="M23 7l-7 5 7 5V7z"/>
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
            </svg>
            <h3>No videos yet</h3>
            <p>Start learning by loading a YouTube video above</p>
          </div>
        )}
      </div>
    </div>
  );
}
