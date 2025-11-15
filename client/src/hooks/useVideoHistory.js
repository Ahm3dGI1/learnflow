import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';

const STORAGE_KEY = 'learnflow_video_history';

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

  const removeFromHistory = (id) => {
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  const clearHistory = () => {
    if (user) {
      const userKey = `${STORAGE_KEY}_${user.uid}`;
      localStorage.removeItem(userKey);
      setHistory([]);
    }
  };

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
