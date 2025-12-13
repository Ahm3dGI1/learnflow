/**
 * Video History Management Hook
 * 
 * Custom React hook for managing user video watch history with backend API
 * persistence. Fetches history from server on mount and provides methods for
 * adding, removing, and clearing history entries.
 * 
 * History entries include video metadata, thumbnails, and timestamps for
 * tracking watch history and providing quick access to recently viewed videos.
 * 
 * @module useVideoHistory
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import videoService from '../services/videoService';

/**
 * useVideoHistory Hook
 * 
 * Manages video watch history with backend API persistence.
 * Loads history on mount, syncs changes with server, and provides CRUD operations.
 * Maintains maximum of 50 videos per user and automatically moves recently viewed
 * videos to the top of the list.
 * 
 * @returns {Object} History management interface
 * @property {Array<Object>} history - Array of video history entries
 * @property {Function} addToHistory - Add or update a video in history
 * @property {Function} removeFromHistory - Remove a video by ID
 * @property {Function} clearHistory - Clear all history for current user
 * @property {Function} getVideoById - Retrieve a specific video by YouTube ID
 * 
 * @example
 * const { history, addToHistory, removeFromHistory } = useVideoHistory();
 * 
 * // Add a video to history
 * addToHistory({
 *   videoId: 'dQw4w9WgXcQ',
 *   embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
 *   title: 'Example Video'
 * });
 * 
 * // Remove a video
 * removeFromHistory(videoEntry.id);
 */
export function useVideoHistory() {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load history from server on mount
  useEffect(() => {
    const loadHistory = async () => {
      if (!user) {
        setHistory([]);
        return;
      }

      setLoading(true);
      try {
        const data = await videoService.getVideoHistory(user.uid);
        setHistory(data);
      } catch (error) {
        console.error('Failed to load video history:', error);
        setHistory([]);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [user]);

  const refreshHistory = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const data = await videoService.getVideoHistory(user.uid);
      setHistory(data);
    } catch (error) {
      console.error('Failed to refresh video history:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Add Video to History
   * 
   * Adds a new video to history or updates existing entry. Saves to backend
   * and then updates local state with the authoritative data from server.
   * 
   * @param {Object} videoData - Video information to add
   * @param {string} videoData.videoId - YouTube video ID
   * @param {string} [videoData.title] - Video title (optional)
   * @param {number} [videoData.lastPositionSeconds=0] - Current playback position
   * @param {boolean} [videoData.isCompleted=false] - Whether video is fully watched
   */
  const addToHistory = async (videoData) => {
    if (!user) return;

    try {
      // Save to backend first
      const savedData = await videoService.saveToHistory(user.uid, {
        videoId: videoData.videoId,
        lastPositionSeconds: videoData.lastPositionSeconds || 0,
        isCompleted: videoData.isCompleted || false
      });

      console.log('[useVideoHistory] Backend confirm save:', savedData);

      // Update local state with returned data
      setHistory(prev => {
        const existingIndex = prev.findIndex(item => item.videoId === videoData.videoId);
        const newState = [...prev];

        // Merge backend data with any extra frontend fields we might have (like title/thumbnail if backend didn't return them yet)
        const newEntry = {
          videoId: videoData.videoId,
          // Use title/thumbnail from input if available, otherwise keep existing, or fallback
          title: videoData.title || (existingIndex !== -1 ? prev[existingIndex].title : 'Untitled Video'),
          thumbnailUrl: videoData.thumbnailUrl || (existingIndex !== -1 ? prev[existingIndex].thumbnailUrl : `https://img.youtube.com/vi/${videoData.videoId}/mqdefault.jpg`),
          ...savedData // Overwrite with authoritative backend data
        };

        if (existingIndex !== -1) {
          newState.splice(existingIndex, 1);
        }

        return [newEntry, ...newState];
      });

    } catch (error) {
      console.error('Failed to add video to history:', error);
      // No rollback needed since we didn't optimistically update
      throw error;
    }
  };

  /**
   * Remove Video from History
   * 
   * Removes a video entry from history by its YouTube video ID.
   * Updates backend and local state.
   * 
   * @param {string} videoId - YouTube video ID to remove
   */
  const removeFromHistory = async (videoId) => {
    if (!user) return;

    try {
      await videoService.deleteFromHistory(user.uid, videoId);
      setHistory(prev => prev.filter(item => item.videoId !== videoId));
    } catch (error) {
      console.error('Failed to remove video from history:', error);
      throw error;
    }
  };

  /**
   * Clear All History
   * 
   * Removes all video history entries for the current user from backend
   * and clears local state.
   */
  const clearHistory = async () => {
    if (!user) return;

    try {
      await videoService.clearVideoHistory(user.uid);
      setHistory([]);
    } catch (error) {
      console.error('Failed to clear video history:', error);
      throw error;
    }
  };

  /**
   * Get Video by YouTube ID
   * 
   * Retrieves a specific video history entry by its YouTube video ID.
   * 
   * @param {string} videoId - YouTube video ID to search for
   * @returns {Object|undefined} Video history entry or undefined if not found
   */
  const getVideoById = (videoId) => {
    return history.find(item => item.videoId === videoId);
  };

  return {
    history,
    loading,
    addToHistory,
    removeFromHistory,
    clearHistory,
    getVideoById,
    refreshHistory,
  };
}
