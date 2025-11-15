import "./VideoHistoryCard.css";

export default function VideoHistoryCard({ video, onSelect, onDelete }) {
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

  return (
    <div className="video-history-card">
      <div className="video-thumbnail-container" onClick={() => onSelect(video)}>
        <img
          src={video.thumbnail}
          alt={video.title}
          className="video-thumbnail"
        />
        <div className="play-overlay">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="white">
            <path d="M8 5v14l11-7z"/>
          </svg>
        </div>
      </div>

      <div className="video-info">
        <h4 className="video-title" onClick={() => onSelect(video)}>
          {video.title}
        </h4>
        <p className="video-date">Last viewed {formatDate(video.lastViewedAt)}</p>
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
