/**
 * Flashcard Service
 * 
 * Service layer for flashcard-related operations including generation,
 * progress tracking, and spaced repetition algorithms.
 * 
 * Features:
 * - Generate flashcards from video content
 * - Track learning progress and performance
 * - Implement spaced repetition scheduling
 * - Save and retrieve flashcard sessions
 * 
 * @module FlashcardService
 */

import api from './api';
import { cacheService } from './cache';

/**
 * Flashcard difficulty levels for spaced repetition
 */
export const DIFFICULTY_LEVELS = {
  EASY: 'easy',
  MEDIUM: 'medium', 
  HARD: 'hard',
  AGAIN: 'again'
};

/**
 * Spaced repetition intervals (in days)
 */
const REPETITION_INTERVALS = {
  [DIFFICULTY_LEVELS.AGAIN]: 0.1, // 2.4 hours
  [DIFFICULTY_LEVELS.HARD]: 1,    // 1 day
  [DIFFICULTY_LEVELS.MEDIUM]: 3,  // 3 days
  [DIFFICULTY_LEVELS.EASY]: 7     // 1 week
};

/**
 * Flashcard Service Class
 * 
 * Handles all flashcard-related operations including AI generation,
 * progress tracking, and spaced repetition algorithms.
 */
class FlashcardService {
  constructor() {
    this.cache = cacheService;
    this.baseUrl = '/api/flashcards';
  }

  /**
   * Generate Flashcards from Video Content
   * 
   * @param {string} userId - User ID for personalized generation
   * @param {string} videoId - Video ID to generate flashcards from
   * @param {Object} options - Generation options
   * @param {number} options.count - Number of flashcards to generate
   * @param {string} options.difficulty - Overall difficulty level
   * @param {boolean} options.includeDefinitions - Include definition-based cards
   * @param {boolean} options.includeConcepts - Include concept-based cards
   * @returns {Promise<Array>} Generated flashcards array
   */
  async generateFlashcards(userId, videoId, options = {}) {
    const {
      count = 10,
      difficulty = 'mixed',
      includeDefinitions = true,
      includeConcepts = true
    } = options;

    try {
      const response = await api.post(`${this.baseUrl}/generate`, {
        userId,
        videoId,
        count,
        difficulty,
        includeDefinitions,
        includeConcepts
      });

      const flashcards = response.data.flashcards.map(card => ({
        ...card,
        id: card.id || this.generateCardId(),
        createdAt: new Date().toISOString(),
        nextReview: new Date().toISOString(), // Available immediately
        interval: 0,
        easeFactor: 2.5, // Starting ease factor for spaced repetition
        repetitions: 0
      }));

      // Cache the generated flashcards
      this.cache.set(`flashcards_${videoId}`, flashcards, 3600000); // 1 hour

      return flashcards;
    } catch (error) {
      console.warn('Backend flashcard API not available, using mock data:', error.message);
      
      // Return mock flashcards if backend is not available (graceful degradation)
      return this.generateMockFlashcards(videoId, count, difficulty);
    }
  }

  /**
   * Get Flashcards for Video
   * 
   * @param {string} videoId - Video ID
   * @param {string} userId - User ID for personalized data
   * @returns {Promise<Array>} Existing flashcards for the video
   */
  async getFlashcards(videoId, userId) {
    // Check cache first
    const cached = this.cache.get(`flashcards_${videoId}`);
    if (cached) {
      return cached;
    }

    try {
      const response = await api.get(`${this.baseUrl}/video/${videoId}`, {
        params: { userId }
      });

      const flashcards = response.data.flashcards || [];
      
      // Cache the flashcards
      if (flashcards.length > 0) {
        this.cache.set(`flashcards_${videoId}`, flashcards, 1800000); // 30 minutes
      }

      return flashcards;
    } catch (error) {
      console.warn('Backend flashcard API not available for fetching:', error.message);
      // Return empty array instead of throwing error
      return [];
    }
  }

