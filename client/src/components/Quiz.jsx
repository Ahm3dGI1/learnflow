/**
 * Quiz Component
 * 
 * Displays quiz questions with multiple choice options.
 * Shows all questions at once for the user to complete and submit.
 * 
 * @component
 * @example
 * const quiz = {
 *   questions: [
 *     {
 *       id: 1,
 *       question: "What is photosynthesis?",
 *       options: ["A", "B", "C", "D"],
 *       correctAnswer: 0
 *     }
 *   ]
 * };
 * <Quiz quiz={quiz} onSubmit={handleSubmit} />
 */

import { useState } from 'react';
import './Quiz.css';

/**
 * Quiz Component
 * 
 * @param {Object} props - Component props
 * @param {Object} props.quiz - Quiz data object
 * @param {Array} props.quiz.questions - Array of question objects
 * @param {Function} props.onSubmit - Callback when quiz is submitted with answers
 * @param {boolean} props.loading - Whether quiz is being submitted
 * @returns {React.ReactElement} Quiz component
 */
export default function Quiz({ quiz, onSubmit, loading = false }) {
  // Track selected answer for each question (questionId -> optionIndex)
  const [selectedAnswers, setSelectedAnswers] = useState({});

  /**
   * Handle answer selection
   * @param {number} questionId - ID of the question
   * @param {number} optionIndex - Index of selected option (0-3)
   */
  const handleAnswerSelect = (questionId, optionIndex) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: optionIndex
    }));
  };

  /**
   * Check if all questions have been answered
   * @returns {boolean} True if all questions answered
   */
  const isAllAnswered = () => {
    return quiz.questions.every(q => selectedAnswers[q.id] !== undefined);
  };

  /**
   * Handle quiz submission
   */
  const handleSubmit = () => {
    if (!isAllAnswered()) {
      return;
    }

    // Convert selectedAnswers object to array format for backend
    const answers = quiz.questions.map(q => ({
      questionId: q.id,
      selectedAnswer: selectedAnswers[q.id]
    }));

    onSubmit(answers);
  };

  if (!quiz || !quiz.questions || quiz.questions.length === 0) {
    return (
      <div className="quiz-container">
        <div className="quiz-empty">
          <p>No quiz questions available.</p>
        </div>
      </div>
    );
  }

  const answeredCount = Object.keys(selectedAnswers).length;
  const totalCount = quiz.questions.length;
  const allAnswered = isAllAnswered();

  return (
    <div className="quiz-container">
      <div className="quiz-header">
        <h2>📝 Quiz Time</h2>
        <p className="quiz-subtitle">
          Test your understanding of the video content
        </p>
        <div className="quiz-progress">
          <span className="progress-text">
            {answeredCount} of {totalCount} questions answered
          </span>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${(answeredCount / totalCount) * 100}%` }}
              role="progressbar"
              aria-valuenow={answeredCount}
              aria-valuemin="0"
              aria-valuemax={totalCount}
              aria-label={`${answeredCount} of ${totalCount} questions answered`}
            />
          </div>
        </div>
      </div>

      <div className="quiz-questions">
        {quiz.questions.map((question, index) => (
          <div 
            key={question.id} 
            className={`question-card ${selectedAnswers[question.id] !== undefined ? 'answered' : ''}`}
          >
            <div className="question-number">Question {index + 1}</div>
            <h3 className="question-text">{question.question}</h3>
            
            <div className="options-container" role="radiogroup" aria-labelledby={`question-${question.id}`}>
              {question.options.map((option, optionIndex) => {
                const isSelected = selectedAnswers[question.id] === optionIndex;
                const optionLetter = String.fromCharCode(65 + optionIndex); // A, B, C, D
                
                return (
                  <label
                    key={optionIndex}
                    className={`option-label ${isSelected ? 'selected' : ''}`}
                    htmlFor={`q${question.id}-option${optionIndex}`}
                  >
                    <input
                      type="radio"
                      id={`q${question.id}-option${optionIndex}`}
                      name={`question-${question.id}`}
                      value={optionIndex}
                      checked={isSelected}
                      onChange={() => handleAnswerSelect(question.id, optionIndex)}
                      disabled={loading}
                      aria-label={`Option ${optionLetter}: ${option}`}
                    />
                    <span className="option-letter">{optionLetter}</span>
                    <span className="option-text">{option}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="quiz-footer">
        {!allAnswered && (
          <p className="quiz-warning" role="alert" aria-live="polite">
            Please answer all questions before submitting
          </p>
        )}
        <button
          className="quiz-submit-button"
          onClick={handleSubmit}
          disabled={!allAnswered || loading}
          aria-label={loading ? 'Submitting quiz...' : 'Submit quiz'}
        >
          {loading ? 'Submitting...' : 'Submit Quiz'}
        </button>
      </div>
    </div>
  );
}
