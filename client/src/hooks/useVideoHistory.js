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
 * Manages video watch history with backend API persistence and pagination.
 * Loads initial batch on mount, syncs changes with server, and provides pagination control.
 * Supports incremental loading with "Load More" functionality.
 * 
 * @returns {Object} History management interface
 * @property {Array<Object>} history - Array of video history entries (paginated)
 * @property {boolean} loading - Loading state for current fetch
 * @property {boolean} hasMore - Whether more videos are available to load
 * @property {Function} addToHistory - Add or update a video in history
 * @property {Function} removeFromHistory - Remove a video by ID
 * @property {Function} clearHistory - Clear all history for current user
 * @property {Function} getVideoById - Retrieve a specific video by YouTube ID
 * @property {Function} loadMore - Load next batch of videos
 * @property {Function} refreshHistory - Reload history from server
 * 
 * @example
 * const { history, loadMore, hasMore } = useVideoHistory();
 * 
 * // Display videos and load more button
 * {hasMore && <button onClick={loadMore}>Load More</button>}
 */
export function useVideoHistory() {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // Load history from server on mount
  useEffect(() => {
    const loadHistory = async () => {
      if (!user) {
        setHistory([]);
        setOffset(0);
        setHasMore(false);
        return;
      }

      setLoading(true);
      try {
        const result = await videoService.getVideoHistory(user.uid, 20, 0);
        setHistory(result.data || []);
        setTotalCount(result.pagination.total);
        setHasMore(result.pagination.hasMore);
        setOffset(0);
      } catch (error) {
        console.error('Failed to load video history:', error);
        setHistory([]);
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [user]);

  /**
   * Load More Videos
   * 
   * Fetches the next batch of videos based on current offset.
   * Appends to existing history without replacing it.
   */
  const loadMore = async () => {
    if (!user || loading || !hasMore) return;

    setLoading(true);
    try {
      const newOffset = offset + 20;
      const result = await videoService.getVideoHistory(user.uid, 20, newOffset);
      setHistory(prev => [...prev, ...result.data]);
      setOffset(newOffset);
      setHasMore(result.pagination.hasMore);
    } catch (error) {
      console.error('Failed to load more videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshHistory = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const result = await videoService.getVideoHistory(user.uid, 20, 0);
      // Reset pagination when refreshing
      setHistory(result.data || []);
      setOffset(0);
      setTotalCount(result.pagination.total);
      setHasMore(result.pagination.hasMore);
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

    // Store previous state for rollback
    const previousHistory = [...history];

    // Optimistically update UI
    setHistory(prev => {
      const existingIndex = prev.findIndex(item => item.videoId === videoData.videoId);
      const existingVideo = existingIndex !== -1 ? prev[existingIndex] : null;

      const updatedEntry = {
        videoId: videoData.videoId,
        title: videoData.title || existingVideo?.title || 'Untitled Video',
        thumbnailUrl: videoData.thumbnailUrl || existingVideo?.thumbnailUrl || (videoData.videoId ? videoService.getThumbnailUrl(videoData.videoId) : null),
        lastPositionSeconds: videoData.lastPositionSeconds || 0,
        lastWatchedAt: new Date().toISOString(),
        isCompleted: videoData.isCompleted || false,
        watchCount: existingVideo?.watchCount || 0
      };

      if (existingIndex !== -1) {
        const updated = [...prev];
        updated[existingIndex] = updatedEntry;
        const [item] = updated.splice(existingIndex, 1);
        return [item, ...updated];
      }

      return [updatedEntry, ...prev];
    });

    try {
      // Save to backend
      const result = await videoService.saveToHistory(user.uid, {
        videoId: videoData.videoId,
        lastPositionSeconds: videoData.lastPositionSeconds || 0,
        isCompleted: videoData.isCompleted || false
      });

      // Update with accurate backend data
      setHistory(prev => {
        const existingIndex = prev.findIndex(item => item.videoId === videoData.videoId);
        if (existingIndex === -1) return prev;

        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          lastPositionSeconds: result.lastPositionSeconds,
          lastWatchedAt: result.lastWatchedAt,
          isCompleted: result.isCompleted,
          watchCount: result.watchCount
        };
        return updated;
      });
    } catch (error) {
      console.error('Failed to add video to history:', error);
      // Revert to previous state on error
      setHistory(previousHistory);
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
    hasMore,
    totalCount,
    addToHistory,
    removeFromHistory,
    clearHistory,
    getVideoById,
    loadMore,
    refreshHistory,
  };
}
