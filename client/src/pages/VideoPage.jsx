/**
 * Video Page Component
 *
 * Dedicated page for watching videos with AI tutor chat interface.
 * Fetches video data from backend and provides a comprehensive learning experience.
 *
 * Features:
 * - Video player with metadata display
 * - AI Tutor chat interface in sidebar
 * - Checkpoints shown as popups at specific timestamps
 * - Quiz and summary shown at video end
 *
 * @module VideoPage
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import VideoPlayer from "../components/VideoPlayer";
import CheckpointPopup from "../components/CheckpointPopup";
import VideoSummary from "../components/VideoSummary";
import CheckpointProgressBar from "../components/CheckpointProgressBar";
import { videoService, llmService, progressService } from "../services";
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
  const [savedProgress, setSavedProgress] = useState(null);
  const [videoEnded, setVideoEnded] = useState(false);
  const [summaryData, setSummaryData] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState(null);
  const videoRef = useRef(null);
  const lastTriggeredCheckpoint = useRef(null);
  const lastProgressSaveTime = useRef(0);
  const hasResumed = useRef(false);
  // Refs that always contain the latest values to prevent unnecessary re-renders of handleTimeUpdate callback
  const videoDataRef = useRef(null);
  const checkpointsRef = useRef([]);
  const completedRef = useRef(new Set());
  const currentCheckpointRef = useRef(null);
  const videoEndedRef = useRef(false);
  const userRef = useRef(null);


  // Checkpoint trigger window in seconds
  const CHECKPOINT_TRIGGER_WINDOW = 1.5;
  // Video end detection threshold in seconds
  const VIDEO_END_THRESHOLD = 2;
  // Progress update interval in seconds
  const PROGRESS_UPDATE_INTERVAL = 10;

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

        // Fetch saved progress if user is logged in and video has database ID
        if (user && videoData.id) {
          try {
            const progressData = await progressService.getProgress(user.uid, videoData.id);
            if (progressData && !progressData.isCompleted) {
              setSavedProgress(progressData);
            }
          } catch (err) {
            console.error("Error fetching progress:", err);
            // Continue without saved progress
          }
        }

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

          // Generate summary
          try {
            setSummaryLoading(true);
            setSummaryError(null);
            const summary = await llmService.generateSummary(
              videoData.transcript
            );
            setSummaryData(summary);
          } catch (err) {
            console.error("Error generating summary:", err);
            setSummaryError("Failed to generate summary");
          } finally {
            setSummaryLoading(false);
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

            // Log any warnings from the backend
            if (newVideo.metadataWarning) {
              console.warn("Metadata fetch warning:", newVideo.metadataWarning);
            }
            if (newVideo.transcriptWarning) {
              console.error("Transcript fetch warning:", newVideo.transcriptWarning);
            }

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

              // Generate summary
              try {
                setSummaryLoading(true);
                setSummaryError(null);
                const summary = await llmService.generateSummary(
                  newVideo.transcript
                );
                setSummaryData(summary);
              } catch (err) {
                console.error("Error generating summary:", err);
                setSummaryError("Failed to generate summary");
              } finally {
                setSummaryLoading(false);
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
  }, [videoId, user]);
  // Whenever React updates the real state, keep a silent mirror for the video player logic
  useEffect(() => { videoDataRef.current = video; }, [video]);
  useEffect(() => { checkpointsRef.current = checkpoints; }, [checkpoints]);
  useEffect(() => { completedRef.current = checkpointsCompleted; }, [checkpointsCompleted]);
  useEffect(() => { currentCheckpointRef.current = currentCheckpoint; }, [currentCheckpoint]);
  useEffect(() => { videoEndedRef.current = videoEnded; }, [videoEnded]);
  useEffect(() => { userRef.current = user; }, [user]);

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
      if (videoRef.current && videoRef.current.playVideo) {
        videoRef.current.playVideo();
      }
    }
  }, [currentCheckpoint]);

  /**
   * Handle Skip Checkpoint
   *
   * Closes checkpoint popup and resumes video without answering.
   * Does not mark checkpoint as completed.
   */
  const handleSkipCheckpoint = useCallback(() => {
    setCurrentCheckpoint(null);

    // Resume video playback
    if (videoRef.current && videoRef.current.playVideo) {
      videoRef.current.playVideo();
    }
  }, []);

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
   * Also detects when video ends and saves progress every 10 seconds.
   *
   * @param {number} time - Current video time in seconds
   */
  const handleTimeUpdate = useCallback(async (time) => {
    // Check if video has ended (within VIDEO_END_THRESHOLD seconds of duration)
    const v = videoDataRef.current;
    const cps = checkpointsRef.current || [];
    const completed = completedRef.current || new Set();
    const cpOpen = currentCheckpointRef.current;
    const u = userRef.current;

    if (v?.durationSeconds && time >= v.durationSeconds - VIDEO_END_THRESHOLD) {
      if (!videoEndedRef.current) {
        videoEndedRef.current = true;
        setVideoEnded(true);
      }
    } else if (videoEndedRef.current && v?.durationSeconds && time < v.durationSeconds - VIDEO_END_THRESHOLD) {
      videoEndedRef.current = false;
    }


    // Check if we should trigger a checkpoint
    if (!cpOpen) {
      for (const checkpoint of cps) {
        if (
          time >= checkpoint.timestampSeconds &&
          time < checkpoint.timestampSeconds + CHECKPOINT_TRIGGER_WINDOW &&
          !completed.has(checkpoint.id) &&
          lastTriggeredCheckpoint.current !== checkpoint.id
        ) {
          if (videoRef.current) videoRef.current.pauseVideo();
          setCurrentCheckpoint(checkpoint);
          lastTriggeredCheckpoint.current = checkpoint.id;
          break;
        }
      }
    }

    // Reset lastTriggeredCheckpoint if user seeks backward
    if (cps.length > 0) {
      const lastCheckpoint = cps.find(
        cp => cp.id === lastTriggeredCheckpoint.current
      );
      if (lastCheckpoint && time < lastCheckpoint.timestampSeconds - 5) {
        lastTriggeredCheckpoint.current = null;
      }
    }

    // Save progress every 10 seconds
    const currentTime = Date.now();
    const timeSinceLastSave = (currentTime - lastProgressSaveTime.current) / 1000;

    if (
      u &&
      v?.id &&
      time > 0 &&
      timeSinceLastSave >= PROGRESS_UPDATE_INTERVAL
    ) {
      try {
        await progressService.updateProgress(u.uid, v.id, Math.floor(time));
        lastProgressSaveTime.current = currentTime;
        console.log(`Progress saved: ${Math.floor(time)}s`);
      } catch (err) {
        console.error("Error saving progress:", err);
      }
    }
  }, []);

  /**
   * Handle Video Player Ready
   *
   * Called when YouTube player is initialized and ready.
   * Auto-seeks to saved position if progress exists.
   *
   * @param {Object} player - YouTube player instance
   */
  const handlePlayerReady = useCallback((player) => {
    console.log('Video player ready');

    // Auto-resume from saved position if available
    // Add a small delay to allow YouTube to buffer
    if (savedProgress && !hasResumed.current && videoRef.current) {
      const resumePosition = savedProgress.lastPositionSeconds;
      console.log(`Will resume from ${resumePosition}s in 1 second...`);

      setTimeout(() => {
        if (videoRef.current) {
          console.log(`Resuming now from ${resumePosition}s`);
          videoRef.current.seekTo(resumePosition);
          hasResumed.current = true;
        }
      }, 1000); // Wait 1 second for initial buffering
    }
  }, [savedProgress]);

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

            {/* Video Summary */}
            <VideoSummary
              summary={summaryData?.summary}
              loading={summaryLoading}
              error={summaryError}
              wordCount={summaryData?.wordCount}
            />

            {/* Checkpoint Progress Bar */}
            {user && video && checkpoints.length > 0 && (
              <CheckpointProgressBar
                videoId={video.id}
                videoDuration={video.durationSeconds}
                checkpoints={checkpoints}
                checkpointsCompleted={checkpointsCompleted}
                onCheckpointClick={(timeSeconds) => {
                  if (videoRef.current) {
                    videoRef.current.seekTo(timeSeconds);
                  }
                }}
              />
            )}

            {/* Checkpoints List */}
            {checkpoints.length > 0 && (
              <div className="video-checkpoints">
                <h3>Learning Checkpoints</h3>
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
                      onClick={() => {
                        if (videoRef.current && checkpoint.timestampSeconds !== undefined) {
                          videoRef.current.seekTo(checkpoint.timestampSeconds);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if ((e.key === 'Enter' || e.key === ' ') && checkpoint.timestampSeconds !== undefined) {
                          e.preventDefault();
                          if (videoRef.current) {
                            videoRef.current.seekTo(checkpoint.timestampSeconds);
                          }
                        }
                      }}
                      style={{ cursor: 'pointer' }}
                    >
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
          onSkip={handleSkipCheckpoint}
          checkpointId={currentCheckpoint?.id}
          firebaseUid={user?.uid}
          videoId={video?.id}
        />
      )}
    </div>
  );
}
