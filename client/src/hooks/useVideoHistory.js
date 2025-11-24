/**
 * Video History Management Hook
 * 
 * Custom React hook for managing user video watch history with localStorage
 * persistence. Automatically syncs history with localStorage per user and
 * provides methods for adding, removing, and clearing history entries.
 * 
 * History entries include video metadata, thumbnails, and timestamps for
 * tracking watch history and providing quick access to recently viewed videos.
 * 
 * @module useVideoHistory
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';

const STORAGE_KEY = 'learnflow_video_history';

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

  // Load history from localStorage on mount
  useEffect(() => {
    if (user) {
      const userKey = `${STORAGE_KEY}_${user.uid}`;
      const saved = localStorage.getItem(userKey);
      if (saved) {
        try {
          setHistory(JSON.parse(saved));
        } catch (e) {
          console.error('Failed to load history:', e);
          setHistory([]);
        }
      }
    }
  }, [user]);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    if (user && history.length > 0) {
      const userKey = `${STORAGE_KEY}_${user.uid}`;
      localStorage.setItem(userKey, JSON.stringify(history));
    }
  }, [history, user]);

  /**
   * Add Video to History
   * 
   * Adds a new video to history or updates existing entry. If video already exists,
   * updates the lastViewedAt timestamp and moves it to the top. Automatically
   * generates thumbnail URL and limits history to 50 most recent videos.
   * 
   * @param {Object} videoData - Video information to add
   * @param {string} videoData.videoId - YouTube video ID
   * @param {string} videoData.embedUrl - YouTube embed URL
   * @param {string} [videoData.title] - Video title (defaults to 'Untitled Video')
   */
  const addToHistory = (videoData) => {
    if (!user) return;

    const newEntry = {
      id: Date.now(),
      videoId: videoData.videoId,
      embedUrl: videoData.embedUrl,
      title: videoData.title || 'Untitled Video',
      thumbnail: `https://img.youtube.com/vi/${videoData.videoId}/mqdefault.jpg`,
      addedAt: new Date().toISOString(),
      lastViewedAt: new Date().toISOString(),
    };

    setHistory(prev => {
      // Check if video already exists
      const existingIndex = prev.findIndex(item => item.videoId === videoData.videoId);

      if (existingIndex !== -1) {
        // Update lastViewedAt and move to top
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          lastViewedAt: new Date().toISOString(),
        };
        // Move to front
        const [item] = updated.splice(existingIndex, 1);
        return [item, ...updated];
      }

      // Add new entry at the beginning
      return [newEntry, ...prev].slice(0, 50); // Keep only last 50 videos
    });
  };

  /**
   * Remove Video from History
   * 
   * Removes a video entry from history by its unique ID. Does not affect
   * localStorage until next save cycle (automatic via useEffect).
   * 
   * @param {number} id - Unique ID of the history entry to remove
   */
  const removeFromHistory = (id) => {
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  /**
   * Clear All History
   * 
   * Removes all video history entries for the current user from both state
   * and localStorage. Requires user to be authenticated.
   */
  const clearHistory = () => {
    if (user) {
      const userKey = `${STORAGE_KEY}_${user.uid}`;
      localStorage.removeItem(userKey);
      setHistory([]);
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
    addToHistory,
    removeFromHistory,
    clearHistory,
    getVideoById,
  };
}
