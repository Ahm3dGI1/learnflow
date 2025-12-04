/**
 * Unit tests for CheckpointPopup component (MCQ format)
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CheckpointPopup from '../CheckpointPopup';

describe('CheckpointPopup - MCQ Format', () => {
  const mockCheckpoint = {
    id: 1,
    title: 'Photosynthesis Definition',
    subtopic: 'Understanding what photosynthesis is and why plants need it.',
    question: 'What is the primary purpose of photosynthesis?',
    options: [
      'To produce oxygen for animals',
      'To convert light energy into chemical energy',
      'To absorb carbon dioxide from the air',
      'To create water molecules'
    ],
    correctAnswer: 'To convert light energy into chemical energy',
    explanation: 'Photosynthesis converts light energy into chemical energy stored in glucose molecules, which plants use for growth and energy.',
    timestamp: '02:15',
    timestampSeconds: 135,
  };

  const mockOnCorrectAnswer = jest.fn();
  const mockOnAskTutor = jest.fn();
  const mockOnSkip = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ========== RENDERING TESTS ==========

  test('renders checkpoint popup with title and question', () => {
    render(
      <CheckpointPopup
        checkpoint={mockCheckpoint}
        onCorrectAnswer={mockOnCorrectAnswer}
        onAskTutor={mockOnAskTutor}
        onSkip={mockOnSkip}
      />
    );

    expect(screen.getByText('Photosynthesis Definition')).toBeInTheDocument();
    expect(screen.getByText('Understanding what photosynthesis is and why plants need it.')).toBeInTheDocument();
    expect(screen.getByText('What is the primary purpose of photosynthesis?')).toBeInTheDocument();
  });

  test('renders all 4 MCQ options', () => {
    render(
      <CheckpointPopup
        checkpoint={mockCheckpoint}
        onCorrectAnswer={mockOnCorrectAnswer}
        onAskTutor={mockOnAskTutor}
        onSkip={mockOnSkip}
      />
    );

    expect(screen.getByText('To produce oxygen for animals')).toBeInTheDocument();
    expect(screen.getByText('To convert light energy into chemical energy')).toBeInTheDocument();
    expect(screen.getByText('To absorb carbon dioxide from the air')).toBeInTheDocument();
    expect(screen.getByText('To create water molecules')).toBeInTheDocument();
  });

  test('renders option letters (A, B, C, D)', () => {
    render(
      <CheckpointPopup
        checkpoint={mockCheckpoint}
        onCorrectAnswer={mockOnCorrectAnswer}
        onAskTutor={mockOnAskTutor}
        onSkip={mockOnSkip}
      />
    );

    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
    expect(screen.getByText('D')).toBeInTheDocument();
  });

  test('renders checkpoint icon in header', () => {
    render(
      <CheckpointPopup
        checkpoint={mockCheckpoint}
        onCorrectAnswer={mockOnCorrectAnswer}
        onAskTutor={mockOnAskTutor}
        onSkip={mockOnSkip}
      />
    );

    expect(screen.getByText('🎯')).toBeInTheDocument();
  });

  test('renders skip button (X)', () => {
    render(
      <CheckpointPopup
        checkpoint={mockCheckpoint}
        onCorrectAnswer={mockOnCorrectAnswer}
        onAskTutor={mockOnAskTutor}
        onSkip={mockOnSkip}
      />
    );

    const skipButton = screen.getByRole('button', { name: /skip checkpoint/i });
    expect(skipButton).toBeInTheDocument();
  });

  // ========== INTERACTION TESTS ==========

  test('allows selecting an option', () => {
    render(
      <CheckpointPopup
        checkpoint={mockCheckpoint}
        onCorrectAnswer={mockOnCorrectAnswer}
        onAskTutor={mockOnAskTutor}
        onSkip={mockOnSkip}
      />
    );

    const optionButton = screen.getByText('To convert light energy into chemical energy').closest('button');
    fireEvent.click(optionButton);

    // Option should have 'selected' class
    expect(optionButton).toHaveClass('selected');
  });

  test('can change selected option', () => {
    render(
      <CheckpointPopup
        checkpoint={mockCheckpoint}
        onCorrectAnswer={mockOnCorrectAnswer}
        onAskTutor={mockOnAskTutor}
        onSkip={mockOnSkip}
      />
    );

    const option1 = screen.getByText('To produce oxygen for animals').closest('button');
    const option2 = screen.getByText('To convert light energy into chemical energy').closest('button');

    // Select first option
    fireEvent.click(option1);
    expect(option1).toHaveClass('selected');

    // Select second option
    fireEvent.click(option2);
    expect(option2).toHaveClass('selected');
    expect(option1).not.toHaveClass('selected');
  });

  test('submit button is disabled when no option is selected', () => {
    render(
      <CheckpointPopup
        checkpoint={mockCheckpoint}
        onCorrectAnswer={mockOnCorrectAnswer}
        onAskTutor={mockOnAskTutor}
        onSkip={mockOnSkip}
      />
    );

    const submitButton = screen.getByText('Submit Answer');
    expect(submitButton).toBeDisabled();
  });

  test('submit button is enabled when an option is selected', () => {
    render(
      <CheckpointPopup
        checkpoint={mockCheckpoint}
        onCorrectAnswer={mockOnCorrectAnswer}
        onAskTutor={mockOnAskTutor}
        onSkip={mockOnSkip}
      />
    );

    const option = screen.getByText('To convert light energy into chemical energy').closest('button');
    fireEvent.click(option);

    const submitButton = screen.getByText('Submit Answer');
    expect(submitButton).not.toBeDisabled();
  });

  // ========== CORRECT ANSWER TESTS ==========

  test('shows success feedback for correct answer', async () => {
    render(
      <CheckpointPopup
        checkpoint={mockCheckpoint}
        onCorrectAnswer={mockOnCorrectAnswer}
        onAskTutor={mockOnAskTutor}
        onSkip={mockOnSkip}
      />
    );

    const correctOption = screen.getByText('To convert light energy into chemical energy').closest('button');
    fireEvent.click(correctOption);

    const submitButton = screen.getByText('Submit Answer');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Great job! That's correct!")).toBeInTheDocument();
    });
  });

  test('shows explanation for correct answer', async () => {
    render(
      <CheckpointPopup
        checkpoint={mockCheckpoint}
        onCorrectAnswer={mockOnCorrectAnswer}
        onAskTutor={mockOnAskTutor}
        onSkip={mockOnSkip}
      />
    );

    const correctOption = screen.getByText('To convert light energy into chemical energy').closest('button');
    fireEvent.click(correctOption);

    const submitButton = screen.getByText('Submit Answer');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Photosynthesis converts light energy into chemical energy/i)).toBeInTheDocument();
    });
  });

  test('displays correct feedback icon for correct answer', async () => {
    render(
      <CheckpointPopup
        checkpoint={mockCheckpoint}
        onCorrectAnswer={mockOnCorrectAnswer}
        onAskTutor={mockOnAskTutor}
        onSkip={mockOnSkip}
      />
    );

    const correctOption = screen.getByText('To convert light energy into chemical energy').closest('button');
    fireEvent.click(correctOption);

    const submitButton = screen.getByText('Submit Answer');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('✅')).toBeInTheDocument();
    });
  });

  test('calls onCorrectAnswer after correct answer with delay', async () => {
    jest.useFakeTimers();

    render(
      <CheckpointPopup
        checkpoint={mockCheckpoint}
        onCorrectAnswer={mockOnCorrectAnswer}
        onAskTutor={mockOnAskTutor}
        onSkip={mockOnSkip}
      />
    );

    const correctOption = screen.getByText('To convert light energy into chemical energy').closest('button');
    fireEvent.click(correctOption);

    const submitButton = screen.getByText('Submit Answer');
    fireEvent.click(submitButton);

    expect(mockOnCorrectAnswer).not.toHaveBeenCalled();

    jest.advanceTimersByTime(2000);

    await waitFor(() => {
      expect(mockOnCorrectAnswer).toHaveBeenCalledTimes(1);
    });

    jest.useRealTimers();
  });

  // ========== INCORRECT ANSWER TESTS ==========

  test('shows error feedback for incorrect answer', async () => {
    render(
      <CheckpointPopup
        checkpoint={mockCheckpoint}
        onCorrectAnswer={mockOnCorrectAnswer}
        onAskTutor={mockOnAskTutor}
        onSkip={mockOnSkip}
      />
    );

    const wrongOption = screen.getByText('To produce oxygen for animals').closest('button');
    fireEvent.click(wrongOption);

    const submitButton = screen.getByText('Submit Answer');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Not quite right. Try again or ask the AI tutor for help!')).toBeInTheDocument();
    });
  });

  test('shows correct answer hint for incorrect answer', async () => {
    render(
      <CheckpointPopup
        checkpoint={mockCheckpoint}
        onCorrectAnswer={mockOnCorrectAnswer}
        onAskTutor={mockOnAskTutor}
        onSkip={mockOnSkip}
      />
    );

    const wrongOption = screen.getByText('To produce oxygen for animals').closest('button');
    fireEvent.click(wrongOption);

    const submitButton = screen.getByText('Submit Answer');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/The correct answer is:/i)).toBeInTheDocument();
      expect(screen.getByText(/To convert light energy into chemical energy/i)).toBeInTheDocument();
    });
  });

  test('displays incorrect feedback icon for wrong answer', async () => {
    render(
      <CheckpointPopup
        checkpoint={mockCheckpoint}
        onCorrectAnswer={mockOnCorrectAnswer}
        onAskTutor={mockOnAskTutor}
        onSkip={mockOnSkip}
      />
    );

    const wrongOption = screen.getByText('To produce oxygen for animals').closest('button');
    fireEvent.click(wrongOption);

    const submitButton = screen.getByText('Submit Answer');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('❌')).toBeInTheDocument();
    });
  });

  test('shows Try Again and Ask AI Tutor buttons on incorrect answer', async () => {
    render(
      <CheckpointPopup
        checkpoint={mockCheckpoint}
        onCorrectAnswer={mockOnCorrectAnswer}
        onAskTutor={mockOnAskTutor}
        onSkip={mockOnSkip}
      />
    );

    const wrongOption = screen.getByText('To produce oxygen for animals').closest('button');
    fireEvent.click(wrongOption);

    const submitButton = screen.getByText('Submit Answer');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Try Again')).toBeInTheDocument();
      expect(screen.getByText('Ask AI Tutor')).toBeInTheDocument();
    });
  });

  test('Try Again button resets the form', async () => {
    render(
      <CheckpointPopup
        checkpoint={mockCheckpoint}
        onCorrectAnswer={mockOnCorrectAnswer}
        onAskTutor={mockOnAskTutor}
        onSkip={mockOnSkip}
      />
    );

    const wrongOption = screen.getByText('To produce oxygen for animals').closest('button');
    fireEvent.click(wrongOption);

    const submitButton = screen.getByText('Submit Answer');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    const tryAgainButton = screen.getByText('Try Again');
    fireEvent.click(tryAgainButton);

    // Options should be visible again and no option selected
    expect(screen.getByText('To produce oxygen for animals')).toBeInTheDocument();
    const allOptions = screen.getAllByRole('button').filter(btn =>
      btn.classList.contains('checkpoint-option')
    );
    allOptions.forEach(option => {
      expect(option).not.toHaveClass('selected');
    });
  });

  test('Ask AI Tutor button calls onAskTutor with checkpoint', async () => {
    render(
      <CheckpointPopup
        checkpoint={mockCheckpoint}
        onCorrectAnswer={mockOnCorrectAnswer}
        onAskTutor={mockOnAskTutor}
        onSkip={mockOnSkip}
      />
    );

    const wrongOption = screen.getByText('To produce oxygen for animals').closest('button');
    fireEvent.click(wrongOption);

    const submitButton = screen.getByText('Submit Answer');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Ask AI Tutor')).toBeInTheDocument();
    });

    const askTutorButton = screen.getByText('Ask AI Tutor');
    fireEvent.click(askTutorButton);

    expect(mockOnAskTutor).toHaveBeenCalledWith(mockCheckpoint);
  });

  // ========== SKIP FUNCTIONALITY TESTS ==========

  test('skip button calls onSkip callback', () => {
    render(
      <CheckpointPopup
        checkpoint={mockCheckpoint}
        onCorrectAnswer={mockOnCorrectAnswer}
        onAskTutor={mockOnAskTutor}
        onSkip={mockOnSkip}
      />
    );

    const skipButton = screen.getByRole('button', { name: /skip checkpoint/i });
    fireEvent.click(skipButton);

    expect(mockOnSkip).toHaveBeenCalledTimes(1);
  });

  test('skip button works without selecting an answer', () => {
    render(
      <CheckpointPopup
        checkpoint={mockCheckpoint}
        onCorrectAnswer={mockOnCorrectAnswer}
        onAskTutor={mockOnAskTutor}
        onSkip={mockOnSkip}
      />
    );

    // Don't select any option
    const skipButton = screen.getByRole('button', { name: /skip checkpoint/i });
    fireEvent.click(skipButton);

    expect(mockOnSkip).toHaveBeenCalled();
    expect(mockOnCorrectAnswer).not.toHaveBeenCalled();
  });

  // ========== ACCESSIBILITY TESTS ==========

  test('has proper ARIA attributes', () => {
    render(
      <CheckpointPopup
        checkpoint={mockCheckpoint}
        onCorrectAnswer={mockOnCorrectAnswer}
        onAskTutor={mockOnAskTutor}
        onSkip={mockOnSkip}
      />
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'checkpoint-title');
  });

  test('all interactive elements are keyboard accessible', () => {
    render(
      <CheckpointPopup
        checkpoint={mockCheckpoint}
        onCorrectAnswer={mockOnCorrectAnswer}
        onAskTutor={mockOnAskTutor}
        onSkip={mockOnSkip}
      />
    );

    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).not.toHaveAttribute('tabindex', '-1');
    });
  });
});
