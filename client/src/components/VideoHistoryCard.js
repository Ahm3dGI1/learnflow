/**
 * Video History Card Component
 * 
 * Individual card for displaying video history entries with thumbnail,
 * title, timestamp, and delete functionality. Provides relative time
 * formatting (e.g., "5 minutes ago") and clickable areas for video selection.
 * 
 * @module VideoHistoryCard
 */

import "./VideoHistoryCard.css";

/**
 * VideoHistoryCard Component
 *
 * Displays a single video history entry with thumbnail preview, play overlay,
 * title, relative timestamp, progress bar, and delete button. Both the thumbnail
 * and title are clickable to select the video for playback.
 *
 * @param {Object} props - Component props
 * @param {Object} props.video - Video history entry data
 * @param {string} props.video.id - Unique entry ID
 * @param {string} props.video.videoId - YouTube video ID
 * @param {string} props.video.title - Video title
 * @param {string} props.video.thumbnail - Thumbnail image URL
 * @param {string} props.video.lastViewedAt - ISO timestamp of last view
 * @param {Object} [props.progress] - Optional progress data
 * @param {number} props.progress.progressPercentage - Percentage completed (0-100)
 * @param {boolean} props.progress.isCompleted - Whether video is fully watched
 * @param {Function} props.onSelect - Callback when video is selected for playback
 * @param {Function} props.onDelete - Callback when video is deleted from history
 * @returns {React.ReactElement} Video history card with thumbnail and controls
 *
 * @example
 * <VideoHistoryCard
 *   video={{
 *     id: 123,
 *     videoId: 'dQw4w9WgXcQ',
 *     title: 'Example Video',
 *     thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
 *     lastViewedAt: '2024-01-15T10:30:00Z'
 *   }}
 *   progress={{ progressPercentage: 45, isCompleted: false }}
 *   onSelect={handleVideoSelect}
 *   onDelete={handleVideoDelete}
 * />
 */
export default function VideoHistoryCard({ video, progress, onSelect, onDelete }) {
  /**
   * Format Date to Relative Time
   * 
   * Converts an ISO date string to human-readable relative time format:
   * - Under 1 hour: "X minutes ago"
   * - Under 24 hours: "X hours ago"
   * - Under 1 week: "X days ago"
   * - Over 1 week: Full date using locale format
   * 
   * Properly handles singular/plural forms for time units.
   * 
   * @param {string} dateString - ISO 8601 date string
   * @returns {string} Formatted relative or absolute date string
   */
  const formatDate = (dateString) => {
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

  // add near the top inside the component:
  const thumbnailSrc =
    video.thumbnailUrl ||
    video.thumbnail ||
    (video.videoId ? `https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg` : "");

  return (
    <div className="video-history-card">
      <div>
        <div className="video-thumbnail-container" onClick={() => onSelect(video)}>
          <img
            src={thumbnailSrc}
            alt={video.title}
            className="video-thumbnail"
            onError={(e) => {
              // fallback if mqdefault fails
              if (video.videoId) {
                e.currentTarget.src = `https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`;
              }
            }}
          />
          <div className="play-overlay">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="white">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
          {progress?.isCompleted && (
            <div className="completed-badge">✓ Completed</div>
          )}
        </div>

        {/* Progress Bar */}
        {progress && !progress.isCompleted && (
          <div className="progress-bar-container">
            <div
              className="progress-bar-fill"
              style={{ width: `${progress.progressPercentage}%` }}
            />
          </div>
        )}
      </div>

      <div className="video-info">
        <h4 className="video-title" onClick={() => onSelect(video)}>
          {video.title}
        </h4>
        <p className="video-date">Last viewed {formatDate(video.lastViewedAt)}</p>
        {progress && !progress.isCompleted && (
          <p className="video-progress">{Math.round(progress.progressPercentage)}% watched</p>
        )}
      </div>

      <button
        className="delete-button"
        onClick={() => onDelete(video.id)}
        aria-label="Delete from history"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
        </svg>
      </button>
    </div>
  );
}
