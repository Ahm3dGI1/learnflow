/**
 * Video History Management Hook
 * 
 * Custom React hook for managing user video watch history with database
 * persistence. Automatically syncs history with the backend API and provides
 * methods for adding, removing, and clearing history entries.
 * 
 * History entries include video metadata, thumbnails, and timestamps for
 * tracking watch history and providing quick access to recently viewed videos.
 * 
 * @module useVideoHistory
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import api from '../services/api';

const STORAGE_KEY = 'learnflow_video_history';
const MIGRATION_FLAG_KEY = 'learnflow_video_history_migrated';

/**
 * useVideoHistory Hook
 * 
 * Manages video watch history with automatic database persistence via API.
 * Loads history on mount, syncs changes with backend, and provides CRUD operations.
 * Maintains maximum of 50 videos per user and automatically moves recently viewed
 * videos to the top of the list.
 * 
 * @returns {Object} History management interface
 * @property {Array<Object>} history - Array of video history entries
 * @property {boolean} loading - Whether history is being loaded
 * @property {Error|null} error - Error object if an error occurred
 * @property {Function} addToHistory - Add or update a video in history
 * @property {Function} removeFromHistory - Remove a video by ID
 * @property {Function} clearHistory - Clear all history for current user
 * @property {Function} getVideoById - Retrieve a specific video by YouTube ID
 * 
 * @example
 * const { history, loading, addToHistory, removeFromHistory } = useVideoHistory();
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
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);

  // Get user's database ID from API
  useEffect(() => {
    if (user) {
      const fetchUserId = async () => {
        try {
          const response = await api.get('/api/users/me');
          if (response.data && response.data.id) {
            setUserId(response.data.id);
          }
        } catch (err) {
          console.error('Failed to fetch user ID:', err);
          setError(err);
        }
      };
      fetchUserId();
    } else {
      setUserId(null);
      setHistory([]);
    }
  }, [user]);

  // Load history from API
  const loadHistory = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/api/users/${userId}/video-history`);
      if (response.data) {
        setHistory(response.data);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
      setError(err);
      // Fallback to empty array on error
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Load history when userId is available
  useEffect(() => {
    if (userId) {
      loadHistory();
    }
  }, [userId, loadHistory]);

  /**
   * Migrate localStorage data to database
   * This is a one-time migration that runs on login
   */
  const migrateLocalStorageToDatabase = useCallback(async () => {
    if (!user || !userId) return;

    const userKey = `${STORAGE_KEY}_${user.uid}`;
    const migrationKey = `${MIGRATION_FLAG_KEY}_${user.uid}`;

    // Check if already migrated
    if (localStorage.getItem(migrationKey)) {
      return;
    }

    // Get localStorage data
    const saved = localStorage.getItem(userKey);
    if (!saved) {
      // Mark as migrated even if no data exists
      localStorage.setItem(migrationKey, 'true');
      return;
    }

    try {
      const localHistory = JSON.parse(saved);
      if (!Array.isArray(localHistory) || localHistory.length === 0) {
        localStorage.setItem(migrationKey, 'true');
        return;
      }

      // Migrate each entry to database
      for (const entry of localHistory) {
        try {
          await api.post(`/api/users/${userId}/video-history`, {
            videoId: entry.videoId,
            embedUrl: entry.embedUrl,
            title: entry.title || 'Untitled Video',
            thumbnail: entry.thumbnail || `https://img.youtube.com/vi/${entry.videoId}/mqdefault.jpg`,
          });
        } catch (err) {
          console.error('Failed to migrate entry:', entry, err);
          // Continue with other entries even if one fails
        }
      }

      // Mark as migrated
      localStorage.setItem(migrationKey, 'true');
      
      // Optionally clear localStorage after successful migration
      // localStorage.removeItem(userKey);

      // Reload history from database
      await loadHistory();
    } catch (err) {
      console.error('Failed to migrate history:', err);
      // Don't mark as migrated if there was an error, so it can retry
    }
  }, [user, userId, loadHistory]);

  // Run migration when user and userId are available
  useEffect(() => {
    if (user && userId) {
      migrateLocalStorageToDatabase();
    }
  }, [user, userId, migrateLocalStorageToDatabase]);

  /**
   * Add Video to History
   * 
   * Adds a new video to history or updates existing entry. If video already exists,
   * updates the lastViewedAt timestamp. Automatically generates thumbnail URL.
   * 
   * @param {Object} videoData - Video information to add
   * @param {string} videoData.videoId - YouTube video ID
   * @param {string} videoData.embedUrl - YouTube embed URL
   * @param {string} [videoData.title] - Video title (defaults to 'Untitled Video')
   * @param {string} [videoData.thumbnail] - Thumbnail URL (auto-generated if not provided)
   */
  const addToHistory = async (videoData) => {
    if (!user || !userId) return;

    setError(null);
    try {
      const thumbnail = videoData.thumbnail || `https://img.youtube.com/vi/${videoData.videoId}/mqdefault.jpg`;
      
      const response = await api.post(`/api/users/${userId}/video-history`, {
        videoId: videoData.videoId,
        embedUrl: videoData.embedUrl,
        title: videoData.title || 'Untitled Video',
        thumbnail,
      });

      if (response.data) {
        // Update local state - add to front if new, or update existing
        setHistory(prev => {
          const existingIndex = prev.findIndex(item => item.videoId === videoData.videoId);
          if (existingIndex !== -1) {
            // Update existing entry and move to front
            const updated = [...prev];
            const [item] = updated.splice(existingIndex, 1);
            return [response.data, ...updated];
          }
          // Add new entry at the beginning
          return [response.data, ...prev].slice(0, 50);
        });
      }
    } catch (err) {
      console.error('Failed to add video to history:', err);
      setError(err);
      throw err;
    }
  };

  /**
   * Remove Video from History
   * 
   * Removes a video entry from history by its unique ID.
   * 
   * @param {number} id - Unique ID of the history entry to remove
   */
  const removeFromHistory = async (id) => {
    if (!user || !userId) return;

    setError(null);
    try {
      await api.delete(`/api/users/${userId}/video-history/${id}`);
      
      // Update local state
      setHistory(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error('Failed to remove video from history:', err);
      setError(err);
      throw err;
    }
  };

  /**
   * Clear All History
   * 
   * Removes all video history entries for the current user from the database.
   * Requires user to be authenticated.
   */
  const clearHistory = async () => {
    if (!user || !userId) return;

    setError(null);
    try {
      await api.delete(`/api/users/${userId}/video-history`);
      setHistory([]);
    } catch (err) {
      console.error('Failed to clear history:', err);
      setError(err);
      throw err;
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
    error,
    addToHistory,
    removeFromHistory,
    clearHistory,
    getVideoById,
  };
}
