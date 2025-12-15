/**
 * Error Service for LearnFlow Frontend
 *
 * Provides centralized error handling with:
 * - Error categorization (network, validation, server, unexpected)
 * - User-friendly error messages
 * - Console logging with context
 * - Toast notification integration
 */

/**
 * Error categories for classification
 */
export const ErrorCategory = {
  NETWORK: 'NETWORK',           // Network/connection errors
  VALIDATION: 'VALIDATION',     // Client-side validation errors
  SERVER: 'SERVER',             // Server errors (4xx, 5xx)
  AUTH: 'AUTH',                 // Authentication/authorization errors
  NOT_FOUND: 'NOT_FOUND',       // Resource not found (404)
  UNEXPECTED: 'UNEXPECTED'      // Unexpected errors
};

/**
 * Error severity levels
 */
export const ErrorSeverity = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical'
};

class ErrorService {
  constructor() {
    // Optional: Toast notification callback (set by useToast hook)
    this.toastCallback = null;
  }

  /**
   * Set toast notification callback
   * @param {Function} callback - Function to call for toast notifications
   */
  setToastCallback(callback) {
    this.toastCallback = callback;
  }

  /**
   * Categorize an error based on its properties
   * @param {Error|Object} error - Error object
   * @returns {string} Error category
   */
  categorizeError(error) {
    // Network errors
    if (error.message === 'Network Error' || error.code === 'ECONNABORTED') {
      return ErrorCategory.NETWORK;
    }

    // Check for status code
    if (error.status || error.response?.status) {
      const status = error.status || error.response.status;

      if (status === 401 || status === 403) {
        return ErrorCategory.AUTH;
      }

      if (status === 404) {
        return ErrorCategory.NOT_FOUND;
      }

      if (status >= 400 && status < 500) {
        return ErrorCategory.VALIDATION;
      }

      if (status >= 500) {
        return ErrorCategory.SERVER;
      }
    }

    return ErrorCategory.UNEXPECTED;
  }

  /**
   * Get severity level based on error category
   * @param {string} category - Error category
   * @returns {string} Severity level
   */
  getSeverity(category) {
    switch (category) {
      case ErrorCategory.NETWORK:
        return ErrorSeverity.WARNING;
      case ErrorCategory.VALIDATION:
        return ErrorSeverity.INFO;
      case ErrorCategory.AUTH:
        return ErrorSeverity.ERROR;
      case ErrorCategory.NOT_FOUND:
        return ErrorSeverity.INFO;
      case ErrorCategory.SERVER:
        return ErrorSeverity.ERROR;
      case ErrorCategory.UNEXPECTED:
        return ErrorSeverity.CRITICAL;
      default:
        return ErrorSeverity.ERROR;
    }
  }

  /**
   * Extract user-friendly error message from error object
   * @param {Error|Object} error - Error object
   * @param {string} context - Context where error occurred
   * @returns {string} User-friendly error message
   */
  getUserMessage(error, context) {
    // Check for backend error message
    if (error.response?.data?.error) {
      return error.response.data.error;
    }

    if (error.error) {
      return error.error;
    }

    if (error.message) {
      // Don't show technical error messages to users
      if (error.message.includes('fetch') || error.message.includes('Failed to')) {
        return this.getDefaultMessage(this.categorizeError(error), context);
      }
      return error.message;
    }

    return this.getDefaultMessage(this.categorizeError(error), context);
  }

  /**
   * Get default error message based on category and context
   * @param {string} category - Error category
   * @param {string} context - Context where error occurred
   * @returns {string} Default error message
   */
  getDefaultMessage(category, context) {
    const contextStr = context ? ` while ${context}` : '';

    switch (category) {
      case ErrorCategory.NETWORK:
        return `Network connection error${contextStr}. Please check your internet connection and try again.`;
      case ErrorCategory.VALIDATION:
        return `Invalid data${contextStr}. Please check your input and try again.`;
      case ErrorCategory.AUTH:
        return `Authentication failed${contextStr}. Please log in again.`;
      case ErrorCategory.NOT_FOUND:
        return `Resource not found${contextStr}.`;
      case ErrorCategory.SERVER:
        return `Server error${contextStr}. Please try again later.`;
      case ErrorCategory.UNEXPECTED:
        return `An unexpected error occurred${contextStr}. Please try again.`;
      default:
        return `An error occurred${contextStr}. Please try again.`;
    }
  }

  /**
   * Log error to console with context
   * @param {Error|Object} error - Error object
   * @param {Object} options - Logging options
   */
  logError(error, options = {}) {
    const {
      context = '',
      category = this.categorizeError(error),
      severity = this.getSeverity(category),
      metadata = {}
    } = options;

    const logData = {
      category,
      severity,
      context,
      message: error.message || error.error || 'Unknown error',
      ...metadata
    };

    // Include error code if available
    if (error.code || error.response?.data?.code) {
      logData.errorCode = error.code || error.response.data.code;
    }

    // Include status code if available
    if (error.status || error.response?.status) {
      logData.statusCode = error.status || error.response.status;
    }

    // Include backend details in development mode
    if (process.env.NODE_ENV === 'development' && error.response?.data?.details) {
      logData.details = error.response.data.details;
    }

    // Log with appropriate console method
    const consoleMethod = severity === ErrorSeverity.CRITICAL ? 'error' :
                         severity === ErrorSeverity.ERROR ? 'error' :
                         severity === ErrorSeverity.WARNING ? 'warn' :
                         'info';

    console[consoleMethod](`[${category}] ${context || 'Error'}:`, logData);

    // Include stack trace for unexpected errors
    if (category === ErrorCategory.UNEXPECTED && error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }

  /**
   * Show error notification to user (if toast callback is set)
   * @param {string} message - Error message
   * @param {string} severity - Error severity
   */
  notify(message, severity = ErrorSeverity.ERROR) {
    if (this.toastCallback) {
      this.toastCallback(message, severity);
    }
  }

  /**
   * Handle error with logging and optional user notification
   * @param {Error|Object} error - Error object
   * @param {Object} options - Handling options
   * @returns {Object} Processed error information
   */
  handleError(error, options = {}) {
    const {
      context = '',
      showToast = false,
      metadata = {},
      customMessage = null
    } = options;

    const category = this.categorizeError(error);
    const severity = this.getSeverity(category);
    const userMessage = customMessage || this.getUserMessage(error, context);

    // Log the error
    this.logError(error, {
      context,
      category,
      severity,
      metadata
    });

    // Show toast notification if requested
    if (showToast) {
      this.notify(userMessage, severity);
    }

    return {
      category,
      severity,
      message: userMessage,
      code: error.code || error.response?.data?.code,
      status: error.status || error.response?.status
    };
  }

  /**
   * Handle API error specifically
   * @param {Object} error - API error object
   * @param {Object} options - Handling options
   * @returns {Object} Processed error information
   */
  handleAPIError(error, options = {}) {
    return this.handleError(error, {
      ...options,
      metadata: {
        url: error.config?.url,
        method: error.config?.method,
        ...options.metadata
      }
    });
  }

  /**
   * Create error handler for React components
   * @param {string} context - Context description
   * @param {Object} options - Handler options
   * @returns {Function} Error handler function
   */
  createHandler(context, options = {}) {
    return (error) => this.handleError(error, { context, ...options });
  }
}

// Create singleton instance
const errorService = new ErrorService();

export default errorService;