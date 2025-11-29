/**
 * Video Player Component
 * 
 * Displays a YouTube video using an iframe embed with responsive layout.
 * Renders null when no embed URL is provided. Supports YouTube iframe API
 * for playback control and time tracking.
 * 
 * @module VideoPlayer
 */

import { useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from "react";
import "./VideoPlayer.css";

/**
 * VideoPlayer Component
 * 
 * Responsive YouTube video player with iframe API integration. Provides
 * playback control methods and time tracking through ref. Uses YouTube
 * iframe API for programmatic control.
 * 
 * @param {Object} props - Component props
 * @param {string} props.embedUrl - YouTube embed URL with enablejsapi=1
 * @param {Function} props.onTimeUpdate - Callback for current time updates (seconds)
 * @param {Function} props.onReady - Callback when player is ready
 * @returns {React.ReactElement|null} Video player iframe or null if no URL provided
 * 
 * @example
 * const playerRef = useRef();
 * <VideoPlayer 
 *   ref={playerRef}
 *   embedUrl="https://www.youtube.com/embed/abc?enablejsapi=1"
 *   onTimeUpdate={(time) => console.log(time)}
 * />
 * // Later: playerRef.current.pauseVideo()
 */
const VideoPlayer = forwardRef(({ embedUrl, onTimeUpdate, onReady }, ref) => {
  const iframeRef = useRef(null);
  const playerRef = useRef(null);
  const timeIntervalRef = useRef(null);
  const playerIdRef = useRef(`youtube-player-${Math.random().toString(36).slice(2, 11)}`);

  /**
   * Handle Player Ready
   * Wrapped in useCallback to maintain referential stability
   */
  const handlePlayerReady = useCallback((event) => {
    // TODO: Use the `player` instance for future features (e.g., controlling playback, fetching player state)
    if (onReady) {
      onReady(playerRef.current);
    }

    // Start time tracking
    timeIntervalRef.current = setInterval(() => {
      if (playerRef.current && playerRef.current.getCurrentTime) {
        const currentTime = playerRef.current.getCurrentTime();
        if (onTimeUpdate) {
          onTimeUpdate(currentTime);
        }
      }
    }, 1000); // Check every second
  }, [onReady, onTimeUpdate]);

  /**
   * Handle Player State Change
   * Wrapped in useCallback to maintain referential stability
   */
  const handleStateChange = useCallback((event) => {
    // TODO: Implement player state change handling if needed in future.
  }, []);

  /**
   * Initialize YouTube iframe API
   */
  useEffect(() => {
    /**
     * Initialize YouTube Player
     */
    const initializePlayer = () => {
      if (!embedUrl || playerRef.current) return;

      // Extract video ID from embed URL
      const videoIdMatch = embedUrl.match(/embed\/([^?]+)/);
      if (!videoIdMatch) return;

      const videoId = videoIdMatch[1];

      // Avoid creating duplicate players
      if (playerRef.current) {
        playerRef.current.destroy();
      }

      playerRef.current = new window.YT.Player(playerIdRef.current, {
        videoId: videoId,
        events: {
          onReady: handlePlayerReady,
          onStateChange: handleStateChange,
        },
      });
    };

    // Load YouTube iframe API script if not already loaded
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

      // Wait for API to be ready - use callback queue to avoid overwriting
      const originalCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (originalCallback) originalCallback();
        if (iframeRef.current && embedUrl) {
          initializePlayer();
        }
      };
    }

    // If API already loaded, initialize immediately
    if (window.YT && window.YT.Player) {
      initializePlayer();
    }

    return () => {
      if (timeIntervalRef.current) {
        clearInterval(timeIntervalRef.current);
      }
      if (playerRef.current) {
        playerRef.current.destroy();
      }
    };
  }, [embedUrl, handlePlayerReady, handleStateChange]);

  /**
   * Expose player control methods to parent via ref
   */
  useImperativeHandle(ref, () => ({
    pauseVideo: () => {
      if (playerRef.current && playerRef.current.pauseVideo) {
        playerRef.current.pauseVideo();
      }
    },
    playVideo: () => {
      if (playerRef.current && playerRef.current.playVideo) {
        playerRef.current.playVideo();
      }
    },
    getCurrentTime: () => {
      if (playerRef.current && playerRef.current.getCurrentTime) {
        return playerRef.current.getCurrentTime();
      }
      return 0;
    },
    seekTo: (seconds) => {
      if (playerRef.current && playerRef.current.seekTo) {
        playerRef.current.seekTo(seconds, true);
      }
    },
  }));

  // Don't render if no embed URL provided
  if (!embedUrl) return null;

  return (
    <div className="video-section">
      <div className="video-wrapper">
        <div className="video-container">
          <div id={playerIdRef.current}></div>
        </div>
      </div>
    </div>
  );
});

VideoPlayer.displayName = 'VideoPlayer';

export default VideoPlayer;
