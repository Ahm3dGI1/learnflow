/**
 * Checkpoint Popup Component
 * 
 * Modal popup that appears at checkpoint timestamps during video playback.
 * Displays a question to verify understanding and requires correct answer
 * before video can continue. Provides "Try Again" and "Ask AI Tutor" options
 * for wrong answers.
 * 
 * @module CheckpointPopup
 */

import { useState, useEffect, useRef } from 'react';
import './CheckpointPopup.css';

/**
 * CheckpointPopup Component
 * 
 * Interactive modal for checkpoint questions. Pauses video playback and
 * requires user to answer correctly before continuing. Supports text-based
 * answers with case-insensitive validation.
 * 
 * @param {Object} props - Component props
 * @param {Object} props.checkpoint - Checkpoint data object
 * @param {string} props.checkpoint.title - Checkpoint title
 * @param {string} props.checkpoint.subtopic - Checkpoint description
 * @param {string} props.checkpoint.question - Question to answer
 * @param {string} props.checkpoint.answer - Correct answer
 * @param {Function} props.onCorrectAnswer - Callback when answer is correct
 * @param {Function} props.onAskTutor - Callback to open AI tutor chat
 * @returns {React.ReactElement} Checkpoint popup modal
 * 
 * @example
 * <CheckpointPopup
 *   checkpoint={{
 *     title: "Photosynthesis Definition",
 *     subtopic: "Understanding what photosynthesis is",
 *     question: "What is the primary purpose of photosynthesis?",
 *     answer: "To convert light energy into chemical energy"
 *   }}
 *   onCorrectAnswer={() => resumeVideo()}
 *   onAskTutor={() => openChat()}
 * />
 */
export default function CheckpointPopup({ checkpoint, onCorrectAnswer, onAskTutor }) {
  const [userAnswer, setUserAnswer] = useState('');
  const [isCorrect, setIsCorrect] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const timeoutRef = useRef(null);

  /**
   * Cleanup timeout on unmount
   */
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  /**
   * Handle Escape Key
   * Note: Checkpoints are mandatory, so Escape won't close the modal
   */
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        // Checkpoints are mandatory - Escape key does nothing
        // Could optionally show a message or highlight the requirement
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  /**
   * Validate User Answer
   * 
   * Checks if user's answer matches the correct answer (case-insensitive).
   * Trims whitespace and compares normalized strings.
   * 
   * @param {string} answer - User's answer
   * @returns {boolean} True if answer is correct
   */
  const validateAnswer = (answer) => {
    const normalizedUserAnswer = answer.trim().toLowerCase();
    const normalizedCorrectAnswer = checkpoint.answer.trim().toLowerCase();
    return normalizedUserAnswer === normalizedCorrectAnswer;
  };

  /**
   * Handle Submit Answer
   * 
   * Validates user's answer and shows appropriate feedback.
   * If correct, calls onCorrectAnswer callback to resume video.
   * If incorrect, shows feedback with Try Again and Ask Tutor options.
   */
  const handleSubmit = () => {
    if (!userAnswer.trim()) {
      return;
    }

    const correct = validateAnswer(userAnswer);
    setIsCorrect(correct);
    setShowFeedback(true);

    if (correct) {
      // Wait a moment to show success feedback, then resume
      timeoutRef.current = setTimeout(() => {
        onCorrectAnswer();
      }, 1500);
    }
  };

  /**
   * Handle Try Again
   * 
   * Resets the answer input and feedback state to allow another attempt.
   */
  const handleTryAgain = () => {
    setUserAnswer('');
    setIsCorrect(null);
    setShowFeedback(false);
  };

  /**
   * Handle Ask Tutor
   * 
   * Passes checkpoint context to AI tutor and opens chat interface.
   */
  const handleAskTutor = () => {
    onAskTutor(checkpoint);
  };

  /**
   * Handle Key Press
   * 
   * Allows Enter key to submit answer for better UX.
   * 
   * @param {KeyboardEvent} e - Keyboard event
   */
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !showFeedback) {
      handleSubmit();
    }
  };

  return (
    <div className="checkpoint-popup-overlay" role="dialog" aria-modal="true" aria-labelledby="checkpoint-title">
      <div className="checkpoint-popup-container">
        {/* Header */}
        <div className="checkpoint-popup-header">
          <div className="checkpoint-icon">🎯</div>
          <h2 className="checkpoint-title" id="checkpoint-title">{checkpoint.title}</h2>
        </div>

        {/* Content */}
        <div className="checkpoint-popup-content">
          <p className="checkpoint-subtopic">{checkpoint.subtopic}</p>
          
          <div className="checkpoint-question-section">
            <label className="checkpoint-question-label" htmlFor="checkpoint-answer-input">Question:</label>
            <p className="checkpoint-question">{checkpoint.question}</p>
          </div>

          {/* Answer Input */}
          {!showFeedback && (
            <div className="checkpoint-answer-section">
              <input
                type="text"
                id="checkpoint-answer-input"
                className="checkpoint-answer-input"
                placeholder="Type your answer here..."
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                onKeyPress={handleKeyPress}
                autoFocus
              />
            </div>
          )}

          {/* Feedback */}
          {showFeedback && (
            <div 
              className={`checkpoint-feedback ${isCorrect ? 'correct' : 'incorrect'}`}
              role="status"
              aria-live="polite"
            >
              {isCorrect ? (
                <>
                  <div className="feedback-icon">✅</div>
                  <p className="feedback-message">Great job! That's correct!</p>
                </>
              ) : (
                <>
                  <div className="feedback-icon">❌</div>
                  <p className="feedback-message">Not quite right. Try again or ask the AI tutor for help!</p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="checkpoint-popup-actions">
          {!showFeedback ? (
            <button 
              onClick={handleSubmit} 
              className="checkpoint-button checkpoint-button-primary"
              disabled={!userAnswer.trim()}
            >
              Submit Answer
            </button>
          ) : !isCorrect ? (
            <>
              <button 
                onClick={handleTryAgain} 
                className="checkpoint-button checkpoint-button-secondary"
              >
                Try Again
              </button>
              <button 
                onClick={handleAskTutor} 
                className="checkpoint-button checkpoint-button-tutor"
              >
                Ask AI Tutor
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
