/**
 * FlashcardPage Component
 *
 * Dedicated page for studying flashcards generated from video content.
 * Implements spaced repetition concepts with known/review tracking.
 *
 * Features:
 * - Generates flashcards from video transcript
 * - 3D flip animation for card reveal
 * - Mark as known or needs review
 * - Keyboard navigation support
 * - Study session results with statistics
 * - Shuffle and filter options
 *
 * @module FlashcardPage
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import Flashcard from '../components/Flashcard';
import FlashcardResults from '../components/FlashcardResults';
import { videoService, llmService } from '../services';
import './FlashcardPage.css';

/**
 * FlashcardPage Component
 *
 * Main flashcard study page that handles generation, navigation, and results.
 *
 * @returns {React.ReactElement} Flashcard page with study interface
 */
export default function FlashcardPage() {
    const { videoId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    // State
    const [video, setVideo] = useState(null);
    const [flashcards, setFlashcards] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [knownCards, setKnownCards] = useState(new Set());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showResults, setShowResults] = useState(false);
    const [isShuffled, setIsShuffled] = useState(false);
    const [studyMode, setStudyMode] = useState('all'); // 'all', 'review'

    /**
     * Shuffle array using Fisher-Yates algorithm
     */
    const shuffleArray = (array) => {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    };

    /**
     * Fetch video and generate flashcards
     */
    useEffect(() => {
        const fetchFlashcards = async () => {
            if (!videoId) {
                setError('No video ID provided');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);

                // Fetch video data
                const videoData = await videoService.getVideo(videoId);
                setVideo(videoData);

                // Check if transcript exists
                if (!videoData.transcript) {
                    setError('No transcript available for this video. Cannot generate flashcards.');
                    setLoading(false);
                    return;
                }

                // Generate flashcards
                const flashcardData = await llmService.generateFlashcards(
                    videoData.transcript,
                    { numCards: 10 }
                );

                setFlashcards(flashcardData.flashcards || []);
            } catch (err) {
                console.error('Error fetching flashcards:', err);
                setError(err.message || 'Failed to generate flashcards. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        fetchFlashcards();
    }, [videoId]);

    /**
     * Get active cards based on study mode
     */
    const getActiveCards = useCallback(() => {
        if (studyMode === 'review') {
            return flashcards.filter((_, index) => !knownCards.has(index));
        }
        return flashcards;
    }, [flashcards, knownCards, studyMode]);

    /**
     * Handle next card
     */
    const handleNext = useCallback(() => {
        const activeCards = getActiveCards();
        if (currentIndex < activeCards.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            // End of cards - show results
            setShowResults(true);
        }
    }, [currentIndex, getActiveCards]);

    /**
     * Handle previous card
     */
    const handlePrevious = useCallback(() => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    }, [currentIndex]);

    /**
     * Mark card as known
     */
    const handleMarkKnown = useCallback(() => {
        const activeCards = getActiveCards();
        const originalIndex = flashcards.indexOf(activeCards[currentIndex]);

        setKnownCards((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(originalIndex)) {
                newSet.delete(originalIndex);
            } else {
                newSet.add(originalIndex);
            }
            return newSet;
        });

        // Auto-advance after marking
        if (currentIndex < activeCards.length - 1) {
            setTimeout(() => handleNext(), 300);
        }
    }, [currentIndex, flashcards, getActiveCards, handleNext]);

    /**
     * Mark card for review (remove from known)
     */
    const handleMarkReview = useCallback(() => {
        const activeCards = getActiveCards();
        const originalIndex = flashcards.indexOf(activeCards[currentIndex]);

        setKnownCards((prev) => {
            const newSet = new Set(prev);
            newSet.delete(originalIndex);
            return newSet;
        });

        // Auto-advance after marking
        if (currentIndex < activeCards.length - 1) {
            setTimeout(() => handleNext(), 300);
        }
    }, [currentIndex, flashcards, getActiveCards, handleNext]);

    /**
     * Toggle shuffle
     */
    const handleShuffle = () => {
        if (isShuffled) {
            // Reset to original order
            // This would require storing original order - simplified here
            setIsShuffled(false);
        } else {
            setFlashcards(shuffleArray(flashcards));
            setCurrentIndex(0);
            setIsShuffled(true);
        }
    };

    /**
     * Restart study session with all cards
     */
    const handleRestart = () => {
        setCurrentIndex(0);
        setKnownCards(new Set());
        setShowResults(false);
        setStudyMode('all');
    };

    /**
     * Study only review cards
     */
    const handleReviewOnly = () => {
        setCurrentIndex(0);
        setShowResults(false);
        setStudyMode('review');
    };

    /**
     * Back to video
     */
    const handleBack = () => {
        navigate(`/video/${videoId}`);
    };

    // Loading state
    if (loading) {
        return (
            <div className="flashcard-page-container">
                <div className="flashcard-page-loading" role="status" aria-live="polite">
                    <div className="loading-cards">
                        <div className="loading-card card-1"></div>
                        <div className="loading-card card-2"></div>
                        <div className="loading-card card-3"></div>
                    </div>
                    <p>Creating flashcards...</p>
                    <span className="loading-tip">Pro tip: Use keyboard arrows to navigate!</span>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="flashcard-page-container">
                <div className="flashcard-page-error">
                    <span className="error-icon">📚</span>
                    <h2>Unable to Load Flashcards</h2>
                    <p>{error}</p>
                    <button onClick={handleBack} className="back-button">
                        ← Back to Video
                    </button>
                </div>
            </div>
        );
    }

    // No flashcards
    if (flashcards.length === 0) {
        return (
            <div className="flashcard-page-container">
                <div className="flashcard-page-error">
                    <span className="error-icon">🃏</span>
                    <h2>No Flashcards Available</h2>
                    <p>We couldn't generate flashcards for this video. The content may be too short or not suitable for flashcard generation.</p>
                    <button onClick={handleBack} className="back-button">
                        ← Back to Video
                    </button>
                </div>
            </div>
        );
    }

    const activeCards = getActiveCards();
    const currentCard = activeCards[currentIndex];
    const originalIndex = flashcards.indexOf(currentCard);

    return (
        <div className="flashcard-page-container">
            {/* Header */}
            <header className="flashcard-page-header">
                <button onClick={handleBack} className="back-button">
                    ← Back to Video
                </button>
                <div className="video-title-section">
                    <h1>🃏 Flashcards</h1>
                    <span className="video-title">{video?.title}</span>
                </div>
                <div className="header-actions">
                    <button
                        className={`shuffle-btn ${isShuffled ? 'active' : ''}`}
                        onClick={handleShuffle}
                        aria-label="Shuffle cards"
                        title="Shuffle cards"
                    >
                        🔀
                    </button>
                    <span className="user-email">{user?.email}</span>
                </div>
            </header>

            {/* Main Content */}
            <div className="flashcard-page-content">
                {showResults ? (
                    <FlashcardResults
                        totalCards={flashcards.length}
                        knownCards={knownCards.size}
                        reviewCards={flashcards.length - knownCards.size}
                        onRestart={handleRestart}
                        onReviewOnly={handleReviewOnly}
                        onBack={handleBack}
                    />
                ) : (
                    <>
                        {/* Study mode indicator */}
                        {studyMode === 'review' && (
                            <div className="study-mode-banner">
                                <span>📝 Review Mode</span> - Studying {activeCards.length} cards that need review
                            </div>
                        )}

                        {/* Flashcard */}
                        {currentCard && (
                            <Flashcard
                                card={currentCard}
                                index={currentIndex}
                                total={activeCards.length}
                                onNext={handleNext}
                                onPrevious={handlePrevious}
                                onMarkKnown={handleMarkKnown}
                                onMarkReview={handleMarkReview}
                                isKnown={knownCards.has(originalIndex)}
                            />
                        )}

                        {/* Quick stats */}
                        <div className="quick-stats">
                            <div className="stat known">
                                <span className="stat-value">{knownCards.size}</span>
                                <span className="stat-label">Known</span>
                            </div>
                            <div className="stat review">
                                <span className="stat-value">{flashcards.length - knownCards.size}</span>
                                <span className="stat-label">To Review</span>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
