import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../hooks/useToast';
import QuizResults from '../components/QuizResults';
import { videoService, llmService } from '../services';
import errorService from '../services/errorService';
import './QuizPage.css';

export default function QuizPage() {
  const { videoId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const [video, setVideo] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [showResults, setShowResults] = useState(false);

  // New state for local answer tracking
  const [selectedAnswers, setSelectedAnswers] = useState({}); // { questionId: optionIndex }

  // Track quiz start time for time taken calculation
  const quizStartTime = useRef(null);

  /**
   * Set up error service toast callback (once on mount)
   */
  useEffect(() => {
    errorService.setToastCallback((message, severity) => {
      if (severity === 'error' || severity === 'critical') {
        toast.error(message);
      } else if (severity === 'warning') {
        toast.warning(message);
      } else {
        toast.info(message);
      }
    });
  }, [toast]);

  /**
   * Fetch Video and Generate Quiz
   */
  useEffect(() => {
    const fetchQuiz = async () => {
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
          setError('No transcript available for this video. Cannot generate quiz.');
          setLoading(false);
          return;
        }

        // Generate quiz
        const quizData = await llmService.generateQuiz(
          videoData.transcript,
          { numQuestions: 5 }
        );

        setQuiz(quizData);
        // Start tracking time when quiz loads
        quizStartTime.current = Date.now();
      } catch (err) {
        console.error('Error fetching quiz:', err);
        let errorMsg = err.message || 'Failed to generate quiz. Please try again.';
        
        // Handle quota exhaustion with user-friendly message
        if (err.status === 429 || err.message?.includes('quota')) {
          errorMsg = 'Quiz generation quota exceeded. Please try again later.';
          if (err.retryAfterSeconds) {
            errorMsg += ` Retry in ${err.retryAfterSeconds} seconds.`;
          }
        }
        
        setError(errorMsg);
        toast.error(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    fetchQuiz();
  }, [videoId]);

  /**
   * Handle Option Selection
   */
  const handleOptionSelect = (questionId, optionIndex) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: optionIndex
    }));
  };

  /**
   * Handle Quiz Submission
   */
  const handleQuizSubmit = async () => {
    if (!quiz || !quiz.questions) return;

    try {
      setSubmitting(true);

      // Calculate results locally and prepare for backend submission
      const resultsData = {
        score: 0,
        totalQuestions: quiz.questions.length,
        answers: []
      };

      // Format answers for backend submission
      const formattedAnswers = [];

      quiz.questions.forEach((question, index) => {
        const userAnswerIndex = selectedAnswers[question.id];
        const isCorrect = userAnswerIndex === question.correctAnswer;

        if (isCorrect) {
          resultsData.score++;
        }

        resultsData.answers.push({
          questionId: question.id,
          question: question.question,
          options: question.options,
          userAnswer: userAnswerIndex,
          correctAnswer: question.correctAnswer,
          isCorrect: isCorrect,
          explanation: question.explanation || ''
        });

        // Format for backend
        formattedAnswers.push({
          questionIndex: index,
          selectedAnswer: userAnswerIndex !== undefined ? userAnswerIndex : null
        });
      });

      // Show results immediately for better UX
      setResults(resultsData);
      setShowResults(true);

      // Submit to backend
      const userId = user?.id || user?.uid;
      const quizId = quiz?.quizId || quiz?.id;
      
      try {
        const timeTakenSeconds = quizStartTime.current
          ? Math.floor((Date.now() - quizStartTime.current) / 1000)
          : null;

        if (userId && quizId) {
          const submittedResult = await llmService.submitQuiz(
            userId,
            quizId,
            formattedAnswers,
            timeTakenSeconds
          );
          console.log('Quiz submitted to backend:', submittedResult);
          toast.success('Quiz completed and progress saved!');
        } else if (!userId) {
          toast.info('Quiz completed! Log in to save your progress.', { duration: 5000 });
        } else {
          console.warn('Missing quizId, quiz not submitted to backend');
        }
      } catch (backendError) {
        // Use the error service for comprehensive error handling
        const errorInfo = errorService.handleError(backendError, {
          context: 'submitting quiz results',
          showToast: false, // We'll handle toast manually for better UX
          metadata: { 
            userId: userId, 
            quizId: quizId, 
            videoId: videoId,
            answersCount: formattedAnswers.length 
          }
        });

        // Provide specific user feedback based on error category
        if (errorInfo.category === 'AUTH') {
          toast.warning('Session expired. Please log in again to save progress.');
        } else if (errorInfo.category === 'NETWORK') {
          toast.warning('Network error. Quiz results shown locally. Check your connection to sync later.');
        } else if (errorInfo.status >= 500) {
          toast.error('Server error. Your results are saved locally but may not sync immediately.');
        } else {
          toast.warning(errorInfo.message || 'Quiz completed but failed to save to your profile. Please try again later.');
        }
      }

    } catch (err) {
      console.error('Error processing quiz:', err);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Handle Retake Quiz
   */
  const handleRetake = async () => {
    try {
      setShowResults(false);
      setResults(null);
      setSelectedAnswers({});
      setLoading(true);
      setError(null);

      await llmService.clearQuizCache(videoId);

      const quizData = await llmService.generateQuiz(
        video.transcript,
        { numQuestions: 5 }
      );

      setQuiz(quizData);
      quizStartTime.current = Date.now();
      toast.info('New quiz generated');
    } catch (err) {
      console.error('Error generating new quiz:', err);
      setError('Failed to generate new quiz. Please try again.');
      toast.error('Failed to regenerate quiz');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Derived State
   */
  const totalQuestions = quiz?.questions?.length || 0;
  
  // Validate that all questions have valid answers (not just keys in selectedAnswers)
  const validAnswers = quiz?.questions?.filter(question => {
    const userAnswer = selectedAnswers[question.id];
    return userAnswer !== undefined && userAnswer !== null && 
           typeof userAnswer === 'number' && userAnswer >= 0 && userAnswer <= 3;
  }).length || 0;
  
  const answeredCount = validAnswers;
  const progressPercentage = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;
  const allAnswered = totalQuestions > 0 && answeredCount === totalQuestions;


  // Render Loading
  if (loading) {
    return (
      <div className="quiz-loading-container">
        <div className="bg-orb bg-orb-1 animate-blob"></div>
        <div className="bg-orb bg-orb-2 animate-blob animation-delay-2000"></div>
        <div className="loading-card">
          <div className="loading-spinner"></div>
          <p>Generating quiz questions...</p>
        </div>
      </div>
    );
  }

  // Render Error
  if (error) {
    return (
      <div className="quiz-error-container">
        <div className="bg-orb bg-orb-1 animate-blob"></div>
        <div className="bg-orb bg-orb-2 animate-blob animation-delay-2000"></div>
        <div className="error-card">
          <h2>Unable to Load Quiz</h2>
          <p>{error}</p>
          <button
            onClick={() => navigate(`/video/${videoId}`)}
            className="quiz-glass-button"
            type="button"
          >
            ← Back to Video
          </button>
        </div>
      </div>
    );
  }

  // Main Render
  return (
    <div className="quiz-page-container">
      {/* Animated Background Orbs */}
      <div className="bg-orb bg-orb-1 animate-blob"></div>
      <div className="bg-orb bg-orb-2 animate-blob animation-delay-2000"></div>
      <div className="bg-orb bg-orb-3 animate-blob animation-delay-4000"></div>

      {/* Header */}
      <header className="quiz-page-header">
        <button
          onClick={() => navigate(`/video/${videoId}`)}
          className="quiz-glass-button"
          type="button"
          aria-label="Back to video"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Video</span>
        </button>

        {user?.email && (
          <div className="quiz-glass-button" style={{ cursor: 'default' }}>
            <span className="user-email">{user.email}</span>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="quiz-page-main">
        <div className="quiz-content-wrapper">
          {/* Video Title Bar */}
          <div className="video-title-card">
            <h1>{video?.title || 'Video Quiz'}</h1>
          </div>

          {showResults ? (
            // Wrapper for results
            <div className="quiz-card">
              <QuizResults
                results={results}
                onRetake={handleRetake}
                onBack={() => navigate(`/video/${videoId}`)}
              />
            </div>
          ) : (
            /* Quiz Card */
            <div className="quiz-card">
              {/* Quiz Header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                    <CheckCircle2 className="w-7 h-7 text-white" />
                  </div>
                  <h2 className="text-3xl text-gray-900 font-bold">Quiz Time</h2>
                </div>
                <p className="text-gray-600">Test your understanding of the video content</p>
              </div>

              {/* Progress */}
              <div className="quiz-progress-section">
                <div className="quiz-progress-labels">
                  <span className="text-gray-700">{answeredCount} of {totalQuestions} questions answered</span>
                  <span className="text-blue-600 font-bold">{Math.round(progressPercentage)}%</span>
                </div>
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{ width: `${progressPercentage}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/40 to-white/0 animate-shimmer"></div>
                  </div>
                </div>
              </div>

              {/* Questions */}
              <div className="space-y-8">
                {quiz?.questions.map((q, qIndex) => (
                  <div key={q.id} className="quiz-question-card">
                    {/* Question Number Badge */}
                    <div className="question-badge">
                      Question {qIndex + 1}
                    </div>

                    {/* Question Text */}
                    <h3 className="question-text">{q.question}</h3>

                    {/* Options */}
                    <div className="quiz-options-grid">
                      {q.options.map((option, optionIndex) => {
                        const isSelected = selectedAnswers[q.id] === optionIndex;

                        return (
                          <button
                            key={optionIndex}
                            onClick={() => handleOptionSelect(q.id, optionIndex)}
                            className={`quiz-option-button ${isSelected ? 'selected' : ''}`}
                            type="button"
                            aria-pressed={isSelected}
                          >
                            <div className="option-circle">
                              {isSelected && <div className="option-dot" />}
                            </div>
                            <span className={`font-medium text-base ${isSelected ? 'text-gray-900' : 'text-gray-600'}`}>
                              {option}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Submit Button */}
              <div className="quiz-footer">
                {!allAnswered && (
                  <p className="text-amber-600 mb-3 text-sm font-medium">Please answer all questions before submitting</p>
                )}
                <button
                  onClick={handleQuizSubmit}
                  disabled={!allAnswered || submitting}
                  className="quiz-submit-button"
                  type="submit"
                >
                  {submitting ? 'Submitting...' : 'Submit Quiz'}
                  {!submitting && <CheckCircle2 className="w-5 h-5 transition-transform" />}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
