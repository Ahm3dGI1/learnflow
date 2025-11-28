/**
 * Home Page Component
 * 
 * Landing page for LearnFlow application featuring hero section, demo video
 * player, and features showcase. Provides unauthenticated users with an
 * introduction to the platform and call-to-action buttons for signup/login.
 * Includes a working video demo that visitors can try without authentication.
 * 
 * @module Home
 */

import { Link } from "react-router-dom";
import InputBar from "../components/InputBar";
import VideoPlayer from "../components/VideoPlayer";
import { useYouTubeEmbed } from "../hooks/useYouTubeEmbed";
import "./Home.css";

/**
 * Home Component
 * 
 * Landing page with hero section, interactive video demo, and feature cards.
 * Allows visitors to test the platform by loading a YouTube video without
 * requiring authentication. Displays three key features and prominent CTA
 * buttons for signup and login.
 * 
 * @returns {React.ReactElement} Home page with hero, demo section, and features
 * 
 * @example
 * // Used in main App routing
 * <Route path="/" element={<Home />} />
 */
export default function Home() {
  const { videoUrl, setVideoUrl, embedUrl, handleLoadVideo } = useYouTubeEmbed();

  return (
    <div className="home-container">
      {/* Header */}
      <header className="home-header">
        <div className="header-content">
          <div className="logo">LearnFlow</div>
          <div className="header-buttons">
            <Link to="/login" className="header-link">Login</Link>
            <Link to="/signup" className="header-button">Sign Up</Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="home-main">
        <div className="hero-section">
          <h1 className="hero-title">Transform Any Video Into an Interactive Learning Experience</h1>
          <p className="hero-subtitle">Paste a YouTube video URL and let AI add interactive checkpoints, tutoring, and study materials.</p>
        </div>

        {/* Transform Card */}
        <div className="transform-card">
          <h2 className="transform-title">Transform Any YouTube Video into an Interactive Learning Experience</h2>
          <p className="transform-instruction">Paste a YouTube video URL below. Our AI will automatically:</p>
          
          <div className="feature-boxes">
            <div className="feature-box">
              <div className="feature-icon">🧠</div>
              <h3>AI Analysis</h3>
              <p>Transcribe and analyze video content.</p>
            </div>
            <div className="feature-box">
              <div className="feature-icon">✓</div>
              <h3>Auto Checkpoints</h3>
              <p>Generate interactive questions at key moments.</p>
            </div>
            <div className="feature-box">
              <div className="feature-icon">▶</div>
              <h3>Start Learning</h3>
              <p>Watch with AI tutor and study materials.</p>
            </div>
          </div>

          {!embedUrl && (
            <div className="input-container">
              <InputBar
                videoUrl={videoUrl}
                setVideoUrl={setVideoUrl}
                onSend={handleLoadVideo}
              />
            </div>
          )}

          {embedUrl && (
            <div className="video-container">
              <VideoPlayer embedUrl={embedUrl} />
            </div>
          )}
        </div>

        {/* How It Works Section */}
        <div className="how-it-works-card">
          <h2 className="how-it-works-title">How It Works</h2>
          <div className="steps-container">
            <div className="step">
              <div className="step-number">1</div>
              <div className="step-content">
                <h3>Paste YouTube URL</h3>
                <p>Simply paste any educational YouTube video URL. Our AI will automatically process and transform it into an interactive learning experience.</p>
              </div>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <div className="step-content">
                <h3>AI Processing</h3>
                <p>The system transcribes the video, analyzes key concepts, and automatically generates interactive checkpoints at important moments.</p>
              </div>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <div className="step-content">
                <h3>Interactive Learning</h3>
                <p>Watch the video with interactive checkpoints, ask the AI tutor questions, and generate personalized study materials after completion.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
