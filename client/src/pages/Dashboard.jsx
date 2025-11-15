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

export default function Dashboard() {
  const { user } = useAuth();
  const { videoUrl, setVideoUrl, embedUrl, handleLoadVideo, resetVideo } = useYouTubeEmbed();
  const { history, addToHistory, removeFromHistory, clearHistory } = useVideoHistory();

  // Extract video ID from embed URL
  const getVideoIdFromEmbed = (url) => {
    if (!url) return null;
    const match = url.match(/embed\/([^?]+)/);
    return match ? match[1] : null;
  };

  // Add to history when a video is loaded
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

  const handleSelectFromHistory = (video) => {
    setVideoUrl(`https://www.youtube.com/watch?v=${video.videoId}`);
    handleLoadVideo();
  };

  const handleDeleteFromHistory = (id) => {
    if (window.confirm('Remove this video from your history?')) {
      removeFromHistory(id);
    }
  };

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
