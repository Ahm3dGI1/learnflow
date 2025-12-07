/**
 * Keyboard Shortcuts Hook for Video Player
 *
 * Provides keyboard shortcuts for controlling video playback.
 * Shortcuts are only active when not typing in an input field.
 *
 * @module useKeyboardShortcuts
 *
 * Available Shortcuts:
 * - Space/K: Play/Pause toggle
 * - Left Arrow: Seek backward 10 seconds
 * - Right Arrow: Seek forward 10 seconds
 * - J: Seek backward 10 seconds
 * - L: Seek forward 10 seconds
 * - M: Toggle mute (if supported)
 * - F: Toggle fullscreen
 * - ? (Shift+/): Show/hide shortcuts help
 *
 * @example
 * const { showHelp, setShowHelp } = useKeyboardShortcuts(videoRef);
 */

import { useEffect, useState, useCallback } from 'react';

/**
 * Seek amount in seconds for arrow key navigation
 * @constant {number}
 */
const SEEK_AMOUNT = 10;

/**
 * Check if an element is an input field where typing should be allowed
 *
 * @param {HTMLElement} element - DOM element to check
 * @returns {boolean} True if element is an input field
 */
function isInputElement(element) {
  const tagName = element.tagName.toLowerCase();
  const isInput = tagName === 'input' || tagName === 'textarea' || tagName === 'select';
  const isEditable = element.isContentEditable;
  return isInput || isEditable;
}

/**
 * useKeyboardShortcuts Hook
 *
 * Sets up keyboard event listeners for video playback control.
 * Automatically cleans up listeners on unmount.
 *
 * @param {React.RefObject} videoRef - Ref to the VideoPlayer component
 * @param {Object} options - Additional options
 * @param {boolean} [options.enabled=true] - Whether shortcuts are enabled
 * @returns {Object} Hook state and controls
 * @returns {boolean} returns.showHelp - Whether help modal is visible
 * @returns {Function} returns.setShowHelp - Function to toggle help modal
 * @returns {Array} returns.shortcuts - List of available shortcuts
 */
export function useKeyboardShortcuts(videoRef, options = {}) {
  const { enabled = true } = options;
  const [showHelp, setShowHelp] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  /**
   * List of available keyboard shortcuts for display
   */
  const shortcuts = [
    { key: 'Space / K', action: 'Play / Pause' },
    { key: '←', action: 'Seek backward 10s' },
    { key: '→', action: 'Seek forward 10s' },
    { key: 'J', action: 'Seek backward 10s' },
    { key: 'L', action: 'Seek forward 10s' },
    { key: 'F', action: 'Toggle fullscreen' },
    { key: '?', action: 'Show shortcuts help' },
    { key: 'Esc', action: 'Close help / Exit fullscreen' },
  ];

  /**
   * Toggle play/pause state
   */
  const togglePlayPause = useCallback(() => {
    if (!videoRef?.current) return;

    if (isPlaying) {
      videoRef.current.pauseVideo();
      setIsPlaying(false);
    } else {
      videoRef.current.playVideo();
      setIsPlaying(true);
    }
  }, [videoRef, isPlaying]);

  /**
   * Seek video by specified amount
   *
   * @param {number} amount - Seconds to seek (negative for backward)
   */
  const seekBy = useCallback((amount) => {
    if (!videoRef?.current) return;

    const currentTime = videoRef.current.getCurrentTime() || 0;
    const newTime = Math.max(0, currentTime + amount);
    videoRef.current.seekTo(newTime);
  }, [videoRef]);

  /**
   * Toggle fullscreen mode
   */
  const toggleFullscreen = useCallback(() => {
    const videoContainer = document.querySelector('.video-container');
    if (!videoContainer) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      videoContainer.requestFullscreen();
    }
  }, []);

  /**
   * Handle keyboard events
   */
  const handleKeyDown = useCallback((event) => {
    // Skip if shortcuts are disabled
    if (!enabled) return;

    // Skip if user is typing in an input field
    if (isInputElement(event.target)) return;

    // Get the key pressed
    const key = event.key.toLowerCase();

    switch (key) {
      case ' ':
      case 'k':
        event.preventDefault();
        togglePlayPause();
        break;

      case 'arrowleft':
      case 'j':
        event.preventDefault();
        seekBy(-SEEK_AMOUNT);
        break;

      case 'arrowright':
      case 'l':
        event.preventDefault();
        seekBy(SEEK_AMOUNT);
        break;

      case 'f':
        event.preventDefault();
        toggleFullscreen();
        break;

      case '?':
        event.preventDefault();
        setShowHelp((prev) => !prev);
        break;

      case 'escape':
        if (showHelp) {
          event.preventDefault();
          setShowHelp(false);
        }
        break;

      default:
        // No action for other keys
        break;
    }
  }, [enabled, togglePlayPause, seekBy, toggleFullscreen, showHelp]);

  /**
   * Set up keyboard event listener
   */
  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleKeyDown]);

  return {
    showHelp,
    setShowHelp,
    shortcuts,
    isPlaying,
    setIsPlaying,
  };
}

export default useKeyboardShortcuts;

