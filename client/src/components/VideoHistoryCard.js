import React from 'react';
import { Play, Trash2, CheckCircle } from 'lucide-react';

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

  return (
    <div className="group relative flex flex-col md:flex-row bg-white/80 backdrop-blur-md border border-white/60 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
      {/* Thumbnail Section */}
      <div
        className="relative w-full md:w-48 h-32 flex-shrink-0 cursor-pointer overflow-hidden"
        onClick={() => onSelect(video)}
      >
        <img
          {...(video.thumbnailUrl ? { src: video.thumbnailUrl } : {})}
          alt={video.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center play-overlay">
          <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center transform scale-90 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-300 shadow-lg">
            <Play className="w-5 h-5 text-blue-600 ml-1" />
          </div>
        </div>
        {progress?.isCompleted && (
          <div className="absolute top-2 right-2 bg-green-500/90 text-white text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1 shadow-sm backdrop-blur-sm">
            <CheckCircle className="w-3 h-3" />
            Completed
          </div>
        )}

        {/* Progress Bar (Bottom of Thumbnail) */}
        {progress && !progress.isCompleted && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200">
            <div
              className="h-full bg-blue-500"
              style={{ width: `${progress.progressPercentage}%` }}
            />
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="flex-1 p-4 flex flex-col justify-between">
        <div>
          <h4
            className="text-lg font-semibold text-gray-900 mb-1 line-clamp-1 cursor-pointer hover:text-blue-600 transition-colors"
            onClick={() => onSelect(video)}
          >
            {video.title}
          </h4>
          <p className="text-sm text-gray-500">
            Last viewed {formatDate(video.lastWatchedAt)}
          </p>
        </div>

        <div className="flex items-center justify-between mt-2">
          {progress && !progress.isCompleted ? (
            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
              {Math.round(progress.progressPercentage)}% watched
            </span>
          ) : (
            <span></span>
          )}

          <button
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all opacity-0 group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(video.videoId);
            }}
            aria-label="Delete from history"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
