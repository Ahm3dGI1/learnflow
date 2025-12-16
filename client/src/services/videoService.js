/**
 * Video service for fetching transcripts and video metadata.
 * Handles all video-related API calls to the backend.
 */

import api from './api';

const videoService = {
  /**
   * Fetch transcript for a YouTube video
   * @param {string} videoId - YouTube video ID or URL
   * @param {string[]} languageCodes - Optional array of preferred language codes
   * @returns {Promise<object>} Transcript data with snippets, language info, and duration
   * @example
   * const transcript = await videoService.fetchTranscript('dQw4w9WgXcQ', ['en']);
   * // Returns: { videoId, snippets, language, languageCode, isGenerated, fetchedAt, durationSeconds }
   */
  fetchTranscript: async (videoId, languageCodes = null) => {
    try {
      const body = { videoId };
      if (languageCodes && languageCodes.length > 0) {
        body.languageCodes = languageCodes;
      }

      const response = await api.post('/api/videos/transcript', body, {}, false);
      return response;
    } catch (error) {
      console.error('Error fetching transcript:', error);
      throw error;
    }
  },

  /**
   * List all available transcripts for a video
   * @param {string} videoId - YouTube video ID or URL
   * @returns {Promise<object>} Available transcripts with language info
   * @example
   * const available = await videoService.listAvailableTranscripts('dQw4w9WgXcQ');
   * // Returns: { videoId, transcripts: [{ languageCode, language, isGenerated, isTranslatable }] }
   */
  listAvailableTranscripts: async (videoId) => {
    try {
      const response = await api.post('/api/videos/transcript/available', { videoId }, {}, false);
      return response;
    } catch (error) {
      console.error('Error listing available transcripts:', error);
      throw error;
    }
  },

  /**
   * Extract YouTube video ID from various URL formats
   * @param {string} url - YouTube URL or video ID
   * @returns {Promise<object>} Extracted video ID
   * @example
   * const result = await videoService.extractVideoId('https://www.youtube.com/watch?v=abc123');
   * // Returns: { videoId: 'abc123', url: 'https://www.youtube.com/watch?v=abc123' }
   */
  extractVideoId: async (url) => {
    try {
      const response = await api.post('/api/videos/extract-id', { url }, {}, false);
      return response;
    } catch (error) {
      console.error('Error extracting video ID:', error);
      throw error;
    }
  },

  /**
   * Get video metadata and transcript in one call
   * Convenience method that extracts ID and fetches transcript
   * @param {string} urlOrId - YouTube URL or video ID
   * @param {string[]} languageCodes - Optional language preferences
   * @returns {Promise<object>} Video ID and transcript data
   */
  getVideoData: async (urlOrId, languageCodes = null) => {
    try {
      // Extract video ID if it's a URL
      const { videoId } = await videoService.extractVideoId(urlOrId);

      // Fetch transcript
      const transcript = await videoService.fetchTranscript(videoId, languageCodes);

      return {
        videoId,
        transcript,
      };
    } catch (error) {
      console.error('Error getting video data:', error);
      throw error;
    }
  },

  /**
   * Get video with cached data (transcript, checkpoints, quiz, summary)
   * @param {string} youtubeVideoId - YouTube video ID (11 characters)
   * @returns {Promise<object>} Video object with all cached data
   * @example
   * const video = await videoService.getVideo('dQw4w9WgXcQ');
   * // Returns: { id, youtubeVideoId, transcript, checkpoints, quiz, summary, createdAt, updatedAt }
   */
  getVideo: async (youtubeVideoId) => {
    try {
      const response = await api.get(`/api/videos/${youtubeVideoId}`, {}, false);
      return response;
    } catch (error) {
      console.error('Error getting video:', error);
      throw error;
    }
  },

  /**
   * Create a new video entry in the database
   * @param {string} videoId - YouTube video ID
   * @param {object} options - Creation options
   * @param {boolean} options.fetchMetadata - Whether to fetch and cache metadata
   * @param {boolean} options.fetchTranscript - Whether to fetch and cache transcript
   * @param {string[]} options.languageCodes - Language preferences for transcript
   * @returns {Promise<object>} Created video object
   * @example
   * const video = await videoService.createVideo('dQw4w9WgXcQ', {
   *   fetchMetadata: true,
   *   fetchTranscript: true,
   *   languageCodes: ['en']
   * });
   */
  createVideo: async (videoId, options = {}) => {
    try {
      const body = {
        videoId,
        fetchMetadata: options.fetchMetadata || false,
        fetchTranscript: options.fetchTranscript || false,
      };

      if (options.languageCodes && options.languageCodes.length > 0) {
        body.languageCodes = options.languageCodes;
      }

      const response = await api.post('/api/videos', body, {}, false);
      return response;
    } catch (error) {
      console.error('Error creating video:', error);
      throw error;
    }
  },

  /**
   * Get YouTube video metadata (title, description, duration, etc.)
   * @param {string} youtubeVideoId - YouTube video ID
   * @param {boolean} cache - Whether to cache metadata in database (default: false)
   * @returns {Promise<object>} Video metadata
   * @example
   * const metadata = await videoService.getVideoMetadata('dQw4w9WgXcQ', true);
   * // Returns: { youtubeVideoId, title, description, thumbnailUrl, durationSeconds, author, publishDate, cached }
   */
  getVideoMetadata: async (youtubeVideoId, cache = false) => {
    try {
      const queryParam = cache ? '?cache=true' : '';
      const response = await api.get(`/api/videos/${youtubeVideoId}/metadata${queryParam}`, {}, false);
      return response;
    } catch (error) {
      console.error('Error getting video metadata:', error);
      throw error;
    }
  },

  /**
   * Get video thumbnail URL
   * @param {string} videoId - YouTube video ID
   * @param {string} quality - Thumbnail quality ('default', 'medium', 'high', 'maxres')
   * @returns {string} Thumbnail URL
   */
  getThumbnailUrl: (videoId, quality = 'medium') => {
    if (!videoId || typeof videoId !== 'string' || videoId.trim() === '') {
      return null;
    }

    const qualityMap = {
      default: 'default',
      medium: 'mqdefault',
      high: 'hqdefault',
      maxres: 'maxresdefault',
    };

    const qualityString = qualityMap[quality] || qualityMap.medium;
    // Use HTTPS for thumbnails; some browsers block HTTP mixed content
    return `https://img.youtube.com/vi/${videoId}/${qualityString}.jpg`;
  },

  /**
   * Get YouTube video URL
   * @param {string} videoId - YouTube video ID
   * @param {number} startTime - Optional start time in seconds
   * @returns {string} YouTube video URL
   */
  getVideoUrl: (videoId, startTime = null) => {
    const baseUrl = `https://www.youtube.com/watch?v=${videoId}`;
    return startTime ? `${baseUrl}&t=${Math.floor(startTime)}s` : baseUrl;
  },

  /**
   * Format transcript snippets into readable text
   * @param {array} snippets - Array of transcript snippets
   * @returns {string} Full transcript text
   */
  formatTranscriptText: (snippets) => {
    if (!snippets || !Array.isArray(snippets)) {
      return '';
    }
    return snippets.map((snippet) => snippet.text).join(' ');
  },

  /**
   * Format timestamp for display (e.g., "2:30" or "1:05:30")
   * @param {number} seconds - Time in seconds
   * @returns {string} Formatted timestamp
   */
  formatTimestamp: (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  },

  /**
   * Search transcript for a specific term
   * @param {array} snippets - Array of transcript snippets
   * @param {string} searchTerm - Term to search for
   * @returns {array} Matching snippets with timestamps
   */
  searchTranscript: (snippets, searchTerm) => {
    if (!snippets || !Array.isArray(snippets) || !searchTerm) {
      return [];
    }

    const term = searchTerm.toLowerCase();
    return snippets
      .filter((snippet) => snippet.text.toLowerCase().includes(term))
      .map((snippet) => ({
        text: snippet.text,
        start: snippet.start,
        timestamp: videoService.formatTimestamp(snippet.start),
      }));
  },

  /**
   * Get user's video watch history from server with pagination
   * @param {string} firebaseUid - Firebase user ID
   * @param {number} [limit=20] - Maximum number of videos to return (max: 1000)
   * @param {number} [offset=0] - Number of videos to skip for pagination
   * @returns {Promise<object>} Paginated video history with pagination metadata
   * @example
   * const result = await videoService.getVideoHistory(user.uid, 20, 0);
   * // Returns: { data: [...], pagination: { limit, offset, total, hasMore } }
   */
  getVideoHistory: async (firebaseUid, limit = 20, offset = 0) => {
    try {
      const queryParams = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString()
      });
      const response = await api.get(`/api/videos/history/${firebaseUid}?${queryParams.toString()}`);
      return response || { data: [], pagination: { limit, offset, total: 0, hasMore: false } };
    } catch (error) {
      console.error('Error fetching video history:', error);
      throw error;
    }
  },

  /**
   * Add or update a video in user's watch history
   * @param {string} firebaseUid - Firebase user ID
   * @param {object} videoData - Video data to save
   * @param {string} videoData.videoId - YouTube video ID
   * @param {number} videoData.lastPositionSeconds - Current playback position
   * @param {boolean} [videoData.isCompleted=false] - Whether video is fully watched
   * @returns {Promise<object>} Saved video data
   * @example
   * await videoService.saveToHistory(user.uid, { videoId: 'abc123', lastPositionSeconds: 120, isCompleted: false });
   */
  saveToHistory: async (firebaseUid, videoData) => {
    try {
      const response = await api.post(`/api/videos/history/${firebaseUid}`, videoData);
      return response.data;
    } catch (error) {
      console.error('Error saving video to history:', error);
      throw error;
    }
  },

  /**
   * Remove a video from user's watch history
   * @param {string} firebaseUid - Firebase user ID
   * @param {string} videoId - YouTube video ID to remove
   * @returns {Promise<void>}
   * @example
   * await videoService.deleteFromHistory(user.uid, 'abc123');
   */
  deleteFromHistory: async (firebaseUid, videoId) => {
    try {
      await api.delete(`/api/videos/history/${firebaseUid}/${videoId}`);
    } catch (error) {
      console.error('Error deleting video from history:', error);
      throw error;
    }
  },

  /**
   * Clear all video watch history for a user
   * @param {string} firebaseUid - Firebase user ID
   * @returns {Promise<object>} Object with deletedCount
   * @example
   * const result = await videoService.clearVideoHistory(user.uid);
   * // Returns: { message: 'Video history cleared', deletedCount: 5 }
   */
  clearVideoHistory: async (firebaseUid) => {
    try {
      const response = await api.delete(`/api/videos/history/${firebaseUid}`);
      return response;
    } catch (error) {
      console.error('Error clearing video history:', error);
      throw error;
    }
  },
};

export default videoService;
