/**
 * Learning Report Service
 * Handles API calls to fetch user learning statistics and reports
 */

import api from './api';

/**
 * Get comprehensive learning report for the current user
 * @param {string} firebaseUid - Firebase user ID
 * @returns {Promise<Object>} Learning report data with statistics
 */
const getLearningReport = async (firebaseUid) => {
  if (!firebaseUid) {
    throw new Error('Firebase UID is required');
  }

  try {
    const response = await api.get(`/api/learning-report/users/${firebaseUid}`);
    
    // Handle successful response
    if (response && response.data) {
      return response.data.data || response.data;
    }
    
    throw new Error('Invalid response format from server');
  } catch (error) {
    console.error('Error fetching learning report:', error);
    
    // Provide user-friendly error messages
    if (error.response) {
      if (error.response.status === 401) {
        throw new Error('Authentication failed. Please login again.');
      } else if (error.response.status === 403) {
        throw new Error('You do not have permission to view this report.');
      } else if (error.response.status === 404) {
        throw new Error('User record not found. Please ensure you are logged in.');
      } else if (error.response.status >= 500) {
        throw new Error('Server error. Please try again later.');
      }
    } else if (error.request) {
      throw new Error('Network error. Please check your connection and try again.');
    }
    
    throw new Error(error.message || 'Failed to fetch learning report');
  }
};

const learningReportService = {
  getLearningReport,
};

export default learningReportService;
