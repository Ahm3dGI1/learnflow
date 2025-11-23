/**
 * Video Player Component
 * 
 * Displays a YouTube video using an iframe embed with responsive layout.
 * Renders null when no embed URL is provided. Supports all YouTube iframe
 * features including autoplay, fullscreen, and picture-in-picture.
 * 
 * @module VideoPlayer
 */

import "./VideoPlayer.css";

/**
 * VideoPlayer Component
 * 
 * Responsive YouTube video player using iframe embed. Includes support for
 * autoplay, clipboard access, gyroscope, picture-in-picture, and fullscreen.
 * The component uses nested div wrappers for responsive 16:9 aspect ratio
 * maintenance via CSS.
 * 
 * @param {Object} props - Component props
 * @param {string} props.embedUrl - YouTube embed URL with optional query parameters
 * @returns {React.ReactElement|null} Video player iframe or null if no URL provided
 * 
 * @example
 * // Display a video with autoplay
 * <VideoPlayer embedUrl="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1" />
 * 
 * @example
 * // No video - renders nothing
 * <VideoPlayer embedUrl="" />
 */
export default function VideoPlayer({ embedUrl }) {
  // Don't render if no embed URL provided
  if (!embedUrl) return null;

  return (
    <div className="video-section">
      <div className="video-wrapper">
        <div className="video-container">
          <iframe
            src={embedUrl}
            title="YouTube video player"
            className="video-iframe"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
}
