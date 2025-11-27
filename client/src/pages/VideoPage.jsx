/**
 * Video Page Component
 *
 * Dedicated page for watching videos with AI tutor chat interface.
 * Fetches video data from backend and provides a comprehensive learning experience.
 *
 * Features:
 * - Video player with metadata display
 * - AI Tutor chat interface in sidebar
 * - Checkpoints shown as popups at specific timestamps (future)
 * - Quiz and summary shown at video end (future)
 *
 * @module VideoPage
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import VideoPlayer from "../components/VideoPlayer";
import { videoService } from "../services";
import "./VideoPage.css";

/**
 * Format duration in seconds to HH:MM:SS or MM:SS format
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration string
 */
function formatDuration(seconds) {
  if (!seconds || seconds < 0) return "Duration unknown";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    // Format: HH:MM:SS
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  } else {
    // Format: MM:SS
    return `${minutes}:${String(secs).padStart(2, '0')}`;
  }
}

/**
 * VideoPage Component
 *
 * Main video learning page that displays video player and all learning tools.
 * Fetches video data from backend based on videoId URL parameter.
 *
 * @returns {React.ReactElement} Video page with player and learning sections
 *
 * @example
 * // Used in App routing
 * <Route path="/video/:videoId" element={<ProtectedRoute><VideoPage /></ProtectedRoute>} />
 */
export default function VideoPage() {
  const { videoId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [embedUrl, setEmbedUrl] = useState("");

  /**
   * Fetch Video Data
   *
   * Fetches video metadata and cached data from backend when component mounts
   * or videoId changes. Handles loading states and errors.
   */
  useEffect(() => {
    const fetchVideo = async () => {
      if (!videoId) {
        setError("No video ID provided");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch video from backend
        const videoData = await videoService.getVideo(videoId);
        setVideo(videoData);

        // Generate embed URL
        setEmbedUrl(`https://www.youtube.com/embed/${videoId}?autoplay=0`);
      } catch (err) {
        console.error("Error fetching video:", err);

        // If video doesn't exist in DB, try to create it
        if (err.status === 404) {
          try {
            console.log("Video not in database, creating entry...");
            const newVideo = await videoService.createVideo(videoId, {
              fetchMetadata: true,
              fetchTranscript: false
            });
            setVideo(newVideo);
            setEmbedUrl(`https://www.youtube.com/embed/${videoId}?autoplay=0`);
          } catch (createErr) {
            console.error("Error creating video:", createErr);
            setError("Unable to load this video. The video may be private, unavailable, or the URL may be invalid. Please try a different video.");
          }
        } else {
          setError(err.message || "Failed to load video");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchVideo();
  }, [videoId]);

  /**
   * Handle Back Navigation
   *
   * Returns user to dashboard when back button is clicked.
   */
  const handleBack = () => {
    navigate("/dashboard");
  };

  // Loading state
  if (loading) {
    return (
      <div className="video-page-container">
        <div className="video-page-loading" role="status" aria-live="polite">
          <div className="loading-spinner" aria-label="Loading"></div>
          <p>Loading video...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="video-page-container">
        <div className="video-page-error">
          <h2>Unable to Load Video</h2>
          <p>{error}</p>
          <button onClick={handleBack} className="back-button">
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="video-page-container">
      {/* Header */}
      <header className="video-page-header">
        <button onClick={handleBack} className="back-button">
          ← Back to Dashboard
        </button>
        <div className="user-info">
          <span className="user-email">{user?.email}</span>
        </div>
      </header>

      {/* Main Content */}
      <div className="video-page-content">
        {/* Left Column - Video Player & Info */}
        <div className="video-main-column">
          {/* Video Player */}
          <div className="video-player-section">
            {embedUrl && <VideoPlayer embedUrl={embedUrl} />}
          </div>

          {/* Video Info */}
          <div className="video-info-section">
            <h1 className="video-title">{video?.title || "Untitled Video"}</h1>
            <div className="video-metadata">
              <span className="metadata-item">
                {formatDuration(video?.durationSeconds)}
              </span>
              {video?.language && (
                <span className="metadata-item">Language: {video.language}</span>
              )}
              {video?.totalViews !== undefined && (
                <span className="metadata-item">{video.totalViews} views</span>
              )}
            </div>
            {video?.description && (
              <div className="video-description">
                <h3>Description</h3>
                <p>{video.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - AI Tutor Chat */}
        <div className="video-sidebar-column">
          {/* Chat Section - Placeholder */}
          <div className="chat-section">
            <h2>💬 AI Tutor</h2>
            <div className="placeholder-content">
              <p>Chat with an AI tutor about this video</p>
              <button className="feature-placeholder-button" disabled>
                Start Chat (Coming Soon)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
