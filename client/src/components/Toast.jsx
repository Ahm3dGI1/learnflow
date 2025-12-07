/**
 * Toast Notification Component
 *
 * Displays a temporary notification message that automatically
 * dismisses after a specified duration. Supports success, error,
 * and info variants.
 *
 * @module Toast
 *
 * @example
 * <Toast
 *   message="Action completed successfully!"
 *   type="success"
 *   isVisible={showToast}
 *   onClose={() => setShowToast(false)}
 * />
 */

import { useEffect, useCallback } from 'react';
import './Toast.css';

/**
 * Toast Component
 *
 * @param {Object} props - Component props
 * @param {string} props.message - Toast message to display
 * @param {string} [props.type='info'] - Toast type: 'success', 'error', 'info'
 * @param {boolean} props.isVisible - Whether the toast is visible
 * @param {Function} props.onClose - Callback when toast should close
 * @param {number} [props.duration=3000] - Auto-dismiss duration in milliseconds
 * @returns {React.ReactElement|null} Toast notification or null if not visible
 */
export default function Toast({
  message,
  type = 'info',
  isVisible,
  onClose,
  duration = 3000,
}) {
  /**
   * Auto-dismiss timer
   *
   * Automatically closes the toast after the specified duration.
   */
  useEffect(() => {
    if (!isVisible || duration <= 0) return;

    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [isVisible, duration, onClose]);

  /**
   * Handle close button click
   */
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  /**
   * Get icon based on toast type
   *
   * @returns {string} Emoji icon for the toast type
   */
  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'info':
      default:
        return 'ℹ';
    }
  };

  if (!isVisible) return null;

  return (
    <div
      className={`toast toast-${type} ${isVisible ? 'toast-visible' : ''}`}
      role="alert"
      aria-live="polite"
    >
      <span className="toast-icon" aria-hidden="true">
        {getIcon()}
      </span>
      <span className="toast-message">{message}</span>
      <button
        className="toast-close"
        onClick={handleClose}
        aria-label="Dismiss notification"
      >
        ✕
      </button>
    </div>
  );
}

