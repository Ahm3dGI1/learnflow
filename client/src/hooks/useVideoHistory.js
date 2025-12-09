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
 * Manages video watch history with automatic localStorage persistence per user.
 * Loads history on mount, saves changes automatically, and provides CRUD operations.
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
   * and updates local state optimistically.
   * 
   * @param {Object} videoData - Video information to add
   * @param {string} videoData.videoId - YouTube video ID
   * @param {string} [videoData.title] - Video title (optional, for display)
   * @param {number} [videoData.lastPositionSeconds=0] - Current playback position
   * @param {boolean} [videoData.isCompleted=false] - Whether video is fully watched
   */
  const addToHistory = async (videoData) => {
    if (!user) return;

    try {
      // Save to backend
      const result = await videoService.saveToHistory(user.uid, {
        videoId: videoData.videoId,
        lastPositionSeconds: videoData.lastPositionSeconds || 0,
        isCompleted: videoData.isCompleted || false
      });

      // Update local state with backend response
      setHistory(prev => {
        const existingIndex = prev.findIndex(item => item.videoId === videoData.videoId);
        const existingVideo = existingIndex !== -1 ? prev[existingIndex] : null;

        const updatedEntry = {
          videoId: videoData.videoId,
          title: videoData.title || existingVideo?.title || 'Untitled Video',
          thumbnailUrl: videoData.thumbnailUrl || existingVideo?.thumbnailUrl || `https://img.youtube.com/vi/${videoData.videoId}/mqdefault.jpg`,
          lastPositionSeconds: result.lastPositionSeconds,
          lastWatchedAt: result.lastWatchedAt,
          isCompleted: result.isCompleted,
          watchCount: result.watchCount // Use backend value directly
        };

        if (existingIndex !== -1) {
          const updated = [...prev];
          updated[existingIndex] = updatedEntry;
          const [item] = updated.splice(existingIndex, 1);
          return [item, ...updated];
        }

        return [updatedEntry, ...prev];
      });
    } catch (error) {
      console.error('Failed to add video to history:', error);
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
