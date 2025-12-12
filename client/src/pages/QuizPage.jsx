import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import QuizResults from '../components/QuizResults';
import { videoService, llmService } from '../services';
import './QuizPage.css';

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

  // New state for local answer tracking
  const [selectedAnswers, setSelectedAnswers] = useState({}); // { questionId: optionIndex }

  // Track quiz start time for time taken calculation
  const quizStartTime = useRef(null);

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
        setError(err.message || 'Failed to generate quiz. Please try again.');
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
          selectedAnswer: userAnswerIndex
        });
      });

      // Submit to backend
      try {
        const userId = user?.id || user?.uid;
        const quizId = quiz?.quizId || quiz?.id;
        const timeTakenSeconds = quizStartTime.current
          ? Math.floor((Date.now() - quizStartTime.current) / 1000)
          : null;

        if (userId && quizId) {
          await llmService.submitQuiz(
            userId,
            quizId,
            formattedAnswers,
            timeTakenSeconds
          );
        }
      } catch (backendError) {
        console.error('Error submitting to backend (continuing anyway):', backendError);
      }

      setResults(resultsData);
      setShowResults(true);

    } catch (err) {
      console.error('Error submitting quiz:', err);
      setError('Failed to submit quiz. Please try again.');
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
    } catch (err) {
      console.error('Error generating new quiz:', err);
      setError('Failed to generate new quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Derived State
   */
  const answeredCount = Object.keys(selectedAnswers).length;
  const totalQuestions = quiz?.questions?.length || 0;
  const progressPercentage = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;
  const allAnswered = totalQuestions > 0 && answeredCount === totalQuestions;


  // Render Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50 relative overflow-hidden flex items-center justify-center">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-blue-300/40 to-cyan-400/40 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-blob"></div>
          <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-gradient-to-br from-sky-300/40 to-blue-400/40 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-blob animation-delay-2000"></div>
          <div className="absolute top-1/3 left-1/2 w-[550px] h-[550px] bg-gradient-to-br from-cyan-300/30 to-teal-400/30 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-4000"></div>
        </div>
        <div className="relative backdrop-blur-xl bg-white/40 border border-white/60 rounded-2xl p-8 shadow-xl text-center">
          <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-700 font-medium">Generating quiz questions...</p>
        </div>
      </div>
    );
  }

  // Render Error
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50 relative overflow-hidden flex items-center justify-center">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-blue-300/40 to-cyan-400/40 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-blob"></div>
          <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-gradient-to-br from-sky-300/40 to-blue-400/40 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-blob animation-delay-2000"></div>
        </div>
        <div className="relative backdrop-blur-xl bg-white/40 border border-white/60 rounded-2xl p-8 shadow-xl text-center max-w-md">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Unable to Load Quiz</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate(`/video/${videoId}`)}
            className="px-6 py-2 bg-white/60 hover:bg-white/80 border border-blue-200 rounded-xl text-blue-700 transition-all font-medium"
          >
            ← Back to Video
          </button>
        </div>
      </div>
    );
  }

  // Main Render
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50 relative overflow-hidden">
      {/* Animated Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-blue-300/40 to-cyan-400/40 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-gradient-to-br from-sky-300/40 to-blue-400/40 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/3 left-1/2 w-[550px] h-[550px] bg-gradient-to-br from-cyan-300/30 to-teal-400/30 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative min-h-screen flex flex-col">
        {/* Header */}
        <header className="px-8 py-6 flex items-center justify-between">
          <button
            onClick={() => navigate(`/video/${videoId}`)}
            className="group flex items-center gap-2 px-5 py-2.5 backdrop-blur-xl bg-white/40 hover:bg-white/60 border border-white/60 rounded-xl transition-all shadow-lg shadow-black/5 hover:shadow-xl hover:scale-105"
          >
            <ArrowLeft className="w-4 h-4 text-blue-700 group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-blue-700 text-sm">Back to Video</span>
          </button>

          <div className="backdrop-blur-xl bg-white/40 border border-white/60 rounded-xl px-5 py-2.5 shadow-lg shadow-black/5">
            <span className="text-blue-700 text-sm">{user?.email}</span>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center px-8 py-12">
          <div className="w-full max-w-4xl">
            {/* Video Title Bar */}
            <div className="mb-8 backdrop-blur-xl bg-white/40 border border-white/60 rounded-2xl px-8 py-5 shadow-xl shadow-black/5">
              <h1 className="text-gray-900 text-center font-medium text-lg">
                {video?.title || 'Video Quiz'}
              </h1>
            </div>

            {showResults ? (
              // Wrapper for results
              <div className="backdrop-blur-2xl bg-white/50 border border-white/70 rounded-3xl p-10 shadow-2xl shadow-black/10">
                <QuizResults
                  results={results}
                  onRetake={handleRetake}
                  onBack={() => navigate(`/video/${videoId}`)}
                />
              </div>
            ) : (
              /* Quiz Card */
              <div className="backdrop-blur-2xl bg-white/50 border border-white/70 rounded-3xl p-10 shadow-2xl shadow-black/10">
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
                <div className="mb-10">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-gray-700">{answeredCount} of {totalQuestions} questions answered</span>
                    <span className="text-sm text-blue-600">{Math.round(progressPercentage)}%</span>
                  </div>
                  <div className="h-2.5 backdrop-blur-xl bg-white/60 rounded-full overflow-hidden border border-white/80 shadow-inner">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full relative shadow-lg shadow-blue-500/30 transition-all duration-500"
                      style={{ width: `${progressPercentage}%` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/40 to-white/0 animate-shimmer"></div>
                    </div>
                  </div>
                </div>

                {/* Questions */}
                <div className="space-y-8">
                  {quiz?.questions.map((q, qIndex) => (
                    <div key={q.id} className="backdrop-blur-xl bg-white/60 border border-white/60 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
                      {/* Question Number Badge */}
                      <div className="inline-flex items-center gap-2 mb-5">
                        <div className="px-5 py-1.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-full text-sm font-bold shadow-lg shadow-blue-500/30">
                          Question {qIndex + 1}
                        </div>
                      </div>

                      {/* Question Text */}
                      <h3 className="text-gray-900 mb-6 text-xl font-medium leading-relaxed">{q.question}</h3>

                      {/* Options */}
                      <div className="space-y-3">
                        {q.options.map((option, optionIndex) => {
                          const isSelected = selectedAnswers[q.id] === optionIndex;

                          return (
                            <button
                              key={optionIndex}
                              onClick={() => handleOptionSelect(q.id, optionIndex)}
                              className={`w-full group flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${isSelected
                                ? 'backdrop-blur-xl bg-white border-blue-500 shadow-md ring-1 ring-blue-500'
                                : 'backdrop-blur-xl bg-white/50 border-white/80 hover:bg-white/80 hover:border-blue-300 shadow-sm hover:shadow-md'
                                }`}
                            >
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
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Submit Button */}
                <div className="mt-10 flex flex-col items-center">
                  {!allAnswered && (
                    <p className="text-amber-600 mb-3 text-sm font-medium">Please answer all questions before submitting</p>
                  )}
                  <button
                    onClick={handleQuizSubmit}
                    disabled={!allAnswered || submitting}
                    className="group px-10 py-4 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 border-none text-white rounded-2xl shadow-xl shadow-blue-500/30 hover:shadow-2xl hover:shadow-blue-500/40 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    <span className="flex items-center gap-2 font-bold text-lg">
                      {submitting ? 'Submitting...' : 'Submit Quiz'}
                      {!submitting && <CheckCircle2 className="w-5 h-5 group-hover:scale-110 transition-transform" />}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
