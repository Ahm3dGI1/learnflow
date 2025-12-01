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
  const [selectedOption, setSelectedOption] = useState(null);
  const [isCorrect, setIsCorrect] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const timeoutRef = useRef(null);
  const isMountedRef = useRef(true);

  /**
   * Track component mount state and cleanup timeout on unmount
   */
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  /**
   * Validate User Answer
   *
   * Checks if selected option matches the correct answer.
   *
   * @param {string} option - Selected option
   * @returns {boolean} True if answer is correct
   */
  const validateAnswer = (option) => {
    return option === checkpoint.correctAnswer;
  };

  /**
   * Handle Submit Answer
   *
   * Validates user's selected option and shows appropriate feedback.
   * If correct, calls onCorrectAnswer callback to resume video.
   * If incorrect, shows feedback with Try Again and Ask Tutor options.
   */
  const handleSubmit = () => {
    if (!selectedOption) {
      return;
    }

    try {
      // Validate checkpoint has required fields
      if (!checkpoint || !checkpoint.correctAnswer) {
        console.error('Checkpoint missing required fields:', checkpoint);
        setIsCorrect(false);
        setShowFeedback(true);
        return;
      }

      const correct = validateAnswer(selectedOption);
      setIsCorrect(correct);
      setShowFeedback(true);

      if (correct) {
        // Wait a moment to show success feedback, then resume
        timeoutRef.current = setTimeout(() => {
          // Only call onCorrectAnswer if component is still mounted
          if (isMountedRef.current && onCorrectAnswer) {
            try {
              onCorrectAnswer();
            } catch (error) {
              console.error('Error calling onCorrectAnswer callback:', error);
            }
          }
        }, 2000); // Longer delay to show explanation
      }
    } catch (error) {
      console.error('Error validating answer:', error);
      setIsCorrect(false);
      setShowFeedback(true);
    }
  };

  /**
   * Handle Try Again
   *
   * Resets the selected option and feedback state to allow another attempt.
   */
  const handleTryAgain = () => {
    setSelectedOption(null);
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
            <label className="checkpoint-question-label">Question:</label>
            <p className="checkpoint-question">{checkpoint.question}</p>
          </div>

          {/* MCQ Options */}
          {!showFeedback && checkpoint.options && (
            <div className="checkpoint-options-section">
              {checkpoint.options.map((option, index) => (
                <button
                  key={index}
                  className={`checkpoint-option ${selectedOption === option ? 'selected' : ''}`}
                  onClick={() => setSelectedOption(option)}
                >
                  <span className="option-letter">{String.fromCharCode(65 + index)}</span>
                  <span className="option-text">{option}</span>
                </button>
              ))}
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
                  {checkpoint.explanation && (
                    <p className="feedback-explanation">{checkpoint.explanation}</p>
                  )}
                </>
              ) : (
                <>
                  <div className="feedback-icon">❌</div>
                  <p className="feedback-message">Not quite right. Try again or ask the AI tutor for help!</p>
                  <p className="feedback-hint">The correct answer is: <strong>{checkpoint.correctAnswer}</strong></p>
                  {checkpoint.explanation && (
                    <p className="feedback-explanation">{checkpoint.explanation}</p>
                  )}
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
              disabled={!selectedOption}
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
