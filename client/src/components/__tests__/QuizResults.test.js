/**
 * Unit tests for QuizResults component
 */

import { render, screen, fireEvent } from '@testing-library/react';
import QuizResults from '../QuizResults';

describe('QuizResults', () => {
  const mockOnRetake = jest.fn();
  const mockOnBack = jest.fn();

  const mockResultsExcellent = {
    score: 9,
    totalQuestions: 10,
    answers: [
      {
        questionId: 1,
        question: 'What is photosynthesis?',
        options: [
          'Process of making food from light',
          'Process of breathing',
          'Process of reproduction',
          'Process of growth'
        ],
        userAnswer: 0,
        correctAnswer: 0,
        isCorrect: true,
        explanation: 'Photosynthesis converts light energy into chemical energy.'
      },
      {
        questionId: 2,
        question: 'What is the powerhouse of the cell?',
        options: [
          'Nucleus',
          'Mitochondria',
          'Ribosome',
          'Chloroplast'
        ],
        userAnswer: 2,
        correctAnswer: 1,
        isCorrect: false,
        explanation: 'Mitochondria produce energy for the cell through cellular respiration.'
      }
    ]
  };

  const mockResultsGood = {
    score: 7,
    totalQuestions: 10,
    answers: mockResultsExcellent.answers
  };

  const mockResultsFair = {
    score: 5,
    totalQuestions: 10,
    answers: mockResultsExcellent.answers
  };

  const mockResultsPoor = {
    score: 3,
    totalQuestions: 10,
    answers: mockResultsExcellent.answers
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ========== RENDERING TESTS ==========

  test('renders quiz results with score', () => {
    render(
      <QuizResults
        results={mockResultsExcellent}
        onRetake={mockOnRetake}
        onBack={mockOnBack}
      />
    );

    expect(screen.getByText('Quiz Complete!')).toBeInTheDocument();
    expect(screen.getByText('9 / 10')).toBeInTheDocument();
    expect(screen.getByText('90%')).toBeInTheDocument();
  });

  test('renders empty state when no results provided', () => {
    render(
      <QuizResults
        results={null}
        onRetake={mockOnRetake}
        onBack={mockOnBack}
      />
    );

    expect(screen.getByText('No results available.')).toBeInTheDocument();
  });

  test('renders empty state when answers missing', () => {
    render(
      <QuizResults
        results={{ score: 5, totalQuestions: 10 }}
        onRetake={mockOnRetake}
        onBack={mockOnBack}
      />
    );

    expect(screen.getByText('No results available.')).toBeInTheDocument();
  });

  test('renders all answer cards', () => {
    render(
      <QuizResults
        results={mockResultsExcellent}
        onRetake={mockOnRetake}
        onBack={mockOnBack}
      />
    );

    expect(screen.getByText('Question 1')).toBeInTheDocument();
    expect(screen.getByText('Question 2')).toBeInTheDocument();
    expect(screen.getByText('What is photosynthesis?')).toBeInTheDocument();
    expect(screen.getByText('What is the powerhouse of the cell?')).toBeInTheDocument();
  });

  test('renders action buttons', () => {
    render(
      <QuizResults
        results={mockResultsExcellent}
        onRetake={mockOnRetake}
        onBack={mockOnBack}
      />
    );

    expect(screen.getByText(/Back to Video/i)).toBeInTheDocument();
    expect(screen.getByText(/Retake Quiz/i)).toBeInTheDocument();
  });

  // ========== PERFORMANCE LEVEL TESTS ==========

  test('shows excellent performance for 90%+', () => {
    render(
      <QuizResults
        results={mockResultsExcellent}
        onRetake={mockOnRetake}
        onBack={mockOnBack}
      />
    );

    expect(screen.getByText('Outstanding work!')).toBeInTheDocument();
    expect(screen.getByText('🌟')).toBeInTheDocument();
  });

  test('shows good performance for 70-89%', () => {
    render(
      <QuizResults
        results={mockResultsGood}
        onRetake={mockOnRetake}
        onBack={mockOnBack}
      />
    );

    expect(screen.getByText('Great job!')).toBeInTheDocument();
    expect(screen.getByText('🎉')).toBeInTheDocument();
  });

  test('shows fair performance for 50-69%', () => {
    render(
      <QuizResults
        results={mockResultsFair}
        onRetake={mockOnRetake}
        onBack={mockOnBack}
      />
    );

    expect(screen.getByText('Good effort!')).toBeInTheDocument();
    expect(screen.getByText('👍')).toBeInTheDocument();
  });

  test('shows needs improvement for below 50%', () => {
    render(
      <QuizResults
        results={mockResultsPoor}
        onRetake={mockOnRetake}
        onBack={mockOnBack}
      />
    );

    expect(screen.getByText('Keep practicing!')).toBeInTheDocument();
    expect(screen.getByText('📚')).toBeInTheDocument();
  });

  // ========== ANSWER DISPLAY TESTS ==========

  test('shows correct answer badge for correct answers', () => {
    render(
      <QuizResults
        results={mockResultsExcellent}
        onRetake={mockOnRetake}
        onBack={mockOnBack}
      />
    );

    const correctBadges = screen.getAllByText('✓ Correct');
    expect(correctBadges.length).toBeGreaterThan(0);
  });

  test('shows incorrect answer badge for wrong answers', () => {
    render(
      <QuizResults
        results={mockResultsExcellent}
        onRetake={mockOnRetake}
        onBack={mockOnBack}
      />
    );

    const incorrectBadges = screen.getAllByText('✗ Incorrect');
    expect(incorrectBadges.length).toBeGreaterThan(0);
  });

  test('displays all answer options', () => {
    render(
      <QuizResults
        results={mockResultsExcellent}
        onRetake={mockOnRetake}
        onBack={mockOnBack}
      />
    );

    expect(screen.getByText('Process of making food from light')).toBeInTheDocument();
    expect(screen.getByText('Nucleus')).toBeInTheDocument();
    expect(screen.getByText('Mitochondria')).toBeInTheDocument();
  });

  test('highlights user answer', () => {
    render(
      <QuizResults
        results={mockResultsExcellent}
        onRetake={mockOnRetake}
        onBack={mockOnBack}
      />
    );

    const userAnswerIndicators = screen.getAllByText('Your answer');
    expect(userAnswerIndicators.length).toBe(2); // One for each question
  });

  test('highlights correct answer', () => {
    render(
      <QuizResults
        results={mockResultsExcellent}
        onRetake={mockOnRetake}
        onBack={mockOnBack}
      />
    );

    const correctAnswerIndicators = screen.getAllByText('Correct answer');
    expect(correctAnswerIndicators.length).toBe(2); // One for each question
  });

  test('displays explanations', () => {
    render(
      <QuizResults
        results={mockResultsExcellent}
        onRetake={mockOnRetake}
        onBack={mockOnBack}
      />
    );

    expect(screen.getByText(/Photosynthesis converts light energy/i)).toBeInTheDocument();
    expect(screen.getByText(/Mitochondria produce energy/i)).toBeInTheDocument();
  });

  test('renders option letters (A, B, C, D)', () => {
    render(
      <QuizResults
        results={mockResultsExcellent}
        onRetake={mockOnRetake}
        onBack={mockOnBack}
      />
    );

    const letterAs = screen.getAllByText('A');
    const letterBs = screen.getAllByText('B');
    const letterCs = screen.getAllByText('C');
    const letterDs = screen.getAllByText('D');

    expect(letterAs.length).toBeGreaterThan(0);
    expect(letterBs.length).toBeGreaterThan(0);
    expect(letterCs.length).toBeGreaterThan(0);
    expect(letterDs.length).toBeGreaterThan(0);
  });

  // ========== INTERACTION TESTS ==========

  test('calls onRetake when retake button clicked', () => {
    render(
      <QuizResults
        results={mockResultsExcellent}
        onRetake={mockOnRetake}
        onBack={mockOnBack}
      />
    );

    const retakeButton = screen.getByText(/Retake Quiz/i);
    fireEvent.click(retakeButton);

    expect(mockOnRetake).toHaveBeenCalledTimes(1);
  });

  test('calls onBack when back button clicked', () => {
    render(
      <QuizResults
        results={mockResultsExcellent}
        onRetake={mockOnRetake}
        onBack={mockOnBack}
      />
    );

    const backButton = screen.getByText(/Back to Video/i);
    fireEvent.click(backButton);

    expect(mockOnBack).toHaveBeenCalledTimes(1);
  });

  // ========== PERCENTAGE CALCULATION TESTS ==========

  test('calculates percentage correctly for perfect score', () => {
    const perfectResults = {
      score: 10,
      totalQuestions: 10,
      answers: mockResultsExcellent.answers
    };

    render(
      <QuizResults
        results={perfectResults}
        onRetake={mockOnRetake}
        onBack={mockOnBack}
      />
    );

    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  test('calculates percentage correctly for zero score', () => {
    const zeroResults = {
      score: 0,
      totalQuestions: 10,
      answers: mockResultsExcellent.answers
    };

    render(
      <QuizResults
        results={zeroResults}
        onRetake={mockOnRetake}
        onBack={mockOnBack}
      />
    );

    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  test('rounds percentage correctly', () => {
    const partialResults = {
      score: 7,
      totalQuestions: 9,
      answers: mockResultsExcellent.answers
    };

    render(
      <QuizResults
        results={partialResults}
        onRetake={mockOnRetake}
        onBack={mockOnBack}
      />
    );

    // 7/9 = 77.77... should round to 78%
    expect(screen.getByText('78%')).toBeInTheDocument();
  });

  // ========== EDGE CASE TESTS ==========

  test('handles answers without explanations', () => {
    const resultsNoExplanation = {
      score: 5,
      totalQuestions: 10,
      answers: [
        {
          questionId: 1,
          question: 'Test question?',
          options: ['A', 'B', 'C', 'D'],
          userAnswer: 0,
          correctAnswer: 0,
          isCorrect: true,
          // No explanation field
        }
      ]
    };

    render(
      <QuizResults
        results={resultsNoExplanation}
        onRetake={mockOnRetake}
        onBack={mockOnBack}
      />
    );

    expect(screen.getByText('Test question?')).toBeInTheDocument();
    expect(screen.queryByText(/Explanation:/i)).not.toBeInTheDocument();
  });

  test('handles single question quiz', () => {
    const singleQuestionResults = {
      score: 1,
      totalQuestions: 1,
      answers: [mockResultsExcellent.answers[0]]
    };

    render(
      <QuizResults
        results={singleQuestionResults}
        onRetake={mockOnRetake}
        onBack={mockOnBack}
      />
    );

    expect(screen.getByText('1 / 1')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('Question 1')).toBeInTheDocument();
    expect(screen.queryByText('Question 2')).not.toBeInTheDocument();
  });

  test('renders Review Your Answers header', () => {
    render(
      <QuizResults
        results={mockResultsExcellent}
        onRetake={mockOnRetake}
        onBack={mockOnBack}
      />
    );

    expect(screen.getByText('Review Your Answers')).toBeInTheDocument();
  });

  // ========== CSS CLASS TESTS ==========

  test('applies correct CSS class for excellent performance', () => {
    const { container } = render(
      <QuizResults
        results={mockResultsExcellent}
        onRetake={mockOnRetake}
        onBack={mockOnBack}
      />
    );

    const header = container.querySelector('.results-header');
    expect(header).toHaveClass('excellent');
  });

  test('applies correct CSS class for good performance', () => {
    const { container } = render(
      <QuizResults
        results={mockResultsGood}
        onRetake={mockOnRetake}
        onBack={mockOnBack}
      />
    );

    const header = container.querySelector('.results-header');
    expect(header).toHaveClass('good');
  });

  test('applies correct CSS class for fair performance', () => {
    const { container } = render(
      <QuizResults
        results={mockResultsFair}
        onRetake={mockOnRetake}
        onBack={mockOnBack}
      />
    );

    const header = container.querySelector('.results-header');
    expect(header).toHaveClass('fair');
  });

  test('applies correct CSS class for needs improvement', () => {
    const { container } = render(
      <QuizResults
        results={mockResultsPoor}
        onRetake={mockOnRetake}
        onBack={mockOnBack}
      />
    );

    const header = container.querySelector('.results-header');
    expect(header).toHaveClass('needs-improvement');
  });

  test('applies correct class to correct answer cards', () => {
    const { container } = render(
      <QuizResults
        results={mockResultsExcellent}
        onRetake={mockOnRetake}
        onBack={mockOnBack}
      />
    );

    const correctCards = container.querySelectorAll('.answer-card.correct');
    expect(correctCards.length).toBeGreaterThan(0);
  });

  test('applies correct class to incorrect answer cards', () => {
    const { container } = render(
      <QuizResults
        results={mockResultsExcellent}
        onRetake={mockOnRetake}
        onBack={mockOnBack}
      />
    );

    const incorrectCards = container.querySelectorAll('.answer-card.incorrect');
    expect(incorrectCards.length).toBeGreaterThan(0);
  });
});
