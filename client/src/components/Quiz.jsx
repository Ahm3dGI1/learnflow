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
    <div className="w-full">
      {/* Quiz Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
            <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7 text-white" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-3xl text-gray-900 font-bold">Quiz Time</h2>
        </div>
        <p className="text-gray-600">
          Test your understanding of the video content
        </p>
      </div>

      {/* Progress */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-gray-700">
            {answeredCount} of {totalCount} questions answered
          </span>
          <span className="text-sm text-blue-600">
            {totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0}%
          </span>
        </div>
        <div className="h-2.5 backdrop-blur-xl bg-white/60 rounded-full overflow-hidden border border-white/80 shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full relative shadow-lg shadow-blue-500/30 transition-all duration-500"
            style={{ width: `${(answeredCount / totalCount) * 100}%` }}
            role="progressbar"
            aria-valuenow={answeredCount}
            aria-valuemin="0"
            aria-valuemax={totalCount}
            aria-label={`${answeredCount} of ${totalCount} questions answered`}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/40 to-white/0 animate-shimmer"></div>
          </div>
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-8">
        {quiz.questions.map((question, index) => (
          <div
            key={question.id}
            className="backdrop-blur-xl bg-white/60 border border-white/60 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow"
          >
            {/* Question Number Badge */}
            <div className="inline-flex items-center gap-2 mb-5">
              <div className="px-5 py-1.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-full text-sm font-bold shadow-lg shadow-blue-500/30">
                Question {index + 1}
              </div>
            </div>

            <h3 className="text-gray-900 mb-6 text-xl font-medium leading-relaxed">{question.question}</h3>

            <div className="space-y-3" role="radiogroup" aria-labelledby={`question-${question.id}`}>
              {question.options.map((option, optionIndex) => {
                const isSelected = selectedAnswers[question.id] === optionIndex;

                return (
                  <label
                    key={optionIndex}
                    htmlFor={`q${question.id}-option${optionIndex}`}
                    className={`w-full group flex items-center gap-4 p-4 rounded-xl border transition-all text-left cursor-pointer ${isSelected
                      ? 'backdrop-blur-xl bg-white border-blue-500 shadow-md ring-1 ring-blue-500'
                      : 'backdrop-blur-xl bg-white/50 border-white/80 hover:bg-white/80 hover:border-blue-300 shadow-sm hover:shadow-md'
                      }`}
                  >
                    <input
                      type="radio"
                      id={`q${question.id}-option${optionIndex}`}
                      name={`question-${question.id}`}
                      value={optionIndex}
                      checked={isSelected}
                      onChange={() => handleAnswerSelect(question.id, optionIndex)}
                      disabled={loading}
                      className="sr-only"
                      aria-label={`Option: ${option}`}
                    />

                    <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-300 bg-transparent group-hover:border-blue-400'
                      }`}>
                      {isSelected && (
                        <div className="w-2.5 h-2.5 bg-white rounded-full" />
                      )}
                    </div>
                    <span className={`transition-colors font-medium text-base ${isSelected
                      ? 'text-gray-900'
                      : 'text-gray-600 group-hover:text-gray-900'
                      }`}>
                      {option}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-10 flex flex-col items-center">
        {!allAnswered && (
          <p className="text-amber-600 mb-3 text-sm font-medium" role="alert" aria-live="polite">
            Please answer all questions before submitting
          </p>
        )}
        <button
          onClick={handleSubmit}
          disabled={!allAnswered || loading}
          aria-label={loading ? 'Submitting quiz...' : 'Submit quiz'}
          className="group px-10 py-4 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 border-none text-white rounded-2xl shadow-xl shadow-blue-500/30 hover:shadow-2xl hover:shadow-blue-500/40 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          <span className="flex items-center gap-2 font-bold text-lg">
            {loading ? 'Submitting...' : 'Submit Quiz'}
            {!loading && (
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 group-hover:scale-110 transition-transform" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </span>
        </button>
      </div>
    </div>
  );
}
