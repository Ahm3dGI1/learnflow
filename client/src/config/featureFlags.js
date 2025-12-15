/**
 * Feature Flags Configuration
 * 
 * Centralized configuration for enabling/disabling features across the application.
 * This allows for safe rollout of new features and easy disabling if issues occur.
 * 
 * @module FeatureFlags
 */

/**
 * Feature flags configuration
 * Set to false to disable features that might interfere with team development
 */
export const FEATURE_FLAGS = {
  // Flashcard System - Set to false to disable flashcard functionality
  FLASHCARDS_ENABLED: process.env.REACT_APP_ENABLE_FLASHCARDS === 'true',
  
  // Future features can be added here
  // ADVANCED_ANALYTICS: process.env.REACT_APP_ENABLE_ANALYTICS === 'true',
  // COLLABORATIVE_NOTES: process.env.REACT_APP_ENABLE_NOTES === 'true',
};

/**
 * Check if a feature is enabled
 * @param {string} featureName - Name of the feature to check
 * @returns {boolean} True if feature is enabled
 */
export const isFeatureEnabled = (featureName) => {
  return FEATURE_FLAGS[featureName] || false;
};

/**
 * Get all enabled features
 * @returns {Array<string>} Array of enabled feature names
 */
export const getEnabledFeatures = () => {
  return Object.entries(FEATURE_FLAGS)
    .filter(([_, enabled]) => enabled)
    .map(([feature, _]) => feature);
};

export default FEATURE_FLAGS;