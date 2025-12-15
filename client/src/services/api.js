/**
 * Centralized API client for LearnFlow backend communication.
 * Handles authentication, request/response interceptors, and error handling.
 */

import { auth } from '../firebase';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

/**
 * Custom error class for API errors
 */
class ApiError extends Error {
  constructor(message, status, code, details, response = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.response = response ? { data: response } : null;
    this.error = message; // For compatibility with errorService
  }
}

/**
 * Get the current user's Firebase auth token
 * @returns {Promise<string|null>} The ID token or null if not authenticated
 */
async function getAuthToken() {
  try {
    const user = auth.currentUser;
    if (!user) {
      return null;
    }
    return await user.getIdToken();
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
}

/**
 * Make an HTTP request to the API
 * @param {string} endpoint - API endpoint (without base URL)
 * @param {object} options - Fetch options
 * @param {boolean} requireAuth - Whether authentication is required (default: true)
 * @returns {Promise<any>} Response data
 */
async function request(endpoint, options = {}, requireAuth = true) {
  const url = `${API_BASE_URL}${endpoint}`;

  // Get auth token if required
  let token = null;
  if (requireAuth) {
    token = await getAuthToken();
    if (!token) {
      throw new ApiError('Authentication required', 401, 'UNAUTHORIZED', 'No auth token available');
    }
  }

  // Build headers
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Make request
  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Parse response body
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    // Handle non-2xx responses
    if (!response.ok) {
      throw new ApiError(
        data.error || data.message || 'Request failed',
        response.status,
        data.code || 'UNKNOWN_ERROR',
        data.details || null,
        data  // Include full response data
      );
    }

    return data;
  } catch (error) {
    // Network error or fetch error
    if (error instanceof ApiError) {
      throw error;
    }

    // Network error
    throw new ApiError(
      'Network error. Please check your connection.',
      0,
      'NETWORK_ERROR',
      error.message
    );
  }
}

/**
 * Retry a request with exponential backoff
 * @param {Function} requestFn - Function that returns a promise
 * @param {number} maxRetries - Maximum number of retries (default: 3)
 * @param {number} delay - Initial delay in ms (default: 1000)
 * @returns {Promise<any>} Response data
 */
async function retryRequest(requestFn, maxRetries = 3, delay = 1000) {
  let lastError;

  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;

      // Retry on 429 (Too Many Requests) with exponential backoff
      // Don't retry on other client errors (4xx, except 429)
      if (error.status >= 400 && error.status < 500 && error.status !== 429) {
        throw error;
      }

      // Don't retry on last attempt
      if (i === maxRetries) {
        throw error;
      }

      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }

  throw lastError;
}

/**
 * API client methods
 */
const api = {
  /**
   * Make a GET request
   * @param {string} endpoint - API endpoint
   * @param {object} options - Additional options
   * @param {boolean} requireAuth - Whether auth is required (default: true)
   * @returns {Promise<any>} Response data
   */
  get: (endpoint, options = {}, requireAuth = true) => {
    return request(endpoint, { method: 'GET', ...options }, requireAuth);
  },

  /**
   * Make a POST request
   * @param {string} endpoint - API endpoint
   * @param {object} body - Request body
   * @param {object} options - Additional options
   * @param {boolean} requireAuth - Whether auth is required (default: true)
   * @returns {Promise<any>} Response data
   */
  post: (endpoint, body = {}, options = {}, requireAuth = true) => {
    return request(
      endpoint,
      {
        method: 'POST',
        body: JSON.stringify(body),
        ...options,
      },
      requireAuth
    );
  },

  /**
   * Make a PUT request
   * @param {string} endpoint - API endpoint
   * @param {object} body - Request body
   * @param {object} options - Additional options
   * @param {boolean} requireAuth - Whether auth is required (default: true)
   * @returns {Promise<any>} Response data
   */
  put: (endpoint, body = {}, options = {}, requireAuth = true) => {
    return request(
      endpoint,
      {
        method: 'PUT',
        body: JSON.stringify(body),
        ...options,
      },
      requireAuth
    );
  },

  /**
   * Make a DELETE request
   * @param {string} endpoint - API endpoint
   * @param {object} options - Additional options
   * @param {boolean} requireAuth - Whether auth is required (default: true)
   * @returns {Promise<any>} Response data
   */
  delete: (endpoint, options = {}, requireAuth = true) => {
    return request(endpoint, { method: 'DELETE', ...options }, requireAuth);
  },

  /**
   * Make a request with retry logic
   * @param {Function} requestFn - Function that returns a promise
   * @param {number} maxRetries - Maximum retries
   * @returns {Promise<any>} Response data
   */
  retry: retryRequest,

  /**
   * Health check endpoint (no auth required)
   * @returns {Promise<object>} Health status
   */
  healthCheck: () => {
    return api.get('/', {}, false);
  },

  /**
   * Get authentication token from Firebase
   * Exposed for use in custom fetch calls (e.g., streaming endpoints)
   * @returns {Promise<string|null>} Auth token or null if not authenticated
   */
  getAuthToken,
};

export default api;
export { ApiError };
