import React from 'react';
import { Play, Trash2 } from 'lucide-react';
import './VideoHistoryCard.css';

/**
 * VideoHistoryCard Component
 *
 * Displays a single video history entry with thumbnail preview, play overlay,
 * title, relative timestamp, progress bar, and delete button. Both the thumbnail
 * and title are clickable to select the video for playback.
 *
 * @param {Object} props - Component props
 * @param {Object} props.video - Video history entry data
 * @param {string} props.video.videoId - YouTube video ID
 * @param {string} props.video.title - Video title
 * @param {string} props.video.thumbnailUrl - Thumbnail image URL
 * @param {string} props.video.lastWatchedAt - ISO timestamp of last view
 * @param {Object} [props.progress] - Optional progress data
 * @param {number} props.progress.progressPercentage - Percentage completed (0-100)
 * @param {boolean} props.progress.isCompleted - Whether video is fully watched
 * @param {Function} props.onSelect - Callback when video is selected for playback
 * @param {Function} props.onDelete - Callback when video is deleted from history
 * @returns {React.ReactElement} Video history card with thumbnail and controls
 */
export default function VideoHistoryCard({ video, progress, onSelect, onDelete }) {
  /**
   * Format Date to Relative Time
   */
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // Normalized/fallback values to match test expectations and various prop shapes
  const thumbnailSrc = video?.thumbnailUrl ?? video?.thumbnail ?? '';
  const lastViewed = video?.lastViewedAt ?? video?.lastWatchedAt ?? '';
  const deleteId = video?.videoId ?? video?.id ?? null;

  // Progress normalization and computed values
  const percent = progress?.progressPercentage ?? progress?.percentage ?? 0;
  const roundedPercent = Math.round(percent);
  const completed = progress?.isCompleted ?? roundedPercent >= 100;

  return (
    <div className="video-history-card">
      {/* Thumbnail Section */}
      <button
        className="history-thumbnail-wrapper"
        onClick={() => onSelect(video)}
        aria-label={`Play ${video.title}`}
        type="button"
      >
        <img
          src={thumbnailSrc || ''}
          alt={video.title}
          className="history-thumbnail-img"
        />
        <div className="play-overlay">
          <div className="play-icon-circle">
            <Play className="play-icon" />
          </div>
        </div>
        {completed && (
          <div className="completed-badge">
            ✓ Completed
          </div>
        )}

        {/* Progress Bar (Bottom of Thumbnail) */}
        {progress && !completed && (
          <div className="history-progress-track">
            <div
              className="history-progress-fill"
              data-testid="progress-bar-fill"
              style={{ width: `${Math.max(0, roundedPercent)}%` }}
            />
          </div>
        )}
      </button>

      {/* Info Section */}
      <div className="history-info">
        <div>
          <button
            className="history-title"
            onClick={() => onSelect(video)}
            type="button"
          >
            {video.title}
          </button>
          <p className="history-meta">
            Last viewed {formatDate(lastViewed)}
          </p>
        </div>

        <div className="history-controls">
          {progress && !completed ? (
            <span className="percent-badge">
              {roundedPercent}% watched
            </span>
          ) : (
            <span></span>
          )}

          <button
            className="delete-history-btn"
            onClick={(e) => {
              e.stopPropagation();
              if (deleteId) onDelete(deleteId);
            }}
            aria-label="Delete from history"
            type="button"
          >
            <Trash2 className="delete-icon" />
          </button>
        </div>
      </div>
    </div>
  );
}
