/**
 * Unit tests for CheckpointPopup component
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CheckpointPopup from './CheckpointPopup';

describe('CheckpointPopup', () => {
  const mockCheckpoint = {
    id: 1,
    title: 'Photosynthesis Definition',
    subtopic: 'Understanding what photosynthesis is and why plants need it.',
    question: 'What is the primary purpose of photosynthesis?',
    answer: 'To convert light energy into chemical energy',
    timestamp: '02:15',
    timestampSeconds: 135,
  };

  const mockOnCorrectAnswer = jest.fn();
  const mockOnAskTutor = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders checkpoint popup with title and question', () => {
    render(
      <CheckpointPopup
        checkpoint={mockCheckpoint}
        onCorrectAnswer={mockOnCorrectAnswer}
        onAskTutor={mockOnAskTutor}
      />
    );

    expect(screen.getByText('Photosynthesis Definition')).toBeInTheDocument();
    expect(screen.getByText('Understanding what photosynthesis is and why plants need it.')).toBeInTheDocument();
    expect(screen.getByText('What is the primary purpose of photosynthesis?')).toBeInTheDocument();
  });

  test('displays answer input field', () => {
    render(
      <CheckpointPopup
        checkpoint={mockCheckpoint}
        onCorrectAnswer={mockOnCorrectAnswer}
        onAskTutor={mockOnAskTutor}
      />
    );

    const input = screen.getByPlaceholderText('Type your answer here...');
    expect(input).toBeInTheDocument();
    expect(input).toHaveFocus();
  });

  test('submit button is disabled when input is empty', () => {
    render(
      <CheckpointPopup
        checkpoint={mockCheckpoint}
        onCorrectAnswer={mockOnCorrectAnswer}
        onAskTutor={mockOnAskTutor}
      />
    );

    const submitButton = screen.getByText('Submit Answer');
    expect(submitButton).toBeDisabled();
  });

  test('submit button is enabled when input has text', () => {
    render(
      <CheckpointPopup
        checkpoint={mockCheckpoint}
        onCorrectAnswer={mockOnCorrectAnswer}
        onAskTutor={mockOnAskTutor}
      />
    );

    const input = screen.getByPlaceholderText('Type your answer here...');
    fireEvent.change(input, { target: { value: 'some answer' } });

    const submitButton = screen.getByText('Submit Answer');
    expect(submitButton).not.toBeDisabled();
  });

  test('shows success feedback for correct answer', async () => {
    render(
      <CheckpointPopup
        checkpoint={mockCheckpoint}
        onCorrectAnswer={mockOnCorrectAnswer}
        onAskTutor={mockOnAskTutor}
      />
    );

    const input = screen.getByPlaceholderText('Type your answer here...');
    fireEvent.change(input, { target: { value: 'To convert light energy into chemical energy' } });

    const submitButton = screen.getByText('Submit Answer');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Great job! That's correct!")).toBeInTheDocument();
    });
  });

  test('calls onCorrectAnswer after correct answer with delay', async () => {
    jest.useFakeTimers();

    render(
      <CheckpointPopup
        checkpoint={mockCheckpoint}
        onCorrectAnswer={mockOnCorrectAnswer}
        onAskTutor={mockOnAskTutor}
      />
    );

    const input = screen.getByPlaceholderText('Type your answer here...');
    fireEvent.change(input, { target: { value: 'To convert light energy into chemical energy' } });

    const submitButton = screen.getByText('Submit Answer');
    fireEvent.click(submitButton);

    expect(mockOnCorrectAnswer).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1500);

    await waitFor(() => {
      expect(mockOnCorrectAnswer).toHaveBeenCalledTimes(1);
    });

    jest.useRealTimers();
  });

  test('shows error feedback for incorrect answer', async () => {
    render(
      <CheckpointPopup
        checkpoint={mockCheckpoint}
        onCorrectAnswer={mockOnCorrectAnswer}
        onAskTutor={mockOnAskTutor}
      />
    );

    const input = screen.getByPlaceholderText('Type your answer here...');
    fireEvent.change(input, { target: { value: 'wrong answer' } });

    const submitButton = screen.getByText('Submit Answer');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Not quite right. Try again or ask the AI tutor for help!')).toBeInTheDocument();
    });
  });

  test('shows Try Again and Ask AI Tutor buttons on incorrect answer', async () => {
    render(
      <CheckpointPopup
        checkpoint={mockCheckpoint}
        onCorrectAnswer={mockOnCorrectAnswer}
        onAskTutor={mockOnAskTutor}
      />
    );

    const input = screen.getByPlaceholderText('Type your answer here...');
    fireEvent.change(input, { target: { value: 'wrong answer' } });

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
      />
    );

    const input = screen.getByPlaceholderText('Type your answer here...');
    fireEvent.change(input, { target: { value: 'wrong answer' } });

    const submitButton = screen.getByText('Submit Answer');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    const tryAgainButton = screen.getByText('Try Again');
    fireEvent.click(tryAgainButton);

    // Input should be visible and empty again
    const newInput = screen.getByPlaceholderText('Type your answer here...');
    expect(newInput).toBeInTheDocument();
    expect(newInput.value).toBe('');
  });

  test('Ask AI Tutor button calls onAskTutor with checkpoint', async () => {
    render(
      <CheckpointPopup
        checkpoint={mockCheckpoint}
        onCorrectAnswer={mockOnCorrectAnswer}
        onAskTutor={mockOnAskTutor}
      />
    );

    const input = screen.getByPlaceholderText('Type your answer here...');
    fireEvent.change(input, { target: { value: 'wrong answer' } });

    const submitButton = screen.getByText('Submit Answer');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Ask AI Tutor')).toBeInTheDocument();
    });

    const askTutorButton = screen.getByText('Ask AI Tutor');
    fireEvent.click(askTutorButton);

    expect(mockOnAskTutor).toHaveBeenCalledWith(mockCheckpoint);
  });

  test('answer validation is case-insensitive', async () => {
    render(
      <CheckpointPopup
        checkpoint={mockCheckpoint}
        onCorrectAnswer={mockOnCorrectAnswer}
        onAskTutor={mockOnAskTutor}
      />
    );

    const input = screen.getByPlaceholderText('Type your answer here...');
    fireEvent.change(input, { target: { value: 'TO CONVERT LIGHT ENERGY INTO CHEMICAL ENERGY' } });

    const submitButton = screen.getByText('Submit Answer');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Great job! That's correct!")).toBeInTheDocument();
    });
  });

  test('answer validation trims whitespace', async () => {
    render(
      <CheckpointPopup
        checkpoint={mockCheckpoint}
        onCorrectAnswer={mockOnCorrectAnswer}
        onAskTutor={mockOnAskTutor}
      />
    );

    const input = screen.getByPlaceholderText('Type your answer here...');
    fireEvent.change(input, { target: { value: '  To convert light energy into chemical energy  ' } });

    const submitButton = screen.getByText('Submit Answer');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Great job! That's correct!")).toBeInTheDocument();
    });
  });

  test('Enter key submits the answer', async () => {
    render(
      <CheckpointPopup
        checkpoint={mockCheckpoint}
        onCorrectAnswer={mockOnCorrectAnswer}
        onAskTutor={mockOnAskTutor}
      />
    );

    const input = screen.getByPlaceholderText('Type your answer here...');
    fireEvent.change(input, { target: { value: 'To convert light energy into chemical energy' } });
    fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });

    await waitFor(() => {
      expect(screen.getByText("Great job! That's correct!")).toBeInTheDocument();
    });
  });

  test('does not submit empty answer on Enter key', () => {
    render(
      <CheckpointPopup
        checkpoint={mockCheckpoint}
        onCorrectAnswer={mockOnCorrectAnswer}
        onAskTutor={mockOnAskTutor}
      />
    );

    const input = screen.getByPlaceholderText('Type your answer here...');
    fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });

    // Should still show input field, no feedback
    expect(input).toBeInTheDocument();
    expect(screen.queryByText("Great job! That's correct!")).not.toBeInTheDocument();
    expect(screen.queryByText('Not quite right')).not.toBeInTheDocument();
  });

  test('renders checkpoint icon in header', () => {
    render(
      <CheckpointPopup
        checkpoint={mockCheckpoint}
        onCorrectAnswer={mockOnCorrectAnswer}
        onAskTutor={mockOnAskTutor}
      />
    );

    expect(screen.getByText('🎯')).toBeInTheDocument();
  });

  test('displays correct feedback icon for correct answer', async () => {
    render(
      <CheckpointPopup
        checkpoint={mockCheckpoint}
        onCorrectAnswer={mockOnCorrectAnswer}
        onAskTutor={mockOnAskTutor}
      />
    );

    const input = screen.getByPlaceholderText('Type your answer here...');
    fireEvent.change(input, { target: { value: 'To convert light energy into chemical energy' } });

    const submitButton = screen.getByText('Submit Answer');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('✅')).toBeInTheDocument();
    });
  });

  test('displays incorrect feedback icon for wrong answer', async () => {
    render(
      <CheckpointPopup
        checkpoint={mockCheckpoint}
        onCorrectAnswer={mockOnCorrectAnswer}
        onAskTutor={mockOnAskTutor}
      />
    );

    const input = screen.getByPlaceholderText('Type your answer here...');
    fireEvent.change(input, { target: { value: 'wrong answer' } });

    const submitButton = screen.getByText('Submit Answer');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('❌')).toBeInTheDocument();
    });
  });
});
