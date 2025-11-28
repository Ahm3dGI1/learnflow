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

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import VideoPlayer from "../components/VideoPlayer";
import CheckpointPopup from "../components/CheckpointPopup";
import { videoService, llmService } from "../services";
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
  const [checkpoints, setCheckpoints] = useState([]);
  const [currentCheckpoint, setCurrentCheckpoint] = useState(null);
  const [checkpointsCompleted, setCheckpointsCompleted] = useState(new Set());
  const [videoEnded, setVideoEnded] = useState(false);
  const videoRef = useRef(null);
  const lastTriggeredCheckpoint = useRef(null);
  
  // Checkpoint trigger window in seconds
  const CHECKPOINT_TRIGGER_WINDOW = 1.5;
  // Video end detection threshold in seconds
  const VIDEO_END_THRESHOLD = 2;

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

        // Generate embed URL with enablejsapi for player control
        setEmbedUrl(`https://www.youtube.com/embed/${videoId}?autoplay=0&enablejsapi=1`);

        // Fetch checkpoints if transcript exists
        // Note: Backend caches checkpoints by videoId:languageCode to avoid regeneration
        if (videoData.transcript) {
          try {
            const checkpointData = await llmService.generateCheckpoints(
              videoData.transcript,
              { numCheckpoints: 5 }
            );
            setCheckpoints(checkpointData.checkpoints || []);
          } catch (err) {
            console.error("Error generating checkpoints:", err);
            // Continue without checkpoints
          }
        }
      } catch (err) {
        console.error("Error fetching video:", err);

        // If video doesn't exist in DB, try to create it
        if (err.status === 404) {
          try {
            console.log("Video not in database, creating entry...");
            const newVideo = await videoService.createVideo(videoId, {
              fetchMetadata: true,
              fetchTranscript: true
            });
            setVideo(newVideo);
            setEmbedUrl(`https://www.youtube.com/embed/${videoId}?autoplay=0&enablejsapi=1`);

            // Generate checkpoints if transcript was fetched
            // Note: Backend caches checkpoints to avoid regeneration on subsequent loads
            if (newVideo.transcript) {
              try {
                const checkpointData = await llmService.generateCheckpoints(
                  newVideo.transcript,
                  { numCheckpoints: 5 }
                );
                setCheckpoints(checkpointData.checkpoints || []);
              } catch (err) {
                console.error("Error generating checkpoints:", err);
              }
            }
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
  const handleBack = useCallback(() => {
    navigate("/dashboard");
  }, [navigate]);

  /**
   * Handle Checkpoint Correct Answer
   * 
   * Called when user answers checkpoint question correctly.
   * Marks checkpoint as completed and closes popup.
   */
  const handleCheckpointCorrect = useCallback(() => {
    if (currentCheckpoint) {
      setCheckpointsCompleted(prev => new Set([...prev, currentCheckpoint.id]));
      setCurrentCheckpoint(null);
      
      // Resume video playback
      if (videoRef.current) {
        videoRef.current.playVideo();
      }
    }
  }, [currentCheckpoint]);

  /**
   * Handle Ask AI Tutor
   * 
   * Opens chat interface with checkpoint context.
   * For now, shows alert - will be connected to chat later.
   * 
   * @param {Object} checkpoint - Checkpoint that needs help
   */
  const handleAskTutor = useCallback((checkpoint) => {
    // TODO: Integrate with chat interface
    alert(`Chat feature coming soon! You can ask about: "${checkpoint.question}"`);
  }, []);

  /**
   * Handle Video Time Update
   * 
   * Called every second to track video playback. Checks if current time
   * matches any checkpoint timestamp and triggers popup if needed.
   * Also detects when video ends.
   * 
   * @param {number} time - Current video time in seconds
   */
  const handleTimeUpdate = (time) => {
    // Check if video has ended (within VIDEO_END_THRESHOLD seconds of duration)
    if (video?.durationSeconds && time >= video.durationSeconds - VIDEO_END_THRESHOLD) {
      setVideoEnded(true);
    } else if (videoEnded && time < video.durationSeconds - VIDEO_END_THRESHOLD) {
      // Reset if user seeks backward
      setVideoEnded(false);
    }

    // Check if we should trigger a checkpoint
    if (!currentCheckpoint) {
      for (const checkpoint of checkpoints) {
        // Check if we're within trigger window after checkpoint time and haven't completed it
        if (
          time >= checkpoint.timestampSeconds &&
          time < checkpoint.timestampSeconds + CHECKPOINT_TRIGGER_WINDOW &&
          !checkpointsCompleted.has(checkpoint.id) &&
          lastTriggeredCheckpoint.current !== checkpoint.id
        ) {
          // Pause video and show checkpoint
          if (videoRef.current) {
            videoRef.current.pauseVideo();
          }
          setCurrentCheckpoint(checkpoint);
          lastTriggeredCheckpoint.current = checkpoint.id;
          break;
        }
      }
    }

    // Reset lastTriggeredCheckpoint if user seeks backward
    if (checkpoints.length > 0) {
      const lastCheckpoint = checkpoints.find(
        cp => cp.id === lastTriggeredCheckpoint.current
      );
      if (lastCheckpoint && time < lastCheckpoint.timestampSeconds - 5) {
        lastTriggeredCheckpoint.current = null;
      }
    }
  };

  /**
   * Handle Video Player Ready
   * 
   * Called when YouTube player is initialized and ready.
   * 
   * @param {Object} player - YouTube player instance
   */
  const handlePlayerReady = (player) => {
    console.log('Video player ready');
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
            {embedUrl && (
              <VideoPlayer
                embedUrl={embedUrl}
                ref={videoRef}
                onTimeUpdate={handleTimeUpdate}
                onReady={handlePlayerReady}
              />
            )}
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

            {/* Checkpoints List */}
            {checkpoints.length > 0 && (
              <div className="video-checkpoints">
                <h3>📍 Learning Checkpoints</h3>
                <p className="checkpoints-subtitle">
                  You'll be asked to answer questions at these points during the video
                </p>
                <div className="checkpoints-list">
                  {checkpoints.map((checkpoint) => (
                    <div
                      key={checkpoint.id}
                      className={`checkpoint-item ${
                        checkpointsCompleted.has(checkpoint.id) ? 'completed' : ''
                      }`}
                    >
                      <div className="checkpoint-marker">
                        {checkpointsCompleted.has(checkpoint.id) ? '✅' : '⏱️'}
                      </div>
                      <div className="checkpoint-info">
                        <div className="checkpoint-time">{checkpoint.timestamp}</div>
                        <div className="checkpoint-item-title">{checkpoint.title}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quiz Section - Shows only after video ends */}
            {video?.transcript && videoEnded && (
              <div className="video-quiz-section">
                <h3>📝 Test Your Knowledge</h3>
                <p className="quiz-section-subtitle">
                  Great! You've finished the video. Ready to test what you've learned?
                </p>
                <button 
                  className="take-quiz-button"
                  onClick={() => navigate(`/video/${videoId}/quiz`)}
                  aria-label="Take quiz for this video"
                >
                  Take Quiz →
                </button>
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

      {/* Checkpoint Popup */}
      {currentCheckpoint && (
        <CheckpointPopup
          checkpoint={currentCheckpoint}
          onCorrectAnswer={handleCheckpointCorrect}
          onAskTutor={handleAskTutor}
        />
      )}
    </div>
  );
}
