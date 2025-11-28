/**
 * QuizResults Component
 * 
 * Displays quiz results showing score, correct/incorrect answers,
 * and explanations for each question.
 * 
 * @component
 * @example
 * const results = {
 *   score: 8,
 *   totalQuestions: 10,
 *   answers: [
 *     {
 *       questionId: 1,
 *       question: "What is photosynthesis?",
 *       options: ["A", "B", "C", "D"],
 *       userAnswer: 0,
 *       correctAnswer: 0,
 *       isCorrect: true,
 *       explanation: "..."
 *     }
 *   ]
 * };
 * <QuizResults results={results} onRetake={handleRetake} onBack={handleBack} />
 */

import './QuizResults.css';

/**
 * QuizResults Component
 * 
 * @param {Object} props - Component props
 * @param {Object} props.results - Quiz results data
 * @param {number} props.results.score - Number of correct answers
 * @param {number} props.results.totalQuestions - Total number of questions
 * @param {Array} props.results.answers - Array of answer details
 * @param {Function} props.onRetake - Callback to retake the quiz
 * @param {Function} props.onBack - Callback to go back to video
 * @returns {React.ReactElement} QuizResults component
 */
export default function QuizResults({ results, onRetake, onBack }) {
  if (!results || !results.answers) {
    return (
      <div className="quiz-results-container">
        <div className="results-empty">
          <p>No results available.</p>
        </div>
      </div>
    );
  }

  const { score, totalQuestions, answers } = results;
  const percentage = Math.round((score / totalQuestions) * 100);
  
  // Determine performance level
  let performanceLevel = 'needs-improvement';
  let performanceMessage = 'Keep practicing!';
  let performanceEmoji = '📚';
  
  if (percentage >= 90) {
    performanceLevel = 'excellent';
    performanceMessage = 'Outstanding work!';
    performanceEmoji = '🌟';
  } else if (percentage >= 70) {
    performanceLevel = 'good';
    performanceMessage = 'Great job!';
    performanceEmoji = '🎉';
  } else if (percentage >= 50) {
    performanceLevel = 'fair';
    performanceMessage = 'Good effort!';
    performanceEmoji = '👍';
  }

  return (
    <div className="quiz-results-container">
      {/* Score Summary */}
      <div className={`results-header ${performanceLevel}`}>
        <div className="score-emoji">{performanceEmoji}</div>
        <h2>Quiz Complete!</h2>
        <div className="score-display">
          <div className="score-number">
            {score} / {totalQuestions}
          </div>
          <div className="score-percentage">{percentage}%</div>
        </div>
        <p className="performance-message">{performanceMessage}</p>
      </div>

      {/* Detailed Results */}
      <div className="results-details">
        <h3>Review Your Answers</h3>
        
        <div className="answers-list">
          {answers.map((answer, index) => {
            const optionLetters = ['A', 'B', 'C', 'D'];
            
            return (
              <div 
                key={answer.questionId} 
                className={`answer-card ${answer.isCorrect ? 'correct' : 'incorrect'}`}
              >
                <div className="answer-header">
                  <span className="question-number">Question {index + 1}</span>
                  <span className={`answer-badge ${answer.isCorrect ? 'correct' : 'incorrect'}`}>
                    {answer.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                  </span>
                </div>

                <h4 className="answer-question">{answer.question}</h4>

                <div className="answer-options">
                  {answer.options.map((option, optionIndex) => {
                    const isUserAnswer = answer.userAnswer === optionIndex;
                    const isCorrectAnswer = answer.correctAnswer === optionIndex;
                    
                    let optionClass = 'answer-option';
                    if (isCorrectAnswer) {
                      optionClass += ' correct-answer';
                    }
                    if (isUserAnswer && !isCorrectAnswer) {
                      optionClass += ' wrong-answer';
                    }
                    
                    return (
                      <div key={optionIndex} className={optionClass}>
                        <span className="option-letter">{optionLetters[optionIndex]}</span>
                        <span className="option-text">{option}</span>
                        {isUserAnswer && (
                          <span className="option-indicator">Your answer</span>
                        )}
                        {isCorrectAnswer && (
                          <span className="option-indicator correct">Correct answer</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {answer.explanation && (
                  <div className="answer-explanation">
                    <strong>Explanation:</strong> {answer.explanation}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="results-actions">
        <button className="back-button" onClick={onBack}>
          ← Back to Video
        </button>
        <button className="retake-button" onClick={onRetake}>
          🔄 Retake Quiz
        </button>
      </div>
    </div>
  );
}
