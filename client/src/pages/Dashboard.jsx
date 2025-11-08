import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useAuth } from "../auth/AuthContext";
import { useYouTubeEmbed } from "../hooks/useYouTubeEmbed";
import InputBar from "../components/InputBar";
import VideoPlayer from "../components/VideoPlayer";
import "./Dashboard.css";

export default function Dashboard() {
  const { user } = useAuth();
  const { videoUrl, setVideoUrl, embedUrl, handleLoadVideo } = useYouTubeEmbed();

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
          <h3>Your Learning Content</h3>
          {!embedUrl && (
            <InputBar
              videoUrl={videoUrl}
              setVideoUrl={setVideoUrl}
              onSend={handleLoadVideo}
            />
          )}
          <VideoPlayer embedUrl={embedUrl} />
        </div>
      </div>
    </div>
  );
}
