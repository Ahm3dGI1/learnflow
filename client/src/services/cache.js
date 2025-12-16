/**
 * Cache Service
 * 
 * Simple in-memory cache service for storing temporary data
 * with TTL (time-to-live) support.
 * 
 * @module CacheService
 */

class CacheService {
  constructor() {
    this.cache = new Map();
    this.timers = new Map();
  }

  /**
   * Set cache entry with optional TTL
   * 
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} ttl - Time to live in milliseconds
   */
  set(key, value, ttl = 300000) { // Default 5 minutes
    // Clear existing timer if any
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    // Set the cache entry
    this.cache.set(key, value);

    // Set expiration timer
    if (ttl > 0) {
      const timer = setTimeout(() => {
        this.delete(key);
      }, ttl);
      
      this.timers.set(key, timer);
    }
  }

  /**
   * Get cache entry
   * 
   * @param {string} key - Cache key
   * @returns {*} Cached value or undefined
   */
  get(key) {
    return this.cache.get(key);
  }

  /**
   * Check if key exists in cache
   * 
   * @param {string} key - Cache key
   * @returns {boolean} True if key exists
   */
  has(key) {
    return this.cache.has(key);
  }

  /**
   * Delete cache entry
   * 
   * @param {string} key - Cache key
   * @returns {boolean} True if deleted
   */
  delete(key) {
    // Clear timer
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }

    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear() {
    // Clear all timers
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
    this.cache.clear();
  }

  /**
   * Get cache size
   * 
   * @returns {number} Number of entries
   */
  size() {
    return this.cache.size;
  }

  /**
   * Get all keys
   * 
   * @returns {Iterator} Cache keys iterator
   */
  keys() {
    return this.cache.keys();
  }
}

// Export singleton instance
export const cacheService = new CacheService();
export default cacheService;