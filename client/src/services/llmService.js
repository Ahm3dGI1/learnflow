/**
 * LLM service for AI-powered features.
 * Handles checkpoint generation, quiz generation, and chat interactions.
 */

import api from './api';

const llmService = {
  /**
   * Generate learning checkpoints from video transcript
   * @param {object} transcript - Transcript object with snippets
   * @param {object} options - Generation options
   * @param {number} options.numCheckpoints - Number of checkpoints to generate (default: 5)
   * @param {string} options.difficulty - Difficulty level: 'beginner', 'intermediate', 'advanced'
   * @returns {Promise<object>} Generated checkpoints
   * @example
   * const checkpoints = await llmService.generateCheckpoints(transcript, { numCheckpoints: 5 });
   * // Returns: { checkpoints: [{ timestamp, title, description, keyPoints }], generatedAt }
   */
  generateCheckpoints: async (transcript, options = {}) => {
    try {
      const body = {
        transcript: transcript,
        videoId: transcript.videoId,
        numCheckpoints: options.numCheckpoints || 5,
        difficulty: options.difficulty || 'intermediate',
      };

      const response = await api.post('/api/llm/checkpoints/generate', body, {}, false);
      return response;
    } catch (error) {
      console.error('Error generating checkpoints:', error);
      throw error;
    }
  },

  /**
   * Generate quiz questions from video transcript
   * @param {object} transcript - Transcript object with snippets
   * @param {object} options - Generation options
   * @param {number} options.numQuestions - Number of questions (default: 5)
   * @param {string} options.difficulty - Difficulty level
   * @param {string} options.questionType - 'multiple_choice', 'true_false', 'mixed'
   * @returns {Promise<object>} Generated quiz
   * @example
   * const quiz = await llmService.generateQuiz(transcript, { numQuestions: 5 });
   * // Returns: { quizId, questions: [{ question, options, correctAnswer, explanation }], generatedAt }
   */
  generateQuiz: async (transcript, options = {}) => {
    try {
      const body = {
        transcript: transcript,
        videoId: transcript.videoId,
        numQuestions: options.numQuestions || 5,
        difficulty: options.difficulty || 'intermediate',
        questionType: options.questionType || 'multiple_choice',
      };

      const response = await api.post('/api/llm/quiz/generate', body, {}, false);
      return response;
    } catch (error) {
      console.error('Error generating quiz:', error);
      throw error;
    }
  },

  /**
   * Send a chat message to the AI tutor
   * @param {string} message - User's question
   * @param {object} context - Context for the conversation
   * @param {string} context.videoId - Current video ID
   * @param {object} context.transcript - Current video transcript
   * @param {string} context.sessionId - Chat session ID (optional)
   * @returns {Promise<object>} AI response
   * @example
   * const response = await llmService.sendChatMessage('Explain this concept', { videoId: 'abc123', transcript });
   * // Returns: { response: 'Here is the explanation...', sessionId, timestamp }
   */
  sendChatMessage: async (message, context = {}) => {
    try {
      const body = {
        message,
        videoId: context.videoId,
        transcript: context.transcript,
        sessionId: context.sessionId || null,
      };

      const response = await api.post('/api/llm/chat/send', body, {}, false);
      return response;
    } catch (error) {
      console.error('Error sending chat message:', error);
      throw error;
    }
  },

  /**
   * Send a chat message with streaming response
   * @param {string} message - User's question
   * @param {object} context - Context for the conversation
   * @param {Function} onChunk - Callback for each chunk of response
   * @returns {Promise<string>} Full response text
   * @example
   * const fullResponse = await llmService.sendChatMessageStream(
   *   'Explain this concept',
   *   { videoId: 'abc123', transcript },
   *   (chunk) => console.log('Received:', chunk)
   * );
   */
  sendChatMessageStream: async (message, context = {}, onChunk = null) => {
    try {
      const token = await api.getAuthToken() || null;
      const url = `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/llm/chat/stream`;

      const body = JSON.stringify({
        message,
        videoId: context.videoId,
        transcript: context.transcript,
        sessionId: context.sessionId || null,
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        fullResponse += chunk;

        if (onChunk) {
          onChunk(chunk);
        }
      }

      return fullResponse;
    } catch (error) {
      console.error('Error streaming chat message:', error);
      throw error;
    }
  },

  /**
   * Get chat history for a session
   * @param {string} sessionId - Chat session ID
   * @returns {Promise<object>} Chat history
   */
  getChatHistory: async (sessionId) => {
    try {
      const response = await api.get(`/api/llm/chat/history/${sessionId}`, {}, true);
      return response;
    } catch (error) {
      console.error('Error fetching chat history:', error);
      throw error;
    }
  },

  /**
   * Clear chat history for a session
   * @param {string} sessionId - Chat session ID
   * @returns {Promise<object>} Deletion confirmation
   */
  clearChatHistory: async (sessionId) => {
    try {
      const response = await api.delete(`/api/llm/chat/history/${sessionId}`, {}, true);
      return response;
    } catch (error) {
      console.error('Error clearing chat history:', error);
      throw error;
    }
  },

  /**
   * Clear checkpoint cache for a video
   * @param {string} videoId - YouTube video ID
   * @returns {Promise<object>} Cache clear confirmation
   */
  clearCheckpointCache: async (videoId) => {
    try {
      const response = await api.post('/api/llm/checkpoints/cache/clear', { videoId }, {}, false);
      return response;
    } catch (error) {
      console.error('Error clearing checkpoint cache:', error);
      throw error;
    }
  },

  /**
   * Clear quiz cache for a video
   * @param {string} videoId - YouTube video ID
   * @returns {Promise<object>} Cache clear confirmation
   */
  clearQuizCache: async (videoId) => {
    try {
      const response = await api.post('/api/llm/quiz/cache/clear', { videoId }, {}, false);
      return response;
    } catch (error) {
      console.error('Error clearing quiz cache:', error);
      throw error;
    }
  },

  /**
   * Check LLM service health
   * @returns {Promise<object>} Health status
   */
  healthCheck: async () => {
    try {
      const response = await api.get('/api/llm/health', {}, false);
      return response;
    } catch (error) {
      console.error('Error checking LLM health:', error);
      throw error;
    }
  },

  /**
   * Mark a checkpoint as complete
   * @param {string} checkpointId - Checkpoint ID
   * @returns {Promise<object>} Completion confirmation
   */
  completeCheckpoint: async (checkpointId) => {
    try {
      const response = await api.post(`/api/checkpoints/${checkpointId}/complete`, {}, {}, true);
      return response;
    } catch (error) {
      console.error('Error completing checkpoint:', error);
      throw error;
    }
  },

  /**
   * Submit quiz answers and get results
   * @param {string} quizId - Quiz ID
   * @param {array} answers - Array of user's answers
   * @returns {Promise<object>} Quiz results with score
   * @example
   * const results = await llmService.submitQuiz('quiz123', [
   *   { questionId: 1, selectedAnswer: 'B' },
   *   { questionId: 2, selectedAnswer: 'A' }
   * ]);
   * // Returns: { attemptId, score, totalQuestions, correctAnswers, answers: [...] }
   */
  submitQuiz: async (quizId, answers) => {
    try {
      const response = await api.post(`/api/quizzes/${quizId}/submit`, { answers }, {}, true);
      return response;
    } catch (error) {
      console.error('Error submitting quiz:', error);
      throw error;
    }
  },

  /**
   * Get user's quiz attempts for a video
   * @param {string} videoId - YouTube video ID
   * @returns {Promise<object>} List of quiz attempts
   */
  getQuizAttempts: async (videoId) => {
    try {
      const response = await api.get(`/api/quizzes/attempts?videoId=${videoId}`, {}, true);
      return response;
    } catch (error) {
      console.error('Error fetching quiz attempts:', error);
      throw error;
    }
  },

  /**
   * Generate a personalized study plan
   * @param {object} userData - User's learning data
   * @returns {Promise<object>} Study plan recommendations
   */
  generateStudyPlan: async (userData) => {
    try {
      const response = await api.post('/api/llm/study-plan', userData, {}, true);
      return response;
    } catch (error) {
      console.error('Error generating study plan:', error);
      throw error;
    }
  },

  /**
   * Get video summary
   * @param {object} transcript - Video transcript
   * @param {number} maxLength - Maximum summary length in words (default: 150)
   * @returns {Promise<object>} Video summary
   */
  generateSummary: async (transcript, maxLength = 150) => {
    try {
      const body = {
        transcript: transcript,
        videoId: transcript.videoId,
        maxLength,
      };

      const response = await api.post('/api/llm/summary/generate', body, {}, false);
      return response;
    } catch (error) {
      console.error('Error generating summary:', error);
      throw error;
    }
  },

  /**
   * Submit quiz answers and save attempt to database
   * @param {number} userId - User ID
   * @param {number} quizId - Quiz ID
   * @param {Array} answers - Array of answer objects with questionIndex, selectedAnswer, isCorrect
   * @param {number} timeTakenSeconds - Time taken to complete quiz in seconds
   * @returns {Promise<object>} Quiz attempt result with score
   * @example
   * const result = await llmService.submitQuiz(1, 5, [
   *   { questionIndex: 0, selectedAnswer: "Option B", isCorrect: true },
   *   { questionIndex: 1, selectedAnswer: "Option A", isCorrect: false }
   * ], 120);
   * // Returns: { attemptId, score, totalQuestions, correctAnswers, submittedAt }
   */
  submitQuiz: async (userId, quizId, answers, timeTakenSeconds = null) => {
    try {
      const body = {
        userId,
        quizId,
        answers,
        timeTakenSeconds,
      };

      const response = await api.post('/api/llm/quiz/submit', body, {}, false);
      return response;
    } catch (error) {
      console.error('Error submitting quiz:', error);
      throw error;
    }
  },

  /**
   * Mark a checkpoint as completed for a user
   * @param {number} checkpointId - Checkpoint ID
   * @param {number} userId - User ID
   * @param {boolean} isCorrect - Whether the answer was correct
   * @returns {Promise<object>} Completion record
   * @example
   * const result = await llmService.markCheckpointComplete(10, 1, true);
   * // Returns: { completionId, checkpointId, isCompleted, attemptCount, completedAt }
   */
  markCheckpointComplete: async (checkpointId, userId, isCorrect) => {
    try {
      const body = {
        userId,
        isCorrect,
      };

      const response = await api.post(`/api/llm/checkpoints/${checkpointId}/complete`, body, {}, false);
      return response;
    } catch (error) {
      console.error('Error marking checkpoint complete:', error);
      throw error;
    }
  },

  /**
   * Get checkpoint completion progress for a user on a video
   * @param {number} videoId - Video ID (database ID, not YouTube ID)
   * @param {number} userId - User ID
   * @returns {Promise<object>} Progress data
   * @example
   * const progress = await llmService.getCheckpointProgress(5, 1);
   * // Returns: { videoId, totalCheckpoints, completedCheckpoints, progressPercentage, completions: [...] }
   */
  getCheckpointProgress: async (videoId, userId) => {
    try {
      const response = await api.get(`/api/llm/videos/${videoId}/checkpoint-progress?userId=${userId}`, {}, false);
      return response;
    } catch (error) {
      console.error('Error getting checkpoint progress:', error);
      throw error;
    }
  },
};

export default llmService;