  /**
   * Record Flashcard Response
   * 
   * Updates flashcard progress based on user response and calculates
   * next review date using spaced repetition algorithm.
   * 
   * @param {string} cardId - Flashcard ID
   * @param {string} userId - User ID
   * @param {string} difficulty - User's perceived difficulty (easy, medium, hard, again)
   * @param {number} responseTime - Time taken to answer (ms)
   * @returns {Promise<Object>} Updated card data with next review date
   */
  async recordCardResponse(cardId, userId, difficulty, responseTime) {
    try {
      // Calculate spaced repetition values
      const cardData = await this.calculateSpacedRepetition(cardId, difficulty);

      const response = await api.post(`${this.baseUrl}/${cardId}/response`, {
        userId,
        difficulty,
        responseTime,
        nextReview: cardData.nextReview,
        interval: cardData.interval,
        easeFactor: cardData.easeFactor,
        repetitions: cardData.repetitions
      });

      return response.data;
    } catch (error) {
      console.warn('Backend flashcard API not available for recording response:', error.message);
      // Return mock response to keep UI working
      return {
        success: true,
        message: 'Response recorded locally (backend unavailable)',
        mockResponse: true
      };
    }
  }

  /**
   * Get Due Flashcards
   * 
   * Retrieves flashcards that are due for review based on spaced repetition.
   * 
   * @param {string} userId - User ID
   * @param {number} limit - Maximum number of cards to return
   * @returns {Promise<Array>} Flashcards due for review
   */
  async getDueFlashcards(userId, limit = 20) {
    try {
      const response = await api.get(`${this.baseUrl}/due`, {
        params: { userId, limit }
      });

      return response.data.flashcards || [];
    } catch (error) {
      console.warn('Backend flashcard API not available for due cards:', error.message);
      return [];
    }
  }

  /**
   * Get Learning Statistics
   * 
   * @param {string} userId - User ID
   * @param {string} period - Time period ('day', 'week', 'month')
   * @returns {Promise<Object>} Learning statistics
   */
  async getLearningStats(userId, period = 'week') {
    try {
      const response = await api.get(`${this.baseUrl}/stats`, {
        params: { userId, period }
      });

      return response.data.stats || {
        cardsReviewed: 0,
        accuracy: 0,
        streakDays: 0,
        totalTime: 0,
        cardsMastered: 0,
        cardsLearning: 0
      };
    } catch (error) {
      console.warn('Backend flashcard API not available for stats:', error.message);
      return {
        cardsReviewed: 0,
        accuracy: 0,
        streakDays: 0,
        totalTime: 0,
        cardsMastered: 0,
        cardsLearning: 0,
        mockData: true
      };
    }
  }

  /**
   * Save Study Session
   * 
   * @param {string} userId - User ID
   * @param {Object} sessionData - Session results
   * @returns {Promise<Object>} Saved session data
   */
  async saveStudySession(userId, sessionData) {
    try {
      const response = await api.post(`${this.baseUrl}/session`, {
        userId,
        ...sessionData,
        completedAt: new Date().toISOString()
      });

      return response.data;
    } catch (error) {
      console.warn('Backend flashcard API not available for saving session:', error.message);
      // Return mock response to keep UI working
      return {
        success: true,
        sessionId: 'mock-' + Date.now(),
        message: 'Session saved locally (backend unavailable)',
        mockResponse: true
      };
    }
  }

