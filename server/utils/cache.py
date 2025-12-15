"""
Caching utilities for LearnFlow.
Provides simple in-memory caching for various data types.
"""

import time


class SimpleCache:
    """
    Simple in-memory cache with TTL (Time To Live) support.
    """

    def __init__(self, ttl=3600):
        """
        Initialize cache.

        Args:
            ttl (int): Time to live in seconds. Default: 3600 (1 hour)
        """
        self.cache = {}
        self.ttl = ttl

    def get(self, key):
        """
        Retrieve cached data if available and not expired.

        Args:
            key (str): Cache key

        Returns:
            Any or None: Cached data or None if not found/expired
        """
        cached = self.cache.get(key)

        if cached:
            # Check if cache is still valid
            if time.time() - cached['timestamp'] < self.ttl:
                return cached['data']
            else:
                # Remove expired cache
                del self.cache[key]

        return None

    def set(self, key, data):
        """
        Cache data with current timestamp.

        Args:
            key (str): Cache key
            data (Any): Data to cache
        """
        self.cache[key] = {
            'data': data,
            'timestamp': time.time()
        }

    def clear(self):
        """
        Clear all cached data.

        Returns:
            int: Number of items cleared
        """
        count = len(self.cache)
        self.cache.clear()
        return count

    def size(self):
        """
        Get number of items in cache.

        Returns:
            int: Cache size
        """
        return len(self.cache)

    def remove(self, key):
        """
        Remove specific item from cache.

        Args:
            key (str): Cache key

        Returns:
            bool: True if item was removed, False if not found
        """
        if key in self.cache:
            del self.cache[key]
            return True
        return False


# Global cache instances
checkpoint_cache = SimpleCache(ttl=3600)  # 1 hour TTL
quiz_cache = SimpleCache(ttl=3600)  # 1 hour TTL
summary_cache = SimpleCache(ttl=3600)  # 1 hour TTL
