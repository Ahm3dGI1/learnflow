/**
 * QuizResults Component
 * 
 * Displays quiz results showing score, correct/incorrect answers,
 * and explanations for each question.
 */
import './QuizResults.css';

export default function QuizResults({ results, onRetake, onBack }) {
  if (!results || !results.answers) {
    return (
      <div className="no-results">
        <p className="no-results-text">No results available.</p>
        <button
          onClick={onBack}
          className="btn-go-back"
        >
          Go Back
        </button>
      </div>
    );
  }

  const { score, totalQuestions, answers } = results;
  const percentage = Math.round((score / totalQuestions) * 100);

  // Determine performance level
  let performanceMessage = 'Keep practicing!';
  let performanceClass = 'keep-practicing';

  if (percentage >= 90) {
    performanceMessage = 'Outstanding work!';
    performanceClass = 'excellent';
  } else if (percentage >= 70) {
    performanceMessage = 'Great job!';
    performanceClass = 'great';
  } else if (percentage >= 50) {
    performanceMessage = 'Good effort!';
    performanceClass = 'good';
  }

  return (
    <div className="quiz-results-container">
      {/* Score Header */}
      <div className="quiz-header">
        <div className={`quiz-emoji-badge ${percentage >= 70 ? 'success' : 'default'}`}>
          <span>{percentage >= 70 ? '🎉' : '📚'}</span>
        </div>
        <h2 className="quiz-complete-title">Quiz Complete!</h2>
        <p className={`quiz-performance-message ${performanceClass}`}>{performanceMessage}</p>

        <div className="quiz-stats">
          <div className="quiz-stat-card">
            <span className="quiz-stat-label">Score</span>
            <span className="quiz-stat-value">{score} / {totalQuestions}</span>
          </div>
          <div className="quiz-stat-card">
            <span className="quiz-stat-label">Accuracy</span>
            <span className={`quiz-stat-value accuracy ${performanceClass}`}>{percentage}%</span>
          </div>
        </div>
      </div>

      {/* Action Buttons (Top) */}
      <div className="quiz-actions">
        <button
          onClick={onBack}
          className="btn-back"
        >
          ← Back to Video
        </button>
        <button
          onClick={onRetake}
          className="btn-try-again"
        >
          ↻ Try Again
        </button>
      </div>

      {/* Detailed Results */}
      <div className="quiz-results-section">
        <h3 className="quiz-results-title">Review Your Answers</h3>

        {answers.map((answer, index) => {
          return (
            <div
              key={answer.questionId}
              className={`quiz-question-card ${answer.isCorrect ? 'correct' : 'incorrect'}`}
            >
              {/* Question Header */}
              <div className="quiz-question-header">
                <div>
                  <span className="quiz-question-number">{index + 1}</span>
                  <h4 className="quiz-question-text">{answer.question}</h4>
                </div>
                <span className={`quiz-status-badge ${answer.isCorrect ? 'correct' : 'incorrect'}`}>
                  {answer.isCorrect ? 'Correct' : 'Incorrect'}
                </span>
              </div>

              {/* Options */}
              <div className="quiz-options">
                {answer.options.map((option, optionIndex) => {
                  const isUserAnswer = answer.userAnswer === optionIndex;
                  const isCorrectAnswer = answer.correctAnswer === optionIndex;

                  let optionClass = 'default';
                  let textClass = 'default';

                  if (isCorrectAnswer) {
                    optionClass = 'correct';
                    textClass = 'correct';
                  } else if (isUserAnswer && !isCorrectAnswer) {
                    optionClass = 'incorrect';
                    textClass = 'incorrect';
                  }

                  return (
                    <div key={optionIndex} className={`quiz-option ${optionClass}`}>
                      {/* Status Indicator Circle */}
                      <div className={`quiz-option-indicator ${isCorrectAnswer ? 'correct' : isUserAnswer ? 'incorrect' : 'neutral'}`} />

                      <div className="quiz-option-text">
                        <span className={textClass}>{option}</span>
                      </div>
                      {isUserAnswer && (
                        <span className="quiz-option-label">Your Answer</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Explanation */}
              {answer.explanation && (
                <div className="quiz-explanation">
                  <span className="quiz-explanation-label">Explanation:</span>
                  <span className="quiz-explanation-text">{answer.explanation}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Action (Duplicate for convenience) */}
      <div className="quiz-bottom-action">
        <button
          onClick={onRetake}
          className="btn-generate-more"
        >
          Retake Quiz
        </button>
      </div>
    </div>
  );
}

