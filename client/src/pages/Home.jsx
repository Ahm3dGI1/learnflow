import { Link } from "react-router-dom";
import InputBar from "../components/InputBar";
import VideoPlayer from "../components/VideoPlayer";
import { useYouTubeEmbed } from "../hooks/useYouTubeEmbed";

export default function Home() {
  const { videoUrl, setVideoUrl, embedUrl, handleLoadVideo } = useYouTubeEmbed();

  return (
    <div>
      <h1>It is LearnFlow! To be edited!</h1>
      <p>Simple and empty landing page.</p>
      <div>
        <Link to="/login">
          <button>Log in</button>
        </Link>
        <Link to="/signup">
          <button>Sign up</button>
        </Link>
        <Link to="/dashboard">
          <button>Go to Dashboard</button>
        </Link>
      </div>
      <main className="container">
        {!embedUrl && (
          <InputBar
            videoUrl={videoUrl}
            setVideoUrl={setVideoUrl}
            onSend={handleLoadVideo}
          />
        )}
        <VideoPlayer embedUrl={embedUrl} />
      </main>
    </div>
  );
}
