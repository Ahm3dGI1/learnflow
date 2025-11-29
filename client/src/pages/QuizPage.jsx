/**
 * QuizPage Component
 * 
 * Dedicated page for taking quizzes based on video content.
 * Fetches quiz data, manages quiz state, and displays results.
 * 
 * Features:
 * - Generates quiz from video transcript
 * - Displays all questions with multiple choice options
 * - Submits answers and shows results
 * - Allows retaking quiz with new questions
 * 
 * @module QuizPage
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import Quiz from '../components/Quiz';
import QuizResults from '../components/QuizResults';
import { videoService, llmService } from '../services';
import './QuizPage.css';

/**
 * QuizPage Component
 * 
 * Main quiz page that handles quiz generation, submission, and results display.
 * 
 * @returns {React.ReactElement} Quiz page with quiz or results
 * 
 * @example
 * // Used in App routing
 * <Route path="/video/:videoId/quiz" element={<ProtectedRoute><QuizPage /></ProtectedRoute>} />
 */
export default function QuizPage() {
  const { videoId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [video, setVideo] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [showResults, setShowResults] = useState(false);

  /**
   * Fetch Video and Generate Quiz
   * 
   * Fetches video data and generates a quiz from the transcript.
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
        // Backend caches quiz by videoId:languageCode:numQuestions
        const quizData = await llmService.generateQuiz(
          videoData.transcript,
          { numQuestions: 5 }
        );

        setQuiz(quizData);
      } catch (err) {
        console.error('Error fetching quiz:', err);
        setError(err.message || 'Failed to generate quiz. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchQuiz();
  }, [videoId]);

  /**
   * Handle Quiz Submission
   * 
   * Submits user answers and displays results.
   * 
   * @param {Array} answers - Array of {questionId, selectedAnswer} objects
   */
  const handleQuizSubmit = async (answers) => {
    try {
      setSubmitting(true);

      // Calculate results locally (since backend doesn't store quiz attempts yet)
      const resultsData = {
        score: 0,
        totalQuestions: quiz.questions.length,
        answers: []
      };

      quiz.questions.forEach((question) => {
        const userAnswerObj = answers.find(a => a.questionId === question.id);
        const userAnswer = userAnswerObj?.selectedAnswer;
        const isCorrect = userAnswer === question.correctAnswer;

        if (isCorrect) {
          resultsData.score++;
        }

        resultsData.answers.push({
          questionId: question.id,
          question: question.question,
          options: question.options,
          userAnswer: userAnswer,
          correctAnswer: question.correctAnswer,
          isCorrect: isCorrect,
          explanation: question.explanation || ''
        });
      });

      setResults(resultsData);
      setShowResults(true);

      // TODO: When backend supports quiz attempts, submit to backend:
      // const submittedResults = await llmService.submitQuiz(quiz.quizId, answers);
      // setResults(submittedResults);

    } catch (err) {
      console.error('Error submitting quiz:', err);
      setError('Failed to submit quiz. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Handle Retake Quiz
   * 
   * Resets state and generates a new quiz.
   */
  const handleRetake = async () => {
    try {
      setShowResults(false);
      setResults(null);
      setLoading(true);
      setError(null);

      // Clear cache and generate new quiz
      await llmService.clearQuizCache(videoId);

      const quizData = await llmService.generateQuiz(
        video.transcript,
        { numQuestions: 5 }
      );

      setQuiz(quizData);
    } catch (err) {
      console.error('Error generating new quiz:', err);
      setError('Failed to generate new quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle Back to Video
   * 
   * Returns user to video page.
   */
  const handleBack = () => {
    navigate(`/video/${videoId}`);
  };

  // Loading state
  if (loading) {
    return (
      <div className="quiz-page-container">
        <div className="quiz-page-loading" role="status" aria-live="polite">
          <div className="loading-spinner" aria-label="Loading"></div>
          <p>Generating quiz questions...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="quiz-page-container">
        <div className="quiz-page-error">
          <h2>Unable to Load Quiz</h2>
          <p>{error}</p>
          <button onClick={handleBack} className="back-button">
            ← Back to Video
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-page-container">
      {/* Header */}
      <header className="quiz-page-header">
        <button onClick={handleBack} className="back-button">
          ← Back to Video
        </button>
        <div className="video-title-section">
          <h1>{video?.title || 'Quiz'}</h1>
        </div>
        <div className="user-info">
          <span className="user-email">{user?.email}</span>
        </div>
      </header>

      {/* Main Content */}
      <div className="quiz-page-content">
        {showResults ? (
          <QuizResults
            results={results}
            onRetake={handleRetake}
            onBack={handleBack}
          />
        ) : (
          <Quiz
            quiz={quiz}
            onSubmit={handleQuizSubmit}
            loading={submitting}
          />
        )}
      </div>
    </div>
  );
}
