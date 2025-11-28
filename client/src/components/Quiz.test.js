/**
 * Unit tests for Quiz component
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Quiz from './Quiz';

describe('Quiz', () => {
  const mockQuiz = {
    videoId: 'abc123',
    language: 'en',
    questions: [
      {
        id: 1,
        question: 'What is the primary function of chlorophyll in photosynthesis?',
        options: [
          'To absorb light energy from the sun',
          'To store glucose for the plant',
          'To release oxygen into the air',
          'To transport water to the leaves',
        ],
        correctAnswer: 0,
        explanation: 'Chlorophyll is the green pigment that captures light energy.',
      },
      {
        id: 2,
        question: 'Where do the light-independent reactions occur?',
        options: [
          'In the thylakoid membrane',
          'In the stroma of the chloroplast',
          'In the cell nucleus',
          'In the mitochondria',
        ],
        correctAnswer: 1,
        explanation: 'The Calvin Cycle takes place in the stroma.',
      },
    ],
    totalQuestions: 2,
  };

  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Basic Rendering Tests

  test('renders quiz with header and questions', () => {
    render(<Quiz quiz={mockQuiz} onSubmit={mockOnSubmit} />);

    expect(screen.getByText('📝 Quiz Time')).toBeInTheDocument();
    expect(screen.getByText('Test your understanding of the video content')).toBeInTheDocument();
    expect(screen.getByText('What is the primary function of chlorophyll in photosynthesis?')).toBeInTheDocument();
    expect(screen.getByText('Where do the light-independent reactions occur?')).toBeInTheDocument();
  });

  test('displays all question options with correct labels', () => {
    render(<Quiz quiz={mockQuiz} onSubmit={mockOnSubmit} />);

    // Check first question options
    expect(screen.getByText('To absorb light energy from the sun')).toBeInTheDocument();
    expect(screen.getByText('To store glucose for the plant')).toBeInTheDocument();
    
    // Check second question options
    expect(screen.getByText('In the stroma of the chloroplast')).toBeInTheDocument();
    expect(screen.getByText('In the mitochondria')).toBeInTheDocument();
  });

  test('displays progress indicator showing 0 answered initially', () => {
    render(<Quiz quiz={mockQuiz} onSubmit={mockOnSubmit} />);

    expect(screen.getByText('0 of 2 questions answered')).toBeInTheDocument();
  });

  test('displays question numbers correctly', () => {
    render(<Quiz quiz={mockQuiz} onSubmit={mockOnSubmit} />);

    expect(screen.getByText('Question 1')).toBeInTheDocument();
    expect(screen.getByText('Question 2')).toBeInTheDocument();
  });

  // Interaction Tests

  test('allows selecting an answer for a question', () => {
    render(<Quiz quiz={mockQuiz} onSubmit={mockOnSubmit} />);

    const radioInputs = screen.getAllByRole('radio');
    fireEvent.click(radioInputs[0]); // Select first option of first question

    expect(radioInputs[0]).toBeChecked();
  });

  test('updates progress when answers are selected', () => {
    render(<Quiz quiz={mockQuiz} onSubmit={mockOnSubmit} />);

    const radioInputs = screen.getAllByRole('radio');
    
    // Select answer for first question
    fireEvent.click(radioInputs[0]);
    expect(screen.getByText('1 of 2 questions answered')).toBeInTheDocument();

    // Select answer for second question
    fireEvent.click(radioInputs[4]); // First option of second question
    expect(screen.getByText('2 of 2 questions answered')).toBeInTheDocument();
  });

  test('updates progress bar visually', () => {
    render(<Quiz quiz={mockQuiz} onSubmit={mockOnSubmit} />);

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveStyle({ width: '0%' });

    const radioInputs = screen.getAllByRole('radio');
    fireEvent.click(radioInputs[0]);

    expect(progressBar).toHaveStyle({ width: '50%' });
  });

  test('allows changing answer for a question', () => {
    render(<Quiz quiz={mockQuiz} onSubmit={mockOnSubmit} />);

    const radioInputs = screen.getAllByRole('radio');
    
    // Select first option
    fireEvent.click(radioInputs[0]);
    expect(radioInputs[0]).toBeChecked();

    // Change to second option
    fireEvent.click(radioInputs[1]);
    expect(radioInputs[1]).toBeChecked();
    expect(radioInputs[0]).not.toBeChecked();
  });

  // Submit Button Tests

  test('submit button is disabled when not all questions are answered', () => {
    render(<Quiz quiz={mockQuiz} onSubmit={mockOnSubmit} />);

    const submitButton = screen.getByRole('button', { name: /submit quiz/i });
    expect(submitButton).toBeDisabled();
  });

  test('submit button is enabled when all questions are answered', () => {
    render(<Quiz quiz={mockQuiz} onSubmit={mockOnSubmit} />);

    const radioInputs = screen.getAllByRole('radio');
    
    // Answer both questions
    fireEvent.click(radioInputs[0]); // Q1
    fireEvent.click(radioInputs[4]); // Q2

    const submitButton = screen.getByRole('button', { name: /submit quiz/i });
    expect(submitButton).not.toBeDisabled();
  });

  test('shows warning message when submit attempted with unanswered questions', () => {
    render(<Quiz quiz={mockQuiz} onSubmit={mockOnSubmit} />);

    const radioInputs = screen.getAllByRole('radio');
    fireEvent.click(radioInputs[0]); // Only answer first question

    // Warning should be visible since not all answered
    expect(screen.getByText('Please answer all questions before submitting')).toBeInTheDocument();
  });

  test('calls onSubmit with correct answer format when submitted', () => {
    render(<Quiz quiz={mockQuiz} onSubmit={mockOnSubmit} />);

    const radioInputs = screen.getAllByRole('radio');
    
    // Answer both questions
    fireEvent.click(radioInputs[0]); // Q1, option 0
    fireEvent.click(radioInputs[5]); // Q2, option 1

    const submitButton = screen.getByRole('button', { name: /submit quiz/i });
    fireEvent.click(submitButton);

    expect(mockOnSubmit).toHaveBeenCalledWith([
      { questionId: 1, selectedAnswer: 0 },
      { questionId: 2, selectedAnswer: 1 },
    ]);
  });

  test('does not call onSubmit if not all questions answered', () => {
    render(<Quiz quiz={mockQuiz} onSubmit={mockOnSubmit} />);

    const radioInputs = screen.getAllByRole('radio');
    fireEvent.click(radioInputs[0]); // Only answer first question

    const submitButton = screen.getByRole('button', { name: /submit quiz/i });
    fireEvent.click(submitButton);

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  // Loading State Tests

  test('disables radio buttons when loading', () => {
    render(<Quiz quiz={mockQuiz} onSubmit={mockOnSubmit} loading={true} />);

    const radioInputs = screen.getAllByRole('radio');
    radioInputs.forEach(input => {
      expect(input).toBeDisabled();
    });
  });

  test('shows submitting text when loading', () => {
    render(<Quiz quiz={mockQuiz} onSubmit={mockOnSubmit} loading={true} />);

    expect(screen.getByText('Submitting...')).toBeInTheDocument();
  });

  test('disables submit button when loading', () => {
    render(<Quiz quiz={mockQuiz} onSubmit={mockOnSubmit} loading={true} />);

    const submitButton = screen.getByRole('button');
    expect(submitButton).toBeDisabled();
  });

  // Edge Cases and Validation

  test('handles empty quiz gracefully', () => {
    const emptyQuiz = { questions: [] };
    render(<Quiz quiz={emptyQuiz} onSubmit={mockOnSubmit} />);

    expect(screen.getByText('No quiz questions available.')).toBeInTheDocument();
  });

  test('handles null quiz gracefully', () => {
    render(<Quiz quiz={null} onSubmit={mockOnSubmit} />);

    expect(screen.getByText('No quiz questions available.')).toBeInTheDocument();
  });

  test('adds answered class to question card when answered', () => {
    render(<Quiz quiz={mockQuiz} onSubmit={mockOnSubmit} />);

    const radioInputs = screen.getAllByRole('radio');
    const questionCard = screen.getByText('Question 1').closest('.question-card');

    expect(questionCard).not.toHaveClass('answered');

    fireEvent.click(radioInputs[0]);

    expect(questionCard).toHaveClass('answered');
  });

  // Accessibility Tests

  test('has proper ARIA labels for progress bar', () => {
    render(<Quiz quiz={mockQuiz} onSubmit={mockOnSubmit} />);

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '0');
    expect(progressBar).toHaveAttribute('aria-valuemin', '0');
    expect(progressBar).toHaveAttribute('aria-valuemax', '2');
  });

  test('radio groups have proper roles', () => {
    render(<Quiz quiz={mockQuiz} onSubmit={mockOnSubmit} />);

    const radioGroups = screen.getAllByRole('radiogroup');
    expect(radioGroups).toHaveLength(2); // One per question
  });

  test('submit button has descriptive aria-label when loading', () => {
    render(<Quiz quiz={mockQuiz} onSubmit={mockOnSubmit} loading={true} />);

    const submitButton = screen.getByRole('button');
    expect(submitButton).toHaveAttribute('aria-label', 'Submitting quiz...');
  });

  test('warning message has alert role', () => {
    render(<Quiz quiz={mockQuiz} onSubmit={mockOnSubmit} />);

    const radioInputs = screen.getAllByRole('radio');
    fireEvent.click(radioInputs[0]); // Partially answer

    const warning = screen.getByRole('alert');
    expect(warning).toHaveTextContent('Please answer all questions before submitting');
  });

  // Option Letter Display

  test('displays option letters A, B, C, D correctly', () => {
    render(<Quiz quiz={mockQuiz} onSubmit={mockOnSubmit} />);

    // Check that all option letters are present
    const optionLetters = screen.getAllByText(/^[ABCD]$/);
    expect(optionLetters.length).toBeGreaterThanOrEqual(8); // 4 options × 2 questions
  });

  test('highlights selected option visually', () => {
    render(<Quiz quiz={mockQuiz} onSubmit={mockOnSubmit} />);

    const radioInputs = screen.getAllByRole('radio');
    const firstOptionLabel = radioInputs[0].closest('label');

    expect(firstOptionLabel).not.toHaveClass('selected');

    fireEvent.click(radioInputs[0]);

    expect(firstOptionLabel).toHaveClass('selected');
  });
});
