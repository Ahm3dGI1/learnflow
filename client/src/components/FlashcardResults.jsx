/**
 * FlashcardResults Component
 *
 * Displays study session results with statistics and encouragement.
 * Shows cards known vs cards to review with visual breakdown.
 *
 * @component
 */

import './FlashcardResults.css';

/**
 * FlashcardResults Component
 *
 * @param {Object} props - Component props
 * @param {number} props.totalCards - Total number of cards studied
 * @param {number} props.knownCards - Number of cards marked as known
 * @param {number} props.reviewCards - Number of cards for review
 * @param {Function} props.onRestart - Callback to restart with all cards
 * @param {Function} props.onReviewOnly - Callback to study only review cards
 * @param {Function} props.onBack - Callback to go back
 * @returns {React.ReactElement} Results display
 */
export default function FlashcardResults({
    totalCards,
    knownCards,
    reviewCards,
    onRestart,
    onReviewOnly,
    onBack,
}) {
    const masteryPercentage = Math.round((knownCards / totalCards) * 100);

    // Determine encouragement message
    const getMessage = () => {
        if (masteryPercentage === 100) {
            return {
                emoji: '🏆',
                title: 'Perfect Mastery!',
                subtitle: "You've mastered all the cards. Amazing work!",
            };
        } else if (masteryPercentage >= 80) {
            return {
                emoji: '🌟',
                title: 'Excellent Progress!',
                subtitle: "You're almost there. Just a few more to review.",
            };
        } else if (masteryPercentage >= 60) {
            return {
                emoji: '💪',
                title: 'Good Job!',
                subtitle: 'Keep practicing to strengthen your knowledge.',
            };
        } else if (masteryPercentage >= 40) {
            return {
                emoji: '📚',
                title: 'Keep Going!',
                subtitle: "You're making progress. Review the cards you missed.",
            };
        } else {
            return {
                emoji: '🚀',
                title: "Let's Practice More!",
                subtitle: 'Learning takes time. Review the cards again.',
            };
        }
    };

    const { emoji, title, subtitle } = getMessage();

    return (
        <div className="flashcard-results">
            {/* Header */}
            <div className="results-header">
                <span className="results-emoji">{emoji}</span>
                <h2 className="results-title">{title}</h2>
                <p className="results-subtitle">{subtitle}</p>
            </div>

            {/* Stats Circle */}
            <div className="results-circle-container">
                <div className="results-circle">
                    <svg viewBox="0 0 100 100" className="circle-svg">
                        <circle
                            cx="50"
                            cy="50"
                            r="45"
                            fill="none"
                            stroke="#e0e0e0"
                            strokeWidth="8"
                        />
                        <circle
                            cx="50"
                            cy="50"
                            r="45"
                            fill="none"
                            stroke="url(#gradient)"
                            strokeWidth="8"
                            strokeLinecap="round"
                            strokeDasharray={`${masteryPercentage * 2.83} 283`}
                            transform="rotate(-90 50 50)"
                            className="progress-circle"
                        />
                        <defs>
                            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#667eea" />
                                <stop offset="100%" stopColor="#764ba2" />
                            </linearGradient>
                        </defs>
                    </svg>
                    <div className="circle-content">
                        <span className="circle-percentage">{masteryPercentage}%</span>
                        <span className="circle-label">Mastered</span>
                    </div>
                </div>
            </div>

            {/* Breakdown */}
            <div className="results-breakdown">
                <div className="breakdown-item known">
                    <span className="breakdown-icon">✓</span>
                    <span className="breakdown-label">Cards Known</span>
                    <span className="breakdown-value">{knownCards}</span>
                </div>
                <div className="breakdown-item review">
                    <span className="breakdown-icon">🔄</span>
                    <span className="breakdown-label">Need Review</span>
                    <span className="breakdown-value">{reviewCards}</span>
                </div>
                <div className="breakdown-item total">
                    <span className="breakdown-icon">📚</span>
                    <span className="breakdown-label">Total Cards</span>
                    <span className="breakdown-value">{totalCards}</span>
                </div>
            </div>

            {/* Actions */}
            <div className="results-actions">
                {reviewCards > 0 && (
                    <button className="results-btn primary" onClick={onReviewOnly}>
                        <span className="btn-icon">🔄</span>
                        Review {reviewCards} Card{reviewCards > 1 ? 's' : ''}
                    </button>
                )}
                <button className="results-btn secondary" onClick={onRestart}>
                    <span className="btn-icon">🔁</span>
                    Study All Cards
                </button>
                <button className="results-btn tertiary" onClick={onBack}>
                    ← Back to Video
                </button>
            </div>

            {/* Tips */}
            <div className="results-tips">
                <h4>💡 Learning Tips</h4>
                <ul>
                    <li>Review difficult cards more frequently (spaced repetition)</li>
                    <li>Try to explain concepts in your own words</li>
                    <li>Take breaks between study sessions</li>
                </ul>
            </div>
        </div>
    );
}
