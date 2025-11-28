/**
 * YouTube Embed URL Management Hook
 * 
 * Custom React hook for handling YouTube URL input, validation, and conversion
 * to embed URLs. Supports multiple YouTube URL formats including standard watch
 * URLs, shortened youtu.be URLs, and direct embed URLs.
 * 
 * Automatically enables autoplay when generating embed URLs and provides URL
 * validation with user feedback.
 * 
 * @module useYouTubeEmbed
 */

import { useState } from 'react';

/**
 * useYouTubeEmbed Hook
 * 
 * Manages YouTube video URL state and provides methods for URL parsing,
 * validation, and conversion to embed format. Handles multiple URL formats
 * and provides user feedback for invalid URLs.
 * 
 * @returns {Object} YouTube embed management interface
 * @property {string} videoUrl - Current video URL input
 * @property {Function} setVideoUrl - Set video URL input value
 * @property {string} embedUrl - Generated embed URL with autoplay
 * @property {Function} handleLoadVideo - Parse URL and generate embed URL
 * @property {Function} resetVideo - Clear both URLs
 * 
 * @example
 * const { videoUrl, setVideoUrl, embedUrl, handleLoadVideo } = useYouTubeEmbed();
 * 
 * <input 
 *   value={videoUrl} 
 *   onChange={(e) => setVideoUrl(e.target.value)} 
 * />
 * <button onClick={handleLoadVideo}>Load Video</button>
 * {embedUrl && <VideoPlayer embedUrl={embedUrl} />}
 */
export function useYouTubeEmbed() {
  const [videoUrl, setVideoUrl] = useState('');
  const [embedUrl, setEmbedUrl] = useState('');

  /**
   * Extract Video ID from YouTube URL
   * 
   * Parses various YouTube URL formats to extract the video ID. Supports:
   * - Standard watch URLs: youtube.com/watch?v=VIDEO_ID
   * - Shortened URLs: youtu.be/VIDEO_ID
   * - Embed URLs: youtube.com/embed/VIDEO_ID
   * 
   * @param {string} url - YouTube URL to parse
   * @returns {string|null} Video ID if found, null if invalid URL format
   */
  const extractVideoId = (url) => {
    const patterns = [
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([^&]+)/,
      /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([^?]+)/,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([^?]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }
    return null;
  };

  /**
   * Load Video and Generate Embed URL
   * 
   * Validates the current videoUrl, extracts the video ID, and generates
   * an embed URL with autoplay enabled. Shows an alert for invalid URLs.
   * Logs video ID to console for debugging.
   */
  const handleLoadVideo = () => {
    const videoId = extractVideoId(videoUrl);
    if (videoId) {
      setEmbedUrl(`https://www.youtube.com/embed/${videoId}?autoplay=1`);
    } else if (videoUrl.trim()) {
      alert('Please enter a valid YouTube URL');
    }
  };

  /**
   * Reset Video State
   * 
   * Clears both the input URL and generated embed URL, returning the
   * hook to its initial state.
   */
  const resetVideo = () => {
    setVideoUrl('');
    setEmbedUrl('');
  };

  return {
    videoUrl,
    setVideoUrl,
    embedUrl,
    handleLoadVideo,
    resetVideo,
  };
}
