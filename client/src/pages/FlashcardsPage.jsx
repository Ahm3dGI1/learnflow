/**
 * Flashcards Page Component
 * 
 * Dedicated page for flashcard learning experience. Generates flashcards from
 * video content using AI, provides interactive learning interface, and tracks
 * user progress with spaced repetition algorithms.
 * 
 * Features:
 * - Generate flashcards from video transcript
 * - Interactive flashcard deck with flip animations
 * - Progress tracking and performance analytics
 * - Spaced repetition for optimal learning
 * - Return to video integration
 * 
 * @module FlashcardsPage
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Zap, Brain, BookOpen, Target } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import useToast from '../hooks/useToast';
import FlashcardDeck from '../components/FlashcardDeck';
import { videoService, llmService, flashcardService } from '../services';
import { isFeatureEnabled } from '../config/featureFlags';
import './FlashcardsPage.css';

/**
 * FlashcardsPage Component
 * 
 * Main page component for flashcard learning experience. Fetches video data,
 * generates flashcards using AI, and provides interactive learning interface.
 * 
 * @returns {React.ReactElement} Flashcards page with generation and learning interface
 */
export default function FlashcardsPage() {
  const { videoId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const [video, setVideo] = useState(null);
  const [flashcards, setFlashcards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [sessionProgress, setSessionProgress] = useState(null);

  // Check if flashcards are enabled
  if (!isFeatureEnabled('FLASHCARDS_ENABLED') || !flashcardService) {
    return (
      <div className="flashcards-disabled">
        <div className="disabled-message">
          <Brain size={48} />
          <h2>Flashcards Feature Disabled</h2>
          <p>The flashcards feature is currently disabled. Please contact your administrator to enable it.</p>
          <button 
            onClick={() => navigate(`/video/${videoId}`)}
            className="back-button"
          >
            <ArrowLeft size={16} />
            Back to Video
          </button>
        </div>
      </div>
    );
  }

  /**
   * Fetch Video Data
   */
  useEffect(() => {
    const fetchVideo = async () => {
      if (!videoId) {
        setError('No video ID provided');
        setLoading(false);
        return;
      }

      try {
        const videoData = await videoService.getVideo(videoId);
        setVideo(videoData);
        
        // Check if flashcards already exist
        if (videoData.flashcards && videoData.flashcards.length > 0) {
          setFlashcards(videoData.flashcards);
        }
      } catch (err) {
        console.error('Failed to fetch video:', err);
        setError('Failed to load video data');
        toast.error('Failed to load video data');
      } finally {
        setLoading(false);
      }
    };

    fetchVideo();
  }, [videoId, toast]);

  /**
   * Generate Flashcards from Video Content
   */
  const handleGenerateFlashcards = async () => {
    if (!video || !user) return;

    setGenerating(true);
    try {
      const generatedFlashcards = await llmService.generateFlashcards(
        user.uid, 
        videoId, 
        {
          count: 10, // Generate 10 flashcards
          difficulty: 'mixed', // Mix of easy, medium, hard
          includeDefinitions: true,
          includeConcepts: true
        }
      );

      setFlashcards(generatedFlashcards);
      toast.success(`Generated ${generatedFlashcards.length} flashcards!`);
    } catch (err) {
      console.error('Failed to generate flashcards:', err);
      toast.error('Failed to generate flashcards. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  /**
   * Handle Flashcard Deck Completion
   */
  const handleDeckComplete = (results) => {
    const { stats, duration } = results;
    const accuracy = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;

    // Save session results
    setSessionProgress({
      accuracy: accuracy.toFixed(1),
      duration,
      totalCards: stats.total,
      correctAnswers: stats.correct
    });

    // Show completion toast
    toast.success(`Great job! ${accuracy.toFixed(1)}% accuracy in ${formatDuration(duration)}`);

    // TODO: Save progress to backend for spaced repetition
  };

  /**
   * Handle Individual Card Progress
   */
  const handleCardProgress = (progressData) => {
    // TODO: Track individual card performance for spaced repetition algorithm
    console.log('Card progress:', progressData);
  };

  /**
   * Format Duration Helper
   */
  const formatDuration = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  /**
   * Return to Video
   */
  const handleReturnToVideo = () => {
    navigate(`/video/${videoId}`);
  };

  // Loading state
  if (loading) {
    return (
      <div className="flashcards-page loading">
        <div className="loading-content">
          <Brain className="loading-icon animate-pulse" />
          <h2>Loading flashcard system...</h2>
          <p>Preparing your learning experience</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flashcards-page error">
        <div className="error-content">
          <div className="error-icon">⚠️</div>
          <h2>Something went wrong</h2>
          <p>{error}</p>
          <button 
            className="return-btn"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft className="btn-icon" />
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flashcards-page">
      {/* Header */}
      <header className="flashcards-header">
        <button 
          className="back-btn"
          onClick={handleReturnToVideo}
          aria-label="Return to video"
        >
          <ArrowLeft className="back-icon" />
          Back to Video
        </button>
        
        <div className="header-info">
          <h1 className="page-title">
            <BookOpen className="title-icon" />
            Flashcards
          </h1>
          {video && (
            <p className="video-title">{video.title}</p>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flashcards-content">
        {flashcards.length === 0 ? (
          /* Generation State */
          <div className="generation-section">
            <div className="generation-content">
              <div className="generation-icon">
                <Zap className="icon" />
              </div>
              
              <h2>Generate AI Flashcards</h2>
              <p>
                Create personalized flashcards from this video's content to reinforce
                your learning with spaced repetition.
              </p>
              
              <div className="generation-features">
                <div className="feature">
                  <Target className="feature-icon" />
                  <span>Personalized difficulty levels</span>
                </div>
                <div className="feature">
                  <Brain className="feature-icon" />
                  <span>AI-powered question generation</span>
                </div>
                <div className="feature">
                  <RefreshCw className="feature-icon" />
                  <span>Spaced repetition algorithm</span>
                </div>
              </div>
              
              <button 
                className="generate-btn"
                onClick={handleGenerateFlashcards}
                disabled={generating || !video}
              >
                {generating ? (
                  <>
                    <RefreshCw className="btn-icon animate-spin" />
                    Generating flashcards...
                  </>
                ) : (
                  <>
                    <Zap className="btn-icon" />
                    Generate Flashcards
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Flashcard Deck */
          <div className="deck-section">
            <FlashcardDeck
              flashcards={flashcards}
              title={`${video?.title || 'Video'} - Flashcards`}
              onComplete={handleDeckComplete}
              onProgress={handleCardProgress}
              showProgress={true}
            />
            
            {/* Regenerate Option */}
            <div className="deck-actions">
              <button 
                className="regenerate-btn"
                onClick={handleGenerateFlashcards}
                disabled={generating}
              >
                <RefreshCw className={`btn-icon ${generating ? 'animate-spin' : ''}`} />
                {generating ? 'Generating...' : 'Generate New Set'}
              </button>
            </div>
          </div>
        )}

        {/* Session Progress */}
        {sessionProgress && (
          <div className="session-summary">
            <h3>Session Complete! 🎉</h3>
            <div className="summary-stats">
              <div className="summary-stat">
                <span className="stat-label">Accuracy</span>
                <span className="stat-value">{sessionProgress.accuracy}%</span>
              </div>
              <div className="summary-stat">
                <span className="stat-label">Duration</span>
                <span className="stat-value">{formatDuration(sessionProgress.duration)}</span>
              </div>
              <div className="summary-stat">
                <span className="stat-label">Cards Reviewed</span>
                <span className="stat-value">{sessionProgress.totalCards}</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}