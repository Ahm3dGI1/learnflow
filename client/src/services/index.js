/**
 * Export all services for easy importing
 */

import { isFeatureEnabled } from '../config/featureFlags';

export { default as api, ApiError } from './api';
export { default as videoService } from './videoService';
export { default as llmService } from './llmService';
export { default as progressService } from './progressService';
export { default as cacheService } from './cache';

// Conditionally export flashcardService only if feature is enabled
export const flashcardService = isFeatureEnabled('FLASHCARDS_ENABLED') 
  ? require('./flashcardService').default 
  : null;
