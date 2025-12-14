/**
 * Checkpoint Progress Bar Component
 *
 * Displays a visual progress bar showing checkpoint locations on the video timeline.
 * Allows users to click on checkpoints to seek to that position in the video.
 *
 * @module CheckpointProgressBar
 */

import { useState, useEffect } from 'react';
import { llmService } from '../services';
import './CheckpointProgressBar.css';

/**
 * CheckpointProgressBar Component
 *
 * Visual timeline component showing checkpoint positions and completion status.
 * Fetches checkpoint data from backend and displays them on a progress bar.
 *
 * @param {Object} props - Component props
 * @param {number} props.videoId - Video database ID
 * @param {number} props.videoDuration - Video duration in seconds
 * @param {Array} props.checkpoints - Array of checkpoint objects with timestampSeconds, title, id
 * @param {Set} props.checkpointsCompleted - Set of completed checkpoint IDs
 * @param {Function} props.onCheckpointClick - Callback when checkpoint is clicked (receives timeSeconds)
 * @returns {React.ReactElement} Checkpoint progress bar component
 */
export default function CheckpointProgressBar({
  videoId,
  videoDuration,
  checkpoints = [],
  checkpointsCompleted = new Set(),
  onCheckpointClick
}) {
  const [progressData, setProgressData] = useState(null);

  useEffect(() => {
    const fetchCheckpointProgress = async () => {
      if (!videoId) {
        return;
      }

      try {
        // Fetch checkpoint progress from backend
        const progress = await llmService.getCheckpointProgress(videoId);
        setProgressData(progress);
      } catch (err) {
        console.error('Error fetching checkpoint progress:', err);
        // Continue without progress data - we can still show checkpoints
      }
    };

    fetchCheckpointProgress();
  }, [videoId]);

  // Don't render if no checkpoints or invalid video duration
  if (!checkpoints || checkpoints.length === 0 || !videoDuration || videoDuration <= 0) {
    return null;
  }

  /**
   * Calculate the position of a checkpoint on the timeline
   * @param {number} timestampSeconds - Checkpoint timestamp in seconds
   * @returns {number} Position as percentage (0-100)
   */
  const calculatePosition = (timestampSeconds) => {
    return (timestampSeconds / videoDuration) * 100;
  };

  /**
   * Handle checkpoint marker click
   * @param {Object} checkpoint - Checkpoint object
   */
  const handleMarkerClick = (checkpoint) => {
    if (onCheckpointClick && checkpoint.timestampSeconds !== undefined) {
      onCheckpointClick(checkpoint.timestampSeconds);
    }
  };

  /**
   * Check if a checkpoint is completed
   * @param {number} checkpointId - Checkpoint ID
   * @returns {boolean} True if completed
   */
  const isCheckpointCompleted = (checkpointId) => {
    // First check the local set
    if (checkpointsCompleted.has(checkpointId)) {
      return true;
    }

    // Then check backend progress data
    if (progressData && progressData.completions) {
      const completion = progressData.completions.find(c => c.checkpointId === checkpointId);
      return completion?.isCompleted || false;
    }

    return false;
  };

  /**
   * Format timestamp for tooltip display
   * @param {number} seconds - Time in seconds
   * @returns {string} Formatted time (MM:SS or HH:MM:SS)
   */
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${minutes}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="checkpoint-progress-bar">
      <div className="progress-bar-container">
        <div className="progress-bar-track">
          {/* Render checkpoint markers */}
          {checkpoints.map((checkpoint) => {
            const position = calculatePosition(checkpoint.timestampSeconds);
            const completed = isCheckpointCompleted(checkpoint.id);

            return (
              <div
                key={checkpoint.id}
                className={`checkpoint-marker ${completed ? 'completed' : ''}`}
                style={{ left: `${position}%` }}
                onClick={() => handleMarkerClick(checkpoint)}
                role="button"
                tabIndex={0}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleMarkerClick(checkpoint);
                  }
                }}
                aria-label={`Checkpoint at ${formatTime(checkpoint.timestampSeconds)}: ${checkpoint.title}`}
              >
                <div className="checkpoint-tooltip">
                  {formatTime(checkpoint.timestampSeconds)} - {checkpoint.title}
                  {completed && ' ✓'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Optional: Show progress summary */}
      {progressData && progressData.totalCheckpoints > 0 && (
        <div style={{
          fontSize: '12px',
          color: '#666',
          marginTop: '4px',
          textAlign: 'center'
        }}>
          {progressData.completedCheckpoints} of {progressData.totalCheckpoints} checkpoints completed
          ({Math.round(progressData.progressPercentage)}%)
        </div>
      )}
    </div>
  );
}
