/**
 * Unit tests for CheckpointProgressBar component
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CheckpointProgressBar from '../CheckpointProgressBar';
import { llmService } from '../../services';

// Mock the services
jest.mock('../../services', () => ({
  llmService: {
    getCheckpointProgress: jest.fn(),
  },
}));

// Mock CSS imports
jest.mock('../CheckpointProgressBar.css', () => ({}));

describe('CheckpointProgressBar', () => {
  const mockCheckpoints = [
    {
      id: 1,
      title: 'Introduction to Photosynthesis',
      timestampSeconds: 30,
      question: 'What is photosynthesis?',
    },
    {
      id: 2,
      title: 'Light-dependent Reactions',
      timestampSeconds: 120,
      question: 'Where do light reactions occur?',
    },
    {
      id: 3,
      title: 'Calvin Cycle',
      timestampSeconds: 240,
      question: 'What is the Calvin Cycle?',
    },
  ];

  const mockVideoDuration = 300; // 5 minutes
  const mockVideoId = 123;
  const mockOnCheckpointClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    llmService.getCheckpointProgress.mockResolvedValue({
      totalCheckpoints: 3,
      completedCheckpoints: 0,
      progressPercentage: 0,
      completions: [],
    });
  });

  // ========== RENDERING TESTS ==========

  describe('Rendering', () => {
    test('renders progress bar with checkpoints', async () => {
      render(
        <CheckpointProgressBar
          videoId={mockVideoId}
          videoDuration={mockVideoDuration}
          checkpoints={mockCheckpoints}
          checkpointsCompleted={new Set()}
          onCheckpointClick={mockOnCheckpointClick}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Introduction to Photosynthesis/)).toBeInTheDocument();
        expect(screen.getByText(/Light-dependent Reactions/)).toBeInTheDocument();
        expect(screen.getByText(/Calvin Cycle/)).toBeInTheDocument();
      });
    });

    test('renders correct number of checkpoint markers', async () => {
      const { container } = render(
        <CheckpointProgressBar
          videoId={mockVideoId}
          videoDuration={mockVideoDuration}
          checkpoints={mockCheckpoints}
          checkpointsCompleted={new Set()}
          onCheckpointClick={mockOnCheckpointClick}
        />
      );

      await waitFor(() => {
        const markers = container.querySelectorAll('.checkpoint-marker');
        expect(markers.length).toBe(3);
      });
    });

    test('does not render when checkpoints array is empty', () => {
      const { container } = render(
        <CheckpointProgressBar
          videoId={mockVideoId}
          videoDuration={mockVideoDuration}
          checkpoints={[]}
          checkpointsCompleted={new Set()}
          onCheckpointClick={mockOnCheckpointClick}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    test('does not render when checkpoints is undefined', () => {
      const { container } = render(
        <CheckpointProgressBar
          videoId={mockVideoId}
          videoDuration={mockVideoDuration}
          checkpoints={undefined}
          checkpointsCompleted={new Set()}
          onCheckpointClick={mockOnCheckpointClick}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    test('does not render when video duration is invalid', () => {
      const { container } = render(
        <CheckpointProgressBar
          videoId={mockVideoId}
          videoDuration={0}
          checkpoints={mockCheckpoints}
          checkpointsCompleted={new Set()}
          onCheckpointClick={mockOnCheckpointClick}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    test('does not render when video duration is negative', () => {
      const { container } = render(
        <CheckpointProgressBar
          videoId={mockVideoId}
          videoDuration={-10}
          checkpoints={mockCheckpoints}
          checkpointsCompleted={new Set()}
          onCheckpointClick={mockOnCheckpointClick}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    test('renders with main container classes', async () => {
      const { container } = render(
        <CheckpointProgressBar
          videoId={mockVideoId}
          videoDuration={mockVideoDuration}
          checkpoints={mockCheckpoints}
          checkpointsCompleted={new Set()}
          onCheckpointClick={mockOnCheckpointClick}
        />
      );

      await waitFor(() => {
        expect(container.querySelector('.checkpoint-progress-bar')).toBeInTheDocument();
        expect(container.querySelector('.progress-bar-container')).toBeInTheDocument();
        expect(container.querySelector('.progress-bar-track')).toBeInTheDocument();
      });
    });
  });

  // ========== CHECKPOINT POSITIONING TESTS ==========

  describe('Checkpoint Positioning', () => {
    test('calculates correct position for checkpoint at start', async () => {
      const checkpointsAtStart = [
        { id: 1, title: 'Start', timestampSeconds: 0 },
      ];

      const { container } = render(
        <CheckpointProgressBar
          videoId={mockVideoId}
          videoDuration={100}
          checkpoints={checkpointsAtStart}
          checkpointsCompleted={new Set()}
          onCheckpointClick={mockOnCheckpointClick}
        />
      );

      await waitFor(() => {
        const marker = container.querySelector('.checkpoint-marker');
        expect(marker).toHaveStyle({ left: '0%' });
      });
    });

    test('calculates correct position for checkpoint at middle', async () => {
      const checkpointsAtMiddle = [
        { id: 1, title: 'Middle', timestampSeconds: 150 },
      ];

      const { container } = render(
        <CheckpointProgressBar
          videoId={mockVideoId}
          videoDuration={300}
          checkpoints={checkpointsAtMiddle}
          checkpointsCompleted={new Set()}
          onCheckpointClick={mockOnCheckpointClick}
        />
      );

      await waitFor(() => {
        const marker = container.querySelector('.checkpoint-marker');
        expect(marker).toHaveStyle({ left: '50%' });
      });
    });

    test('calculates correct position for checkpoint at end', async () => {
      const checkpointsAtEnd = [
        { id: 1, title: 'End', timestampSeconds: 300 },
      ];

      const { container } = render(
        <CheckpointProgressBar
          videoId={mockVideoId}
          videoDuration={300}
          checkpoints={checkpointsAtEnd}
          checkpointsCompleted={new Set()}
          onCheckpointClick={mockOnCheckpointClick}
        />
      );

      await waitFor(() => {
        const marker = container.querySelector('.checkpoint-marker');
        expect(marker).toHaveStyle({ left: '100%' });
      });
    });

    test('positions multiple checkpoints correctly', async () => {
      const { container } = render(
        <CheckpointProgressBar
          videoId={mockVideoId}
          videoDuration={mockVideoDuration}
          checkpoints={mockCheckpoints}
          checkpointsCompleted={new Set()}
          onCheckpointClick={mockOnCheckpointClick}
        />
      );

      await waitFor(() => {
        const markers = container.querySelectorAll('.checkpoint-marker');
        expect(markers[0]).toHaveStyle({ left: '10%' }); // 30/300 = 10%
        expect(markers[1]).toHaveStyle({ left: '40%' }); // 120/300 = 40%
        expect(markers[2]).toHaveStyle({ left: '80%' }); // 240/300 = 80%
      });
    });
  });

  // ========== CHECKPOINT COMPLETION TESTS ==========

  describe('Checkpoint Completion Status', () => {
    test('marks checkpoint as completed from local set', async () => {
      const completedSet = new Set([1]);

      const { container } = render(
        <CheckpointProgressBar
          videoId={mockVideoId}
          videoDuration={mockVideoDuration}
          checkpoints={mockCheckpoints}
          checkpointsCompleted={completedSet}
          onCheckpointClick={mockOnCheckpointClick}
        />
      );

      await waitFor(() => {
        const markers = container.querySelectorAll('.checkpoint-marker');
        expect(markers[0]).toHaveClass('completed');
        expect(markers[1]).not.toHaveClass('completed');
        expect(markers[2]).not.toHaveClass('completed');
      });
    });

    test('marks multiple checkpoints as completed', async () => {
      const completedSet = new Set([1, 3]);

      const { container } = render(
        <CheckpointProgressBar
          videoId={mockVideoId}
          videoDuration={mockVideoDuration}
          checkpoints={mockCheckpoints}
          checkpointsCompleted={completedSet}
          onCheckpointClick={mockOnCheckpointClick}
        />
      );

      await waitFor(() => {
        const markers = container.querySelectorAll('.checkpoint-marker');
        expect(markers[0]).toHaveClass('completed');
        expect(markers[1]).not.toHaveClass('completed');
        expect(markers[2]).toHaveClass('completed');
      });
    });

    test('marks checkpoint as completed from backend progress data', async () => {
      llmService.getCheckpointProgress.mockResolvedValue({
        totalCheckpoints: 3,
        completedCheckpoints: 1,
        progressPercentage: 33.33,
        completions: [
          { checkpointId: 2, isCompleted: true, completedAt: '2025-12-15T10:00:00Z' },
        ],
      });

      const { container } = render(
        <CheckpointProgressBar
          videoId={mockVideoId}
          videoDuration={mockVideoDuration}
          checkpoints={mockCheckpoints}
          checkpointsCompleted={new Set()}
          onCheckpointClick={mockOnCheckpointClick}
        />
      );

      await waitFor(() => {
        const markers = container.querySelectorAll('.checkpoint-marker');
        expect(markers[1]).toHaveClass('completed');
      });
    });

    test('prioritizes local completion set over backend data', async () => {
      llmService.getCheckpointProgress.mockResolvedValue({
        totalCheckpoints: 3,
        completedCheckpoints: 1,
        progressPercentage: 33.33,
        completions: [
          { checkpointId: 2, isCompleted: false },
        ],
      });

      const completedSet = new Set([2]); // Local says completed

      const { container } = render(
        <CheckpointProgressBar
          videoId={mockVideoId}
          videoDuration={mockVideoDuration}
          checkpoints={mockCheckpoints}
          checkpointsCompleted={completedSet}
          onCheckpointClick={mockOnCheckpointClick}
        />
      );

      await waitFor(() => {
        const markers = container.querySelectorAll('.checkpoint-marker');
        expect(markers[1]).toHaveClass('completed');
      });
    });

    test('displays checkmark in tooltip for completed checkpoints', async () => {
      const completedSet = new Set([1]);

      render(
        <CheckpointProgressBar
          videoId={mockVideoId}
          videoDuration={mockVideoDuration}
          checkpoints={mockCheckpoints}
          checkpointsCompleted={completedSet}
          onCheckpointClick={mockOnCheckpointClick}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/0:30 - Introduction to Photosynthesis ✓/)).toBeInTheDocument();
      });
    });

    test('does not display checkmark for incomplete checkpoints', async () => {
      render(
        <CheckpointProgressBar
          videoId={mockVideoId}
          videoDuration={mockVideoDuration}
          checkpoints={mockCheckpoints}
          checkpointsCompleted={new Set()}
          onCheckpointClick={mockOnCheckpointClick}
        />
      );

      await waitFor(() => {
        const tooltip = screen.getByText(/2:00 - Light-dependent Reactions/);
        expect(tooltip.textContent).not.toContain('✓');
      });
    });
  });

  // ========== CLICK INTERACTION TESTS ==========

  describe('Click Interactions', () => {
    test('calls onCheckpointClick when checkpoint is clicked', async () => {
      const { container } = render(
        <CheckpointProgressBar
          videoId={mockVideoId}
          videoDuration={mockVideoDuration}
          checkpoints={mockCheckpoints}
          checkpointsCompleted={new Set()}
          onCheckpointClick={mockOnCheckpointClick}
        />
      );

      await waitFor(() => {
        const marker = container.querySelector('.checkpoint-marker');
        fireEvent.click(marker);
      });

      expect(mockOnCheckpointClick).toHaveBeenCalledWith(30);
    });

    test('calls onCheckpointClick with correct timestamp for each checkpoint', async () => {
      const { container } = render(
        <CheckpointProgressBar
          videoId={mockVideoId}
          videoDuration={mockVideoDuration}
          checkpoints={mockCheckpoints}
          checkpointsCompleted={new Set()}
          onCheckpointClick={mockOnCheckpointClick}
        />
      );

      await waitFor(() => {
        const markers = container.querySelectorAll('.checkpoint-marker');
        
        fireEvent.click(markers[0]);
        expect(mockOnCheckpointClick).toHaveBeenCalledWith(30);
        
        fireEvent.click(markers[1]);
        expect(mockOnCheckpointClick).toHaveBeenCalledWith(120);
        
        fireEvent.click(markers[2]);
        expect(mockOnCheckpointClick).toHaveBeenCalledWith(240);
      });
    });

    test('does not call onCheckpointClick if callback is not provided', async () => {
      const { container } = render(
        <CheckpointProgressBar
          videoId={mockVideoId}
          videoDuration={mockVideoDuration}
          checkpoints={mockCheckpoints}
          checkpointsCompleted={new Set()}
          onCheckpointClick={undefined}
        />
      );

      await waitFor(() => {
        const marker = container.querySelector('.checkpoint-marker');
        fireEvent.click(marker);
      });

      // Should not throw error
      expect(mockOnCheckpointClick).not.toHaveBeenCalled();
    });

    test('does not call onCheckpointClick if timestampSeconds is missing', async () => {
      const invalidCheckpoint = [
        { id: 1, title: 'Invalid', timestampSeconds: undefined },
      ];

      const { container } = render(
        <CheckpointProgressBar
          videoId={mockVideoId}
          videoDuration={mockVideoDuration}
          checkpoints={invalidCheckpoint}
          checkpointsCompleted={new Set()}
          onCheckpointClick={mockOnCheckpointClick}
        />
      );

      await waitFor(() => {
        const marker = container.querySelector('.checkpoint-marker');
        fireEvent.click(marker);
      });

      expect(mockOnCheckpointClick).not.toHaveBeenCalled();
    });
  });

  // ========== KEYBOARD INTERACTION TESTS ==========

  describe('Keyboard Interactions', () => {
    test('calls onCheckpointClick when Enter key is pressed', async () => {
      const { container } = render(
        <CheckpointProgressBar
          videoId={mockVideoId}
          videoDuration={mockVideoDuration}
          checkpoints={mockCheckpoints}
          checkpointsCompleted={new Set()}
          onCheckpointClick={mockOnCheckpointClick}
        />
      );

      await waitFor(() => {
        const marker = container.querySelector('.checkpoint-marker');
        fireEvent.keyDown(marker, { key: 'Enter' });
      });

      expect(mockOnCheckpointClick).toHaveBeenCalledWith(30);
    });

    test('calls onCheckpointClick when Space key is pressed', async () => {
      const { container } = render(
        <CheckpointProgressBar
          videoId={mockVideoId}
          videoDuration={mockVideoDuration}
          checkpoints={mockCheckpoints}
          checkpointsCompleted={new Set()}
          onCheckpointClick={mockOnCheckpointClick}
        />
      );

      await waitFor(() => {
        const marker = container.querySelector('.checkpoint-marker');
        fireEvent.keyDown(marker, { key: ' ' });
      });

      expect(mockOnCheckpointClick).toHaveBeenCalledWith(30);
    });

    test('does not call onCheckpointClick for other keys', async () => {
      const { container } = render(
        <CheckpointProgressBar
          videoId={mockVideoId}
          videoDuration={mockVideoDuration}
          checkpoints={mockCheckpoints}
          checkpointsCompleted={new Set()}
          onCheckpointClick={mockOnCheckpointClick}
        />
      );

      await waitFor(() => {
        const marker = container.querySelector('.checkpoint-marker');
        fireEvent.keyDown(marker, { key: 'Tab' });
        fireEvent.keyDown(marker, { key: 'Escape' });
      });

      expect(mockOnCheckpointClick).not.toHaveBeenCalled();
    });

    test('calls onCheckpointClick for Space key', async () => {
      const { container } = render(
        <CheckpointProgressBar
          videoId={mockVideoId}
          videoDuration={mockVideoDuration}
          checkpoints={mockCheckpoints}
          checkpointsCompleted={new Set()}
          onCheckpointClick={mockOnCheckpointClick}
        />
      );

      await waitFor(() => {
        const marker = container.querySelector('.checkpoint-marker');
        fireEvent.keyDown(marker, { key: ' ' });
        
        expect(mockOnCheckpointClick).toHaveBeenCalledWith(30);
      });
    });
  });

  // ========== TIME FORMATTING TESTS ==========

  describe('Time Formatting', () => {
    test('formats time correctly for seconds (MM:SS)', async () => {
      const checkpointWithSeconds = [
        { id: 1, title: 'Test', timestampSeconds: 45 },
      ];

      render(
        <CheckpointProgressBar
          videoId={mockVideoId}
          videoDuration={100}
          checkpoints={checkpointWithSeconds}
          checkpointsCompleted={new Set()}
          onCheckpointClick={mockOnCheckpointClick}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/0:45/)).toBeInTheDocument();
      });
    });

    test('formats time correctly for minutes (MM:SS)', async () => {
      const checkpointWithMinutes = [
        { id: 1, title: 'Test', timestampSeconds: 125 },
      ];

      render(
        <CheckpointProgressBar
          videoId={mockVideoId}
          videoDuration={200}
          checkpoints={checkpointWithMinutes}
          checkpointsCompleted={new Set()}
          onCheckpointClick={mockOnCheckpointClick}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/2:05/)).toBeInTheDocument();
      });
    });

    test('formats time correctly for hours (HH:MM:SS)', async () => {
      const checkpointWithHours = [
        { id: 1, title: 'Test', timestampSeconds: 3665 }, // 1 hour, 1 minute, 5 seconds
      ];

      render(
        <CheckpointProgressBar
          videoId={mockVideoId}
          videoDuration={4000}
          checkpoints={checkpointWithHours}
          checkpointsCompleted={new Set()}
          onCheckpointClick={mockOnCheckpointClick}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/1:01:05/)).toBeInTheDocument();
      });
    });

    test('pads minutes and seconds with leading zeros', async () => {
      const checkpoint = [
        { id: 1, title: 'Test', timestampSeconds: 305 }, // 5:05
      ];

      render(
        <CheckpointProgressBar
          videoId={mockVideoId}
          videoDuration={400}
          checkpoints={checkpoint}
          checkpointsCompleted={new Set()}
          onCheckpointClick={mockOnCheckpointClick}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/5:05/)).toBeInTheDocument();
      });
    });

    test('formats time at zero correctly', async () => {
      const checkpoint = [
        { id: 1, title: 'Test', timestampSeconds: 0 },
      ];

      render(
        <CheckpointProgressBar
          videoId={mockVideoId}
          videoDuration={100}
          checkpoints={checkpoint}
          checkpointsCompleted={new Set()}
          onCheckpointClick={mockOnCheckpointClick}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/0:00/)).toBeInTheDocument();
      });
    });
  });

  // ========== PROGRESS SUMMARY TESTS ==========

  describe('Progress Summary', () => {
    test('displays progress summary when progress data is available', async () => {
      llmService.getCheckpointProgress.mockResolvedValue({
        totalCheckpoints: 3,
        completedCheckpoints: 2,
        progressPercentage: 66.67,
        completions: [],
      });

      render(
        <CheckpointProgressBar
          videoId={mockVideoId}
          videoDuration={mockVideoDuration}
          checkpoints={mockCheckpoints}
          checkpointsCompleted={new Set()}
          onCheckpointClick={mockOnCheckpointClick}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/2 of 3 checkpoints completed/)).toBeInTheDocument();
        expect(screen.getByText(/67%/)).toBeInTheDocument();
      });
    });

    test('does not display progress summary when progress data is not available', async () => {
      llmService.getCheckpointProgress.mockResolvedValue(null);

      const { container } = render(
        <CheckpointProgressBar
          videoId={mockVideoId}
          videoDuration={mockVideoDuration}
          checkpoints={mockCheckpoints}
          checkpointsCompleted={new Set()}
          onCheckpointClick={mockOnCheckpointClick}
        />
      );

      await waitFor(() => {
        expect(container.querySelector('.progress-summary')).not.toBeInTheDocument();
      });
    });

    test('does not display progress summary when totalCheckpoints is zero', async () => {
      llmService.getCheckpointProgress.mockResolvedValue({
        totalCheckpoints: 0,
        completedCheckpoints: 0,
        progressPercentage: 0,
        completions: [],
      });

      const { container } = render(
        <CheckpointProgressBar
          videoId={mockVideoId}
          videoDuration={mockVideoDuration}
          checkpoints={mockCheckpoints}
          checkpointsCompleted={new Set()}
          onCheckpointClick={mockOnCheckpointClick}
        />
      );

      await waitFor(() => {
        expect(container.querySelector('.progress-summary')).not.toBeInTheDocument();
      });
    });

    test('rounds progress percentage correctly', async () => {
      llmService.getCheckpointProgress.mockResolvedValue({
        totalCheckpoints: 3,
        completedCheckpoints: 1,
        progressPercentage: 33.333333,
        completions: [],
      });

      render(
        <CheckpointProgressBar
          videoId={mockVideoId}
          videoDuration={mockVideoDuration}
          checkpoints={mockCheckpoints}
          checkpointsCompleted={new Set()}
          onCheckpointClick={mockOnCheckpointClick}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/33%/)).toBeInTheDocument();
      });
    });
  });

  // ========== BACKEND PROGRESS FETCH TESTS ==========

  describe('Backend Progress Fetching', () => {
    test('fetches checkpoint progress on mount', async () => {
      render(
        <CheckpointProgressBar
          videoId={mockVideoId}
          videoDuration={mockVideoDuration}
          checkpoints={mockCheckpoints}
          checkpointsCompleted={new Set()}
          onCheckpointClick={mockOnCheckpointClick}
        />
      );

      await waitFor(() => {
        expect(llmService.getCheckpointProgress).toHaveBeenCalledWith(mockVideoId);
      });
    });

    test('does not fetch progress if videoId is missing', async () => {
      render(
        <CheckpointProgressBar
          videoId={null}
          videoDuration={mockVideoDuration}
          checkpoints={mockCheckpoints}
          checkpointsCompleted={new Set()}
          onCheckpointClick={mockOnCheckpointClick}
        />
      );

      await waitFor(() => {
        expect(llmService.getCheckpointProgress).not.toHaveBeenCalled();
      });
    });

    test('handles progress fetch error gracefully', async () => {
      llmService.getCheckpointProgress.mockRejectedValue(new Error('Network error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const { container } = render(
        <CheckpointProgressBar
          videoId={mockVideoId}
          videoDuration={mockVideoDuration}
          checkpoints={mockCheckpoints}
          checkpointsCompleted={new Set()}
          onCheckpointClick={mockOnCheckpointClick}
        />
      );

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Error fetching checkpoint progress:',
          expect.any(Error)
        );
      });

      // Should still render checkpoints even with error
      await waitFor(() => {
        const markers = container.querySelectorAll('.checkpoint-marker');
        expect(markers.length).toBe(3);
      });

      consoleErrorSpy.mockRestore();
    });

    test('refetches progress when videoId changes', async () => {
      const { rerender } = render(
        <CheckpointProgressBar
          videoId={123}
          videoDuration={mockVideoDuration}
          checkpoints={mockCheckpoints}
          checkpointsCompleted={new Set()}
          onCheckpointClick={mockOnCheckpointClick}
        />
      );

      await waitFor(() => {
        expect(llmService.getCheckpointProgress).toHaveBeenCalledWith(123);
      });

      rerender(
        <CheckpointProgressBar
          videoId={456}
          videoDuration={mockVideoDuration}
          checkpoints={mockCheckpoints}
          checkpointsCompleted={new Set()}
          onCheckpointClick={mockOnCheckpointClick}
        />
      );

      await waitFor(() => {
        expect(llmService.getCheckpointProgress).toHaveBeenCalledWith(456);
      });
    });
  });

  // ========== ACCESSIBILITY TESTS ==========

  describe('Accessibility', () => {
    test('checkpoint markers have role="button"', async () => {
      const { container } = render(
        <CheckpointProgressBar
          videoId={mockVideoId}
          videoDuration={mockVideoDuration}
          checkpoints={mockCheckpoints}
          checkpointsCompleted={new Set()}
          onCheckpointClick={mockOnCheckpointClick}
        />
      );

      await waitFor(() => {
        const markers = container.querySelectorAll('[role="button"]');
        expect(markers.length).toBe(3);
      });
    });

    test('checkpoint markers have tabIndex for keyboard navigation', async () => {
      const { container } = render(
        <CheckpointProgressBar
          videoId={mockVideoId}
          videoDuration={mockVideoDuration}
          checkpoints={mockCheckpoints}
          checkpointsCompleted={new Set()}
          onCheckpointClick={mockOnCheckpointClick}
        />
      );

      await waitFor(() => {
        const markers = container.querySelectorAll('.checkpoint-marker');
        markers.forEach(marker => {
          expect(marker).toHaveAttribute('tabIndex', '0');
        });
      });
    });

    test('checkpoint markers have descriptive aria-labels', async () => {
      const { container } = render(
        <CheckpointProgressBar
          videoId={mockVideoId}
          videoDuration={mockVideoDuration}
          checkpoints={mockCheckpoints}
          checkpointsCompleted={new Set()}
          onCheckpointClick={mockOnCheckpointClick}
        />
      );

      await waitFor(() => {
        const marker = container.querySelector('.checkpoint-marker');
        expect(marker).toHaveAttribute('aria-label', 'Checkpoint at 0:30: Introduction to Photosynthesis');
      });
    });

    test('aria-label includes completion status', async () => {
      const completedSet = new Set([1]);

      const { container } = render(
        <CheckpointProgressBar
          videoId={mockVideoId}
          videoDuration={mockVideoDuration}
          checkpoints={mockCheckpoints}
          checkpointsCompleted={completedSet}
          onCheckpointClick={mockOnCheckpointClick}
        />
      );

      await waitFor(() => {
        const marker = container.querySelector('.checkpoint-marker');
        expect(marker).toHaveAttribute('aria-label', 'Checkpoint at 0:30: Introduction to Photosynthesis');
      });
    });
  });

  // ========== TOOLTIP TESTS ==========

  describe('Tooltips', () => {
    test('displays tooltip with timestamp and title', async () => {
      render(
        <CheckpointProgressBar
          videoId={mockVideoId}
          videoDuration={mockVideoDuration}
          checkpoints={mockCheckpoints}
          checkpointsCompleted={new Set()}
          onCheckpointClick={mockOnCheckpointClick}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/0:30 - Introduction to Photosynthesis/)).toBeInTheDocument();
        expect(screen.getByText(/2:00 - Light-dependent Reactions/)).toBeInTheDocument();
        expect(screen.getByText(/4:00 - Calvin Cycle/)).toBeInTheDocument();
      });
    });

    test('tooltips have correct CSS class', async () => {
      const { container } = render(
        <CheckpointProgressBar
          videoId={mockVideoId}
          videoDuration={mockVideoDuration}
          checkpoints={mockCheckpoints}
          checkpointsCompleted={new Set()}
          onCheckpointClick={mockOnCheckpointClick}
        />
      );

      await waitFor(() => {
        const tooltips = container.querySelectorAll('.checkpoint-tooltip');
        expect(tooltips.length).toBe(3);
      });
    });
  });
});
