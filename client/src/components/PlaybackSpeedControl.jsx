/**
 * Playback Speed Control Component
 *
 * Provides a dropdown control for adjusting video playback speed.
 * Persists user preference in localStorage for consistent experience.
 *
 * @module PlaybackSpeedControl
 *
 * @example
 * <PlaybackSpeedControl
 *   videoRef={videoRef}
 *   onSpeedChange={(speed) => console.log('Speed:', speed)}
 * />
 */

import { useState, useEffect, useCallback } from 'react';
import './PlaybackSpeedControl.css';

/**
 * Available playback speeds
 * @constant {Array<{value: number, label: string}>}
 */
const PLAYBACK_SPEEDS = [
  { value: 0.25, label: '0.25x' },
  { value: 0.5, label: '0.5x' },
  { value: 0.75, label: '0.75x' },
  { value: 1, label: '1x (Normal)' },
  { value: 1.25, label: '1.25x' },
  { value: 1.5, label: '1.5x' },
  { value: 1.75, label: '1.75x' },
  { value: 2, label: '2x' },
];

/**
 * localStorage key for persisting playback speed
 * @constant {string}
 */
const STORAGE_KEY = 'learnflow_playback_speed';

/**
 * Default playback speed
 * @constant {number}
 */
const DEFAULT_SPEED = 1;

/**
 * PlaybackSpeedControl Component
 *
 * Dropdown selector for video playback speed. Integrates with
 * YouTube iframe API to control playback rate.
 *
 * @param {Object} props - Component props
 * @param {React.RefObject} props.videoRef - Ref to VideoPlayer component
 * @param {Function} [props.onSpeedChange] - Callback when speed changes
 * @param {string} [props.className] - Additional CSS classes
 * @returns {React.ReactElement} Playback speed dropdown control
 */
export default function PlaybackSpeedControl({ videoRef, onSpeedChange, className = '' }) {
  const [speed, setSpeed] = useState(DEFAULT_SPEED);
  const [isOpen, setIsOpen] = useState(false);

  /**
   * Load saved speed preference from localStorage
   */
  useEffect(() => {
    try {
      const savedSpeed = localStorage.getItem(STORAGE_KEY);
      if (savedSpeed) {
        const parsedSpeed = parseFloat(savedSpeed);
        if (PLAYBACK_SPEEDS.some(s => s.value === parsedSpeed)) {
          setSpeed(parsedSpeed);
        }
      }
    } catch (err) {
      console.warn('Could not load playback speed preference:', err);
    }
  }, []);

  /**
   * Apply speed to video player when speed or player changes
   */
  useEffect(() => {
    if (videoRef?.current?.setPlaybackRate) {
      videoRef.current.setPlaybackRate(speed);
    }
  }, [speed, videoRef]);

  /**
   * Handle speed selection
   *
   * Updates local state, persists to localStorage, applies to video,
   * and triggers callback.
   *
   * @param {number} newSpeed - Selected playback speed
   */
  const handleSpeedChange = useCallback((newSpeed) => {
    setSpeed(newSpeed);
    setIsOpen(false);

    // Persist preference
    try {
      localStorage.setItem(STORAGE_KEY, newSpeed.toString());
    } catch (err) {
      console.warn('Could not save playback speed preference:', err);
    }

    // Apply to video player
    if (videoRef?.current?.setPlaybackRate) {
      videoRef.current.setPlaybackRate(newSpeed);
    }

    // Trigger callback
    if (onSpeedChange) {
      onSpeedChange(newSpeed);
    }
  }, [videoRef, onSpeedChange]);

  /**
   * Toggle dropdown open/closed
   */
  const toggleDropdown = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  /**
   * Close dropdown when clicking outside
   */
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.playback-speed-control')) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isOpen]);

  /**
   * Handle keyboard navigation in dropdown
   */
  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleDropdown();
    }
  }, [toggleDropdown]);

  /**
   * Get display label for current speed
   */
  const getCurrentLabel = () => {
    const current = PLAYBACK_SPEEDS.find(s => s.value === speed);
    return current ? (speed === 1 ? '1x' : current.label.replace(' (Normal)', '')) : '1x';
  };

  return (
    <div className={`playback-speed-control ${className}`}>
      <button
        className="speed-button"
        onClick={toggleDropdown}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Playback speed: ${getCurrentLabel()}`}
        title="Change playback speed"
      >
        <svg
          className="speed-icon"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
        <span className="speed-value">{getCurrentLabel()}</span>
        <svg
          className={`speed-chevron ${isOpen ? 'open' : ''}`}
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <ul
          className="speed-dropdown"
          role="listbox"
          aria-label="Playback speed options"
        >
          {PLAYBACK_SPEEDS.map((option) => (
            <li
              key={option.value}
              role="option"
              aria-selected={speed === option.value}
              className={`speed-option ${speed === option.value ? 'selected' : ''}`}
              onClick={() => handleSpeedChange(option.value)}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSpeedChange(option.value);
                }
              }}
            >
              {speed === option.value && (
                <svg
                  className="check-icon"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
              <span className="option-label">{option.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Export available speeds for use in tests or other components
 */
export { PLAYBACK_SPEEDS, STORAGE_KEY, DEFAULT_SPEED };

