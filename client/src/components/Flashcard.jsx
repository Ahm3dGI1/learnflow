/**
 * Flashcard Component
 *
 * Individual flashcard with smooth 3D flip animation.
 * Front shows the concept/question, back shows the answer/explanation.
 * Supports keyboard navigation and accessibility.
 *
 * @component
 */

import { useState } from 'react';
import './Flashcard.css';

/**
 * Flashcard Component
 *
 * @param {Object} props - Component props
 * @param {Object} props.card - Flashcard data
 * @param {string} props.card.front - Front text (question/concept)
 * @param {string} props.card.back - Back text (answer/explanation)
 * @param {string} props.card.category - Category tag
 * @param {number} props.index - Current card index
 * @param {number} props.total - Total number of cards
 * @param {Function} props.onNext - Callback for next card
 * @param {Function} props.onPrevious - Callback for previous card
 * @param {Function} props.onMarkKnown - Callback when marked as known
 * @param {Function} props.onMarkReview - Callback when marked for review
 * @param {boolean} props.isKnown - Whether card is marked as known
 * @returns {React.ReactElement} Flashcard component
 */
export default function Flashcard({
    card,
    index,
    total,
    onNext,
    onPrevious,
    onMarkKnown,
    onMarkReview,
    isKnown = false,
}) {
    const [isFlipped, setIsFlipped] = useState(false);

    /**
     * Handle card flip
     */
    const handleFlip = () => {
        setIsFlipped(!isFlipped);
    };

    /**
     * Handle keyboard navigation
     */
    const handleKeyDown = (e) => {
        switch (e.key) {
            case ' ':
            case 'Enter':
                e.preventDefault();
                handleFlip();
                break;
            case 'ArrowLeft':
                e.preventDefault();
                if (onPrevious) onPrevious();
                break;
            case 'ArrowRight':
                e.preventDefault();
                if (onNext) onNext();
                break;
            case 'k':
            case 'K':
                e.preventDefault();
                if (onMarkKnown) onMarkKnown();
                break;
            case 'r':
            case 'R':
                e.preventDefault();
                if (onMarkReview) onMarkReview();
                break;
            default:
                break;
        }
    };

    // Reset flip state when card changes
    const handleCardChange = (callback) => {
        setIsFlipped(false);
        if (callback) callback();
    };

    if (!card) {
        return (
            <div className="flashcard-empty">
                <p>No flashcard data available</p>
            </div>
        );
    }

    return (
        <div className="flashcard-wrapper">
            {/* Progress indicator */}
            <div className="flashcard-progress">
                <span className="progress-text">
                    Card {index + 1} of {total}
                </span>
                <div className="progress-bar">
                    <div
                        className="progress-fill"
                        style={{ width: `${((index + 1) / total) * 100}%` }}
                        role="progressbar"
                        aria-valuenow={index + 1}
                        aria-valuemin="1"
                        aria-valuemax={total}
                    />
                </div>
            </div>

            {/* Category tag */}
            {card.category && (
                <div className="flashcard-category">
                    <span className="category-tag">{card.category}</span>
                </div>
            )}

            {/* Flashcard */}
            <div
                className={`flashcard ${isFlipped ? 'flipped' : ''} ${isKnown ? 'known' : ''}`}
                onClick={handleFlip}
                onKeyDown={handleKeyDown}
                tabIndex={0}
                role="button"
                aria-label={`Flashcard ${index + 1} of ${total}. Press space or enter to flip.`}
            >
                <div className="flashcard-inner">
                    {/* Front of card */}
                    <div className="flashcard-front">
                        <div className="card-content">
                            <div className="card-label">Question</div>
                            <p className="card-text">{card.front}</p>
                        </div>
                        <div className="flip-hint">
                            <span>Click to reveal answer</span>
                            <svg className="flip-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M17 1l4 4-4 4" />
                                <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                                <path d="M7 23l-4-4 4-4" />
                                <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                            </svg>
                        </div>
                    </div>

                    {/* Back of card */}
                    <div className="flashcard-back">
                        <div className="card-content">
                            <div className="card-label">Answer</div>
                            <p className="card-text">{card.back}</p>
                            {card.hint && (
                                <div className="card-hint">
                                    <span className="hint-label">💡 Tip:</span> {card.hint}
                                </div>
                            )}
                        </div>
                        <div className="flip-hint">
                            <span>Click to see question</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Action buttons */}
            <div className="flashcard-actions">
                <button
                    className="action-btn review-btn"
                    onClick={() => handleCardChange(onMarkReview)}
                    disabled={!onMarkReview}
                    aria-label="Mark for review (R)"
                >
                    <span className="btn-icon">🔄</span>
                    <span className="btn-text">Review Again</span>
                    <span className="btn-shortcut">R</span>
                </button>

                <button
                    className={`action-btn known-btn ${isKnown ? 'active' : ''}`}
                    onClick={() => handleCardChange(onMarkKnown)}
                    disabled={!onMarkKnown}
                    aria-label="Mark as known (K)"
                >
                    <span className="btn-icon">✓</span>
                    <span className="btn-text">{isKnown ? 'Known!' : 'Got it!'}</span>
                    <span className="btn-shortcut">K</span>
                </button>
            </div>

            {/* Navigation */}
            <div className="flashcard-navigation">
                <button
                    className="nav-btn prev-btn"
                    onClick={() => handleCardChange(onPrevious)}
                    disabled={index === 0}
                    aria-label="Previous card (Left Arrow)"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M15 18l-6-6 6-6" />
                    </svg>
                    <span>Previous</span>
                </button>

                <div className="keyboard-hints">
                    <span>← → Navigate</span>
                    <span>Space Flip</span>
                </div>

                <button
                    className="nav-btn next-btn"
                    onClick={() => handleCardChange(onNext)}
                    disabled={index === total - 1}
                    aria-label="Next card (Right Arrow)"
                >
                    <span>Next</span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 18l6-6-6-6" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
