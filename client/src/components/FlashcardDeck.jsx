/**
 * FlashcardDeck Component
 * 
 * Manages a collection of flashcards with navigation, progress tracking,
 * and spaced repetition functionality. Provides an interactive learning
 * experience with performance analytics.
 * 
 * @component
 * @example
 * const flashcards = [
 *   { id: 1, question: "What is React?", answer: "A JavaScript library", difficulty: "easy" },
 *   { id: 2, question: "What is JSX?", answer: "JavaScript XML syntax", difficulty: "medium" }
 * ];
 * <FlashcardDeck flashcards={flashcards} onComplete={handleComplete} />
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Target,
  Trophy,
  Clock,
  Brain
} from 'lucide-react';
import Flashcard from './Flashcard';
import './FlashcardDeck.css';

/**
 * FlashcardDeck Component
 * 
 * @param {Object} props - Component props
 * @param {Array} props.flashcards - Array of flashcard objects
 * @param {Function} props.onComplete - Callback when deck is completed
 * @param {Function} props.onProgress - Callback for progress updates
 * @param {string} props.title - Deck title
 * @param {boolean} props.showProgress - Whether to show progress indicators
 * @returns {React.ReactElement} Flashcard deck with navigation and progress
 */
export default function FlashcardDeck({
  flashcards = [],
  onComplete,
  onProgress,
  title = "Flashcard Deck",
  showProgress = true
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState({});
  const [sessionStats, setSessionStats] = useState({
    correct: 0,
    incorrect: 0,
    total: 0,
    startTime: Date.now()
  });
  const [deckComplete, setDeckComplete] = useState(false);

  const [isFlipped, setIsFlipped] = useState(false);
  const timeoutRef = useRef(null);

  const currentCard = flashcards[currentIndex];
  const totalCards = flashcards.length;

  /**
   * Reset flip state and timer when card changes
   */
  useEffect(() => {
    setIsFlipped(false);
    return () => {
      const timeoutId = timeoutRef.current;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [currentIndex]);

  /**
   * Navigate to Next Card
   */
  const handleNext = useCallback(() => {
    if (currentIndex < totalCards - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Deck completed
      setDeckComplete(true);
      
      // Use functional update to get latest responses and stats
      setResponses(latestResponses => {
        setSessionStats(latestStats => {
          if (onComplete) {
            onComplete({
              responses: latestResponses,
              stats: latestStats,
              duration: Date.now() - latestStats.startTime
            });
          }
          return latestStats;
        });
        return latestResponses;
      });
    }
  }, [currentIndex, totalCards, onComplete]);

  /**
   * Navigate to Previous Card
   */
  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex]);

  /**
   * Handle User Response to Flashcard
   */
  const handleResponse = useCallback((cardId, isCorrect) => {
    // Use functional updates to avoid dependency on responses and sessionStats
    setResponses(prevResponses => ({
      ...prevResponses,
      [cardId]: isCorrect
    }));

    setSessionStats(prevStats => {
      const newStats = {
        ...prevStats,
        [isCorrect ? 'correct' : 'incorrect']: prevStats[isCorrect ? 'correct' : 'incorrect'] + 1,
        total: prevStats.total + 1
      };

      // Report progress with updated stats
      if (onProgress) {
        onProgress({
          cardId,
          isCorrect,
          currentIndex,
          totalCards,
          stats: newStats
        });
      }

      return newStats;
    });

    // Note: Users can manually advance instead of auto-advance
    // Removed auto-advance to give users more control
  }, [onProgress, currentIndex, totalCards]);

  /**
   * Keyboard Shortcuts
   */
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore keyboard events when user is typing in an input/textarea
      const activeElement = document.activeElement;
      const isTyping = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.isContentEditable
      );
      
      if (isTyping || deckComplete || !currentCard) return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          setIsFlipped(prev => !prev);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (currentIndex > 0) handlePrevious();
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (currentIndex < totalCards - 1) handleNext();
          break;
        case 'Digit1':
        case 'Numpad1':
          if (isFlipped) handleResponse(currentCard.id, false);
          break;
        case 'Digit2':
        case 'Numpad2':
          if (isFlipped) handleResponse(currentCard.id, true);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, deckComplete, currentCard, isFlipped, totalCards, handlePrevious, handleNext, handleResponse]);

  /**
   * Reset Deck
   */
  const handleReset = () => {
    setCurrentIndex(0);
    setResponses({});
    setSessionStats({
      correct: 0,
      incorrect: 0,
      total: 0,
      startTime: Date.now()
    });
    setDeckComplete(false);
  };

  /**
   * Calculate Progress Percentage
   */
  const getProgress = () => {
    return totalCards > 0 ? ((currentIndex + 1) / totalCards) * 100 : 0;
  };

  /**
   * Calculate Accuracy Percentage
   */
  const getAccuracy = () => {
    return sessionStats.total > 0
      ? (sessionStats.correct / sessionStats.total) * 100
      : 0;
  };

  /**
   * Format Duration
   */
  const formatDuration = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Handle empty flashcard array
  if (!flashcards || flashcards.length === 0) {
    return (
      <div className="flashcard-deck empty-deck">
        <div className="empty-message">
          <Brain className="empty-icon" />
          <h3>No Flashcards Available</h3>
          <p>Generate flashcards from a video to start learning!</p>
        </div>
      </div>
    );
  }

  // Completion screen
  if (deckComplete) {
    const duration = Date.now() - sessionStats.startTime;
    const accuracy = getAccuracy();

    return (
      <div className="flashcard-deck completion-screen">
        <div className="completion-content">
          <Trophy className="completion-icon" />
          <h2>Deck Complete! 🎉</h2>

          <div className="completion-stats">
            <div className="stat-item">
              <Target className="stat-icon" />
              <span className="stat-label">Accuracy</span>
              <span className="stat-value">{accuracy.toFixed(1)}%</span>
            </div>

            <div className="stat-item">
              <Clock className="stat-icon" />
              <span className="stat-label">Duration</span>
              <span className="stat-value">{formatDuration(duration)}</span>
            </div>

            <div className="stat-item">
              <Brain className="stat-icon" />
              <span className="stat-label">Cards Reviewed</span>
              <span className="stat-value">{sessionStats.total}</span>
            </div>
          </div>

          <button
            className="reset-btn"
            onClick={handleReset}
          >
            <RotateCcw className="reset-icon" />
            Review Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flashcard-deck">
      {/* Header */}
      <div className="deck-header">
        <h2 className="deck-title">{title}</h2>

        {showProgress && (
          <div className="progress-info">
            <span className="card-counter">
              {currentIndex + 1} / {totalCards}
            </span>
            <div className="accuracy-indicator">
              Accuracy: {getAccuracy().toFixed(1)}%
            </div>
            <div className="keyboard-hints">
              <span className="hint-item"><span className="key-badge">Space</span> Flip</span>
              <span className="hint-item"><span className="key-badge">1</span> / <span className="key-badge">2</span> Rate</span>
            </div>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {showProgress && (
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${getProgress()}%` }}
          />
        </div>
      )}

      {/* Current Flashcard */}
      <div className="current-card">
        <Flashcard
          flashcard={currentCard}
          onResponse={handleResponse}
          isFlipped={isFlipped}
          onFlip={() => setIsFlipped(!isFlipped)}
          cardNumber={currentIndex + 1}
          totalCards={totalCards}
        />
      </div>

      {/* Navigation */}
      <div className="deck-navigation">
        <button
          className="nav-btn prev-btn"
          onClick={handlePrevious}
          disabled={currentIndex === 0}
          aria-label="Previous card"
        >
          <ChevronLeft className="nav-icon" />
          Previous
        </button>

        <div className="nav-info">
          <span className="response-indicator">
            {responses[currentCard?.id] !== undefined && (
              <span className={responses[currentCard.id] ? 'correct' : 'incorrect'}>
                {responses[currentCard.id] ? '✓' : '✗'}
              </span>
            )}
          </span>
        </div>

        <button
          className="nav-btn next-btn"
          onClick={handleNext}
          disabled={currentIndex === totalCards - 1}
          aria-label="Next card"
        >
          Next
          <ChevronRight className="nav-icon" />
        </button>
      </div>

      {/* Session Stats */}
      {showProgress && sessionStats.total > 0 && (
        <div className="session-stats">
          <div className="stat correct">✓ {sessionStats.correct}</div>
          <div className="stat incorrect">✗ {sessionStats.incorrect}</div>
          <div className="stat total">Total: {sessionStats.total}</div>
        </div>
      )}
    </div>
  );
}