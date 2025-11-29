/**
 * Progress tracking service for video watch progress.
 * Handles API calls for saving and retrieving user video progress.
 */

import api from './api';

const progressService = {
  /**
   * Update video watch progress for a user
   * @param {number} userId - User database ID
   * @param {number} videoId - Video database ID
   * @param {number} positionSeconds - Current playback position in seconds
   * @returns {Promise<object>} Updated progress data
   * @example
   * const progress = await progressService.updateProgress(1, 2, 123);
   * // Returns: { userId: 1, videoId: 2, lastPositionSeconds: 123, isCompleted: false, ... }
   */
  updateProgress: async (userId, videoId, positionSeconds) => {
    try {
      const response = await api.post(
        `/api/progress/users/${userId}/videos/${videoId}`,
        { positionSeconds },
        {},
        true // Requires auth
      );
      return response;
    } catch (error) {
      console.error('Error updating progress:', error);
      throw error;
    }
  },

  /**
   * Get video watch progress for a user
   * @param {number} userId - User database ID
   * @param {number} videoId - Video database ID
   * @returns {Promise<object|null>} Progress data or null if no progress exists
   * @example
   * const progress = await progressService.getProgress(1, 2);
   * // Returns: { videoId: 2, lastPositionSeconds: 123, progressPercentage: 45.5, ... }
   */
  getProgress: async (userId, videoId) => {
    try {
      const response = await api.get(
        `/api/progress/users/${userId}/videos/${videoId}`,
        {},
        true // Requires auth
      );
      return response;
    } catch (error) {
      console.error('Error getting progress:', error);
      throw error;
    }
  },

  /**
   * Mark a video as completed
   * @param {number} userId - User database ID
   * @param {number} videoId - Video database ID
   * @returns {Promise<object>} Updated progress data with isCompleted=true
   */
  markComplete: async (userId, videoId) => {
    try {
      const response = await api.put(
        `/api/progress/users/${userId}/videos/${videoId}/complete`,
        {},
        {},
        true // Requires auth
      );
      return response;
    } catch (error) {
      console.error('Error marking complete:', error);
      throw error;
    }
  },

  /**
   * Get all video progress for a user
   * @param {number} userId - User database ID
   * @returns {Promise<object>} All progress records
   * @example
   * const data = await progressService.getAllProgress(1);
   * // Returns: { userId: 1, progress: [...], totalVideos: 5 }
   */
  getAllProgress: async (userId) => {
    try {
      const response = await api.get(
        `/api/progress/users/${userId}`,
        {},
        true // Requires auth
      );
      return response;
    } catch (error) {
      console.error('Error getting all progress:', error);
      throw error;
    }
  },
};

export default progressService;
