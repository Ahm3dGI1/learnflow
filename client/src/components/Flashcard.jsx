/**
 * Flashcard Component
 * 
 * Interactive flashcard with flip animation showing question on front and answer on back.
 * Tracks user interactions and provides feedback for spaced repetition learning.
 * 
 * @component
 * @example
 * const flashcard = {
 *   id: 1,
 *   question: "What is photosynthesis?",
 *   answer: "The process by which plants convert sunlight into energy",
 *   difficulty: "medium"
 * };
 * <Flashcard flashcard={flashcard} onResponse={handleResponse} />
 */

import React, { useState } from 'react';
import { RotateCcw, CheckCircle, XCircle, Brain } from 'lucide-react';
import './Flashcard.css';

/**
 * Flashcard Component
 * 
 * @param {Object} props - Component props
 * @param {Object} props.flashcard - Flashcard data
 * @param {string} props.flashcard.id - Unique flashcard identifier
 * @param {string} props.flashcard.question - Question text to display
 * @param {string} props.flashcard.answer - Answer text to display
 * @param {string} props.flashcard.difficulty - Difficulty level (easy, medium, hard)
 * @param {Function} props.onResponse - Callback when user responds (correct/incorrect)
 * @param {boolean} props.showAnswer - Whether to show answer initially
 * @returns {React.ReactElement} Interactive flashcard component
 */
export default function Flashcard({
  flashcard,
  onResponse,
  isFlipped = false,
  onFlip,
  cardNumber,
  totalCards
}) {
  // Animation state handles "locked" state during transition
  const [isAnimating, setIsAnimating] = useState(false);

  /**
   * Handle Card Flip Animation
   */
  const handleFlip = () => {
    if (isAnimating) return;

    setIsAnimating(true);
    onFlip && onFlip();

    // Reset animation state after animation completes
    setTimeout(() => setIsAnimating(false), 300);
  };

  /**
   * Handle Key Press for Accessibility
   */
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleFlip();
    }
  };

  /**
   * Handle User Response
   * @param {boolean} isCorrect - Whether user got it correct
   */
  const handleResponse = (isCorrect) => {
    onResponse && onResponse(flashcard.id, isCorrect);
  };

  /**
   * Get Difficulty Color Class
   */
  const getDifficultyColor = () => {
    switch (flashcard.difficulty) {
      case 'easy': return 'difficulty-easy';
      case 'medium': return 'difficulty-medium';
      case 'hard': return 'difficulty-hard';
      default: return 'difficulty-medium';
    }
  };

  return (
    <div className="flashcard-container">
      {/* Difficulty Indicator */}
      <div className={`difficulty-indicator ${getDifficultyColor()}`}>
        <Brain className="difficulty-icon" />
        <span className="difficulty-text">
          {flashcard.difficulty || 'medium'}
        </span>
      </div>

      {/* Main Flashcard */}
      <div
        className={`flashcard ${isFlipped ? 'flipped' : ''} ${isAnimating ? 'animating' : ''}`}
        onClick={handleFlip}
        onKeyDown={handleKeyDown}
        tabIndex="0"
        role="button"
        aria-pressed={isFlipped}
        data-testid="flashcard"
      >
        {/* Front Side - Question */}
        <div className="flashcard-side flashcard-front">
          <div className="flashcard-content">
            <div className="flashcard-label">Question</div>
            <div className="flashcard-text">
              {flashcard.question}
            </div>
            <div className="flip-hint">
              <RotateCcw className="flip-icon" />
              <span>Click to reveal answer</span>
            </div>
          </div>
        </div>

        {/* Back Side - Answer */}
        <div className="flashcard-side flashcard-back">
          <div className="flashcard-content">
            <div className="flashcard-label">Answer</div>
            <div className="flashcard-text">
              {flashcard.answer}
            </div>

            {/* Response Buttons */}
            <div className="response-buttons">
              <button
                className="response-btn correct-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleResponse(true);
                }}
                aria-label="Mark as correct"
              >
                <CheckCircle className="response-icon" />
                <span>Got it right!</span>
              </button>

              <button
                className="response-btn incorrect-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleResponse(false);
                }}
                aria-label="Mark as incorrect"
              >
                <XCircle className="response-icon" />
                <span>Need to review</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Card Info */}
      <div className="flashcard-info">
        <span className="card-number">
          Card {cardNumber || 1} {totalCards ? `/ ${totalCards}` : ''}
        </span>
        <span className="flip-instruction">
          {isFlipped ? 'How did you do?' : 'Think, then click to check'}
        </span>
      </div>
    </div>
  );
}