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
      <div className="home-hero">
        <h1>Welcome to LearnFlow</h1>
        <p>Transform YouTube videos into interactive learning experiences</p>
        <div className="cta-buttons">
          <Link to="/signup" className="cta-button primary">
            Get Started
          </Link>
          <Link to="/login" className="cta-button">
            Log In
          </Link>
        </div>
      </div>

      <div className="home-content">
        <div className="home-video-section">
          <p className="demo-label">Try it out - Paste a YouTube link below</p>
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

      <div className="features-section">
        <h2>Why LearnFlow?</h2>
        <div className="features-grid">
          <div className="feature-card">
            <h3>Interactive Learning</h3>
            <p>Transform any YouTube video into an engaging learning experience</p>
          </div>
          <div className="feature-card">
            <h3>Track Progress</h3>
            <p>Keep track of your learning journey with built-in checkpoints</p>
          </div>
          <div className="feature-card">
            <h3>Easy to Use</h3>
            <p>Simply paste a YouTube link and start learning immediately</p>
          </div>
        </div>
      </div>
    </div>
  );
}
