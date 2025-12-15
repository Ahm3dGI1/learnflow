/**
 * Toast Notification Hook for LearnFlow
 *
 * Provides a simple toast notification system for showing
 * error messages, warnings, and success messages to users.
 *
 * Usage:
 *   const toast = useToast();
 *   toast.error("Something went wrong");
 *   toast.success("Operation completed");
 *   toast.warning("Please check your input");
 *   toast.info("FYI: This is informational");
 */

import { useState, useCallback, useEffect } from 'react';
import errorService from '../services/errorService';

// Toast auto-dismiss duration (milliseconds)
const TOAST_DURATION = 5000;

export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  /**
   * Dismiss a specific toast
   * @param {number} id - Toast ID
   */
  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  /**
   * Show a toast notification
   * @param {string} message - Message to display
   * @param {string} type - Toast type ('error', 'warning', 'info', 'success')
   * @param {number} duration - Auto-dismiss duration in ms (0 = no auto-dismiss)
   */
  const show = useCallback((message, type = 'info', duration = TOAST_DURATION) => {
    const id = Date.now() + Math.random();
    const toast = { id, message, type, duration };

    setToasts((prev) => [...prev, toast]);

    // Auto-dismiss after duration
    if (duration > 0) {
      setTimeout(() => {
        // Use setToasts directly to avoid dependency on dismiss
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }

    return id;
  }, []);

  // Register toast callback with error service
  useEffect(() => {
    const showToast = (message, severity) => {
      show(message, severity);
    };
    errorService.setToastCallback(showToast);

    return () => {
      errorService.setToastCallback(null);
    };
  }, [show]);

  /**
   * Clear all toasts
   */
  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  /**
   * Show error toast
   * @param {string} message - Error message
   * @param {number} duration - Auto-dismiss duration
   */
  const error = useCallback((message, duration = TOAST_DURATION) => {
    return show(message, 'error', duration);
  }, [show]);

  /**
   * Show warning toast
   * @param {string} message - Warning message
   * @param {number} duration - Auto-dismiss duration
   */
  const warning = useCallback((message, duration = TOAST_DURATION) => {
    return show(message, 'warning', duration);
  }, [show]);

  /**
   * Show info toast
   * @param {string} message - Info message
   * @param {number} duration - Auto-dismiss duration
   */
  const info = useCallback((message, duration = TOAST_DURATION) => {
    return show(message, 'info', duration);
  }, [show]);

  /**
   * Show success toast
   * @param {string} message - Success message
   * @param {number} duration - Auto-dismiss duration
   */
  const success = useCallback((message, duration = TOAST_DURATION) => {
    return show(message, 'success', duration);
  }, [show]);

  return {
    toasts,
    show,
    dismiss,
    clearAll,
    error,
    warning,
    info,
    success
  };
};

export default useToast;
