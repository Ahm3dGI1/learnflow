import React from 'react';
import { CheckCircle2, XCircle, ArrowLeft, Sparkles, RotateCcw } from 'lucide-react';

/**
 * QuizResults Component
 * 
 * Displays quiz results showing score, correct/incorrect answers,
 * and explanations for each question using Tailwind CSS.
 */
export default function QuizResults({ results, onRetake, onBack }) {
  if (!results || !results.answers) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-600">No results available.</p>
        <button
          onClick={onBack}
          className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
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
  let performanceColor = 'text-blue-600';

  if (percentage >= 90) {
    performanceMessage = 'Outstanding work!';
    performanceColor = 'text-green-600';
  } else if (percentage >= 70) {
    performanceMessage = 'Great job!';
    performanceColor = 'text-teal-600';
  } else if (percentage >= 50) {
    performanceMessage = 'Good effort!';
    performanceColor = 'text-amber-600';
  }

  return (
    <div className="w-full">
      {/* Score Header */}
      <div className="text-center mb-10">
        <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 shadow-lg ${percentage >= 70 ? 'bg-green-100' : 'bg-blue-100'}`}>
          <span className="text-3xl">{percentage >= 70 ? '🎉' : '📚'}</span>
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Quiz Complete!</h2>
        <p className={`text-xl font-medium ${performanceColor} mb-6`}>{performanceMessage}</p>

        <div className="flex justify-center gap-4">
          <div className="px-6 py-3 bg-white/60 rounded-2xl border border-white/60 shadow-sm backdrop-blur-sm">
            <span className="block text-sm text-gray-500 uppercase tracking-wide font-semibold">Score</span>
            <span className="text-2xl font-bold text-gray-900">{score} / {totalQuestions}</span>
          </div>
          <div className="px-6 py-3 bg-white/60 rounded-2xl border border-white/60 shadow-sm backdrop-blur-sm">
            <span className="block text-sm text-gray-500 uppercase tracking-wide font-semibold">Accuracy</span>
            <span className={`text-2xl font-bold ${performanceColor}`}>{percentage}%</span>
          </div>
        </div>
      </div>

      {/* Action Buttons (Top) */}
      <div className="flex justify-center gap-4 mb-10">
        <button
          onClick={onBack}
          className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all font-medium flex items-center gap-2 shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Video
        </button>
        <button
          onClick={onRetake}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 hover:shadow-lg transition-all font-medium flex items-center gap-2 shadow-md shadow-blue-500/20"
        >
          <RotateCcw className="w-4 h-4" />
          Try Again
        </button>
      </div>

      {/* Detailed Results */}
      <div className="space-y-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4 px-2">Review Your Answers</h3>

        {answers.map((answer, index) => {


          return (
            <div
              key={answer.questionId}
              className={`backdrop-blur-xl bg-white/60 border rounded-2xl p-6 shadow-sm transition-all ${answer.isCorrect ? 'border-green-200' : 'border-red-200'
                }`}
            >
              {/* Question Header */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 text-sm font-bold">
                    {index + 1}
                  </span>
                  <h4 className="text-lg text-gray-900 font-medium">{answer.question}</h4>
                </div>
                <span className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${answer.isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                  {answer.isCorrect ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  {answer.isCorrect ? 'Correct' : 'Incorrect'}
                </span>
              </div>

              {/* Options */}
              <div className="space-y-3 mb-4 pl-11">
                {answer.options.map((option, optionIndex) => {
                  const isUserAnswer = answer.userAnswer === optionIndex;
                  const isCorrectAnswer = answer.correctAnswer === optionIndex;

                  let containerClass = "flex items-center p-3 rounded-xl border transition-all text-left";
                  let bgClass = "bg-white/50 border-transparent";
                  let textClass = "text-gray-600";

                  if (isCorrectAnswer) {
                    bgClass = "bg-green-50 border-green-200";
                    textClass = "text-green-800 font-medium";
                  } else if (isUserAnswer && !isCorrectAnswer) {
                    bgClass = "bg-red-50 border-red-200";
                    textClass = "text-red-800";
                  }

                  return (
                    <div key={optionIndex} className={`${containerClass} ${bgClass}`}>
                      {/* Status Indicator Circle */}
                      <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center mr-3 ${isCorrectAnswer
                        ? 'bg-green-500 border-green-500'
                        : isUserAnswer
                          ? 'bg-red-500 border-red-500'
                          : 'border-gray-300 bg-transparent'
                        }`}>
                        {isCorrectAnswer && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                        {isUserAnswer && !isCorrectAnswer && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                      </div>

                      <div className="flex-1">
                        <span className={textClass}>{option}</span>
                      </div>
                      {isUserAnswer && (
                        <span className="text-xs font-medium uppercase tracking-wider text-gray-500 ml-2">
                          Your Answer
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Explanation */}
              {answer.explanation && (
                <div className="ml-11 p-4 bg-blue-50/50 rounded-xl text-sm border border-blue-100">
                  <span className="font-semibold text-blue-800 block mb-1">Explanation:</span>
                  <span className="text-blue-900/80 leading-relaxed">{answer.explanation}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Action (Duplicate for convenience) */}
      <div className="mt-10 flex justify-center">
        <button
          onClick={onRetake}
          className="px-8 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-2xl hover:shadow-lg hover:scale-105 transition-all font-bold text-lg flex items-center gap-2 shadow-blue-500/20"
        >
          <Sparkles className="w-5 h-5" />
          Generate More Questions
        </button>
      </div>
    </div>
  );
}