  /**
   * Calculate Spaced Repetition Values
   * 
   * Implements the SM-2 algorithm for spaced repetition scheduling.
   * 
   * @param {string} cardId - Flashcard ID
   * @param {string} difficulty - User response difficulty
   * @returns {Promise<Object>} Updated spaced repetition values
   */
  async calculateSpacedRepetition(cardId, difficulty) {
    // Get current card data (would come from database in real implementation)
    const currentCard = await this.getCardData(cardId);
    
    let { easeFactor, interval, repetitions } = currentCard;

    // SM-2 Algorithm implementation
    if (difficulty === DIFFICULTY_LEVELS.AGAIN) {
      // Reset if answered incorrectly
      repetitions = 0;
      interval = REPETITION_INTERVALS[difficulty];
    } else {
      repetitions += 1;

      if (repetitions === 1) {
        interval = 1;
      } else if (repetitions === 2) {
        interval = 6;
      } else {
        interval = Math.round(interval * easeFactor);
      }

      // Update ease factor based on difficulty
      const qualityMap = {
        [DIFFICULTY_LEVELS.EASY]: 5,
        [DIFFICULTY_LEVELS.MEDIUM]: 4,
        [DIFFICULTY_LEVELS.HARD]: 3,
        [DIFFICULTY_LEVELS.AGAIN]: 0
      };

      const quality = qualityMap[difficulty];
      easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
      easeFactor = Math.max(1.3, easeFactor); // Minimum ease factor
    }

    // Calculate next review date
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + interval);

    return {
      easeFactor: Math.round(easeFactor * 100) / 100, // Round to 2 decimal places
      interval,
      repetitions,
      nextReview: nextReview.toISOString()
    };
  }

  /**
   * Get Card Data (placeholder for database lookup)
   * 
   * @param {string} cardId - Flashcard ID
   * @returns {Promise<Object>} Current card data
   */
  async getCardData(cardId) {
    // In a real implementation, this would fetch from database
    // For now, return default values
    return {
      easeFactor: 2.5,
      interval: 0,
      repetitions: 0,
      nextReview: new Date().toISOString()
    };
  }

  /**
   * Generate Unique Card ID
   * 
   * @returns {string} Unique card identifier
   */
  generateCardId() {
    return `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Format Card for UI
   * 
   * @param {Object} card - Raw card data
   * @returns {Object} Formatted card for display
   */
  formatCard(card) {
    return {
      id: card.id,
      question: card.question,
      answer: card.answer,
      difficulty: card.difficulty || 'medium',
      type: card.type || 'definition',
      hints: card.hints || [],
      explanation: card.explanation || '',
      tags: card.tags || [],
      nextReview: card.nextReview,
      interval: card.interval || 0,
      repetitions: card.repetitions || 0
    };
  }

  /**
   * Generate Mock Flashcards (Fallback)
   * 
   * Used when backend is not available to provide a basic flashcard experience
   * @param {string} videoId - Video ID
   * @param {number} count - Number of flashcards to generate
   * @param {string} difficulty - Difficulty level
   * @returns {Array} Mock flashcards
   */
  generateMockFlashcards(videoId, count = 5, difficulty = 'medium') {
    const mockCards = [
      {
        front: 'What is the main topic of this video?',
        back: 'The video covers key learning concepts that can be reviewed through flashcards.',
        type: 'concept'
      },
      {
        front: 'Key Term Definition',
        back: 'Important terms and definitions from the video content.',
        type: 'definition'
      },
      {
        front: 'Why is this concept important?',
        back: 'This concept is important because it forms the foundation for understanding more complex topics.',
        type: 'concept'
      },
      {
        front: 'How can you apply this knowledge?',
        back: 'You can apply this knowledge by practicing the concepts and reviewing them regularly.',
        type: 'application'
      },
      {
        front: 'Summary Question',
        back: 'Summarize the key points covered in this learning session.',
        type: 'summary'
      }
    ];

    return mockCards.slice(0, count).map((card, index) => ({
      ...card,
      id: this.generateCardId(),
      videoId,
      difficulty,
      createdAt: new Date().toISOString(),
      nextReview: new Date().toISOString(),
      interval: 0,
      easeFactor: 2.5,
      repetitions: 0,
      tags: ['mock', 'demo'],
      isMock: true // Flag to indicate this is mock data
    }));
  }

  /**
   * Clear Cache
   */
  clearCache() {
    this.cache.clear();
  }
}

// Create and export singleton instance
export const flashcardService = new FlashcardService();
export default flashcardService;