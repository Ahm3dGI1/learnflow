/**
 * Share Button Component
 *
 * Provides a button to copy the current video URL to clipboard.
 * Shows a toast notification confirming the copy action.
 *
 * @module ShareButton
 *
 * @example
 * <ShareButton videoId="dQw4w9WgXcQ" />
 */

import { useState, useCallback } from 'react';
import Toast from './Toast';
import './ShareButton.css';

/**
 * ShareButton Component
 *
 * Button that copies the YouTube video URL to the user's clipboard.
 * Displays a toast notification on successful copy.
 *
 * @param {Object} props - Component props
 * @param {string} props.videoId - YouTube video ID to share
 * @param {string} [props.variant='default'] - Button variant: 'default', 'icon-only'
 * @param {string} [props.className] - Additional CSS classes
 * @returns {React.ReactElement} Share button with toast notification
 */
export default function ShareButton({ videoId, variant = 'default', className = '' }) {
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  /**
   * Copy video URL to clipboard
   *
   * Constructs the full YouTube URL and copies it to the clipboard.
   * Shows success or error toast based on the result.
   */
  const handleShare = useCallback(async () => {
    if (!videoId) {
      setToastMessage('No video to share');
      setToastType('error');
      setShowToast(true);
      return;
    }

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    try {
      await navigator.clipboard.writeText(videoUrl);
      setToastMessage('Video link copied to clipboard!');
      setToastType('success');
      setShowToast(true);
    } catch (err) {
      // Fallback for older browsers
      try {
        const textArea = document.createElement('textarea');
        textArea.value = videoUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);

        setToastMessage('Video link copied to clipboard!');
        setToastType('success');
        setShowToast(true);
      } catch (fallbackErr) {
        console.error('Failed to copy:', fallbackErr);
        setToastMessage('Failed to copy link. Please copy manually.');
        setToastType('error');
        setShowToast(true);
      }
    }
  }, [videoId]);

  /**
   * Close the toast notification
   */
  const handleCloseToast = useCallback(() => {
    setShowToast(false);
  }, []);

  return (
    <>
      <button
        className={`share-button share-button-${variant} ${className}`}
        onClick={handleShare}
        aria-label="Copy video link to clipboard"
        title="Share video link"
      >
        <svg
          className="share-icon"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
        {variant !== 'icon-only' && <span className="share-text">Share</span>}
      </button>

      <Toast
        message={toastMessage}
        type={toastType}
        isVisible={showToast}
        onClose={handleCloseToast}
        duration={3000}
      />
    </>
  );
}

