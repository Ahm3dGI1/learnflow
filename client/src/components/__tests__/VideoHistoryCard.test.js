/**
 * Unit tests for VideoHistoryCard component
 */

import { render, screen, fireEvent } from '@testing-library/react';
import VideoHistoryCard from '../VideoHistoryCard';

describe('VideoHistoryCard', () => {
  const mockVideo = {
    id: 123,
    videoId: 'abc123',
    title: 'Learn React Testing',
    thumbnailUrl: 'https://img.youtube.com/vi/abc123/mqdefault.jpg',
    lastViewedAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
  };

  const mockProgress = {
    progressPercentage: 45,
    isCompleted: false,
  };

  const mockProgressCompleted = {
    progressPercentage: 100,
    isCompleted: true,
  };

  const mockOnSelect = jest.fn();
  const mockOnDelete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ========== RENDERING TESTS ==========

  test('renders video card with title and thumbnail', () => {
    render(
      <VideoHistoryCard
        video={mockVideo}
        progress={mockProgress}
        onSelect={mockOnSelect}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Learn React Testing')).toBeInTheDocument();
    expect(screen.getByAltText('Learn React Testing')).toBeInTheDocument();
    expect(screen.getByAltText('Learn React Testing')).toHaveAttribute('src', mockVideo.thumbnailUrl);
  });

  test('renders without progress data', () => {
    render(
      <VideoHistoryCard
        video={mockVideo}
        onSelect={mockOnSelect}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Learn React Testing')).toBeInTheDocument();
    expect(screen.queryByText(/watched/)).not.toBeInTheDocument();
  });

  test('renders play overlay icon', () => {
    const { container } = render(
      <VideoHistoryCard
        video={mockVideo}
        progress={mockProgress}
        onSelect={mockOnSelect}
        onDelete={mockOnDelete}
      />
    );

    const playOverlay = container.querySelector('.play-overlay');
    expect(playOverlay).toBeInTheDocument();
  });

  test('renders delete button', () => {
    render(
      <VideoHistoryCard
        video={mockVideo}
        progress={mockProgress}
        onSelect={mockOnSelect}
        onDelete={mockOnDelete}
      />
    );

    const deleteButton = screen.getByRole('button', { name: /delete from history/i });
    expect(deleteButton).toBeInTheDocument();
  });

  // ========== PROGRESS TESTS ==========

  test('shows progress bar for incomplete video', () => {
    const { container } = render(
      <VideoHistoryCard
        video={mockVideo}
        progress={mockProgress}
        onSelect={mockOnSelect}
        onDelete={mockOnDelete}
      />
    );

    const progressBar = container.querySelector('.history-progress-fill');
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveStyle({ width: '45%' });
  });

  test('shows progress percentage text', () => {
    render(
      <VideoHistoryCard
        video={mockVideo}
        progress={mockProgress}
        onSelect={mockOnSelect}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('45% watched')).toBeInTheDocument();
  });

  test('shows completed badge for finished video', () => {
    render(
      <VideoHistoryCard
        video={mockVideo}
        progress={mockProgressCompleted}
        onSelect={mockOnSelect}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('✓ Completed')).toBeInTheDocument();
  });

  test('hides progress bar when video is completed', () => {
    const { container } = render(
      <VideoHistoryCard
        video={mockVideo}
        progress={mockProgressCompleted}
        onSelect={mockOnSelect}
        onDelete={mockOnDelete}
      />
    );

    const progressBar = container.querySelector('.history-progress-fill');
    expect(progressBar).not.toBeInTheDocument();
    expect(screen.queryByText(/watched/)).not.toBeInTheDocument();
  });

  test('rounds progress percentage correctly', () => {
    const partialProgress = {
      progressPercentage: 67.89,
      isCompleted: false,
    };

    render(
      <VideoHistoryCard
        video={mockVideo}
        progress={partialProgress}
        onSelect={mockOnSelect}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('68% watched')).toBeInTheDocument();
  });

  // ========== INTERACTION TESTS ==========

  test('calls onSelect when thumbnail is clicked', () => {
    render(
      <VideoHistoryCard
        video={mockVideo}
        progress={mockProgress}
        onSelect={mockOnSelect}
        onDelete={mockOnDelete}
      />
    );

    const thumbnail = screen.getByAltText('Learn React Testing');
    fireEvent.click(thumbnail.parentElement);

    expect(mockOnSelect).toHaveBeenCalledTimes(1);
    expect(mockOnSelect).toHaveBeenCalledWith(mockVideo);
  });

  test('calls onSelect when title is clicked', () => {
    render(
      <VideoHistoryCard
        video={mockVideo}
        progress={mockProgress}
        onSelect={mockOnSelect}
        onDelete={mockOnDelete}
      />
    );

    const title = screen.getByText('Learn React Testing');
    fireEvent.click(title);

    expect(mockOnSelect).toHaveBeenCalledTimes(1);
    expect(mockOnSelect).toHaveBeenCalledWith(mockVideo);
  });

  test('calls onDelete when delete button is clicked', () => {
    render(
      <VideoHistoryCard
        video={mockVideo}
        progress={mockProgress}
        onSelect={mockOnSelect}
        onDelete={mockOnDelete}
      />
    );

    const deleteButton = screen.getByRole('button', { name: /delete from history/i });
    fireEvent.click(deleteButton);

    expect(mockOnDelete).toHaveBeenCalledTimes(1);
    expect(mockOnDelete).toHaveBeenCalledWith(mockVideo.id);
  });

  // ========== DATE FORMATTING TESTS ==========

  test('shows "minutes ago" for recent videos', () => {
    const recentVideo = {
      ...mockVideo,
      lastViewedAt: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
    };

    render(
      <VideoHistoryCard
        video={recentVideo}
        progress={mockProgress}
        onSelect={mockOnSelect}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText(/30 minutes ago/)).toBeInTheDocument();
  });

  test('uses singular "minute" for 1 minute ago', () => {
    const recentVideo = {
      ...mockVideo,
      lastViewedAt: new Date(Date.now() - 60000).toISOString(), // 1 minute ago
    };

    render(
      <VideoHistoryCard
        video={recentVideo}
        progress={mockProgress}
        onSelect={mockOnSelect}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText(/1 minute ago/)).toBeInTheDocument();
    expect(screen.queryByText(/1 minutes ago/)).not.toBeInTheDocument();
  });

  test('shows "hours ago" for videos viewed today', () => {
    const todayVideo = {
      ...mockVideo,
      lastViewedAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
    };

    render(
      <VideoHistoryCard
        video={todayVideo}
        progress={mockProgress}
        onSelect={mockOnSelect}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText(/2 hours ago/)).toBeInTheDocument();
  });

  test('uses singular "hour" for 1 hour ago', () => {
    const recentVideo = {
      ...mockVideo,
      lastViewedAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    };

    render(
      <VideoHistoryCard
        video={recentVideo}
        progress={mockProgress}
        onSelect={mockOnSelect}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText(/1 hour ago/)).toBeInTheDocument();
    expect(screen.queryByText(/1 hours ago/)).not.toBeInTheDocument();
  });

  test('shows "days ago" for videos from this week', () => {
    const weekVideo = {
      ...mockVideo,
      lastViewedAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
    };

    render(
      <VideoHistoryCard
        video={weekVideo}
        progress={mockProgress}
        onSelect={mockOnSelect}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText(/2 days ago/)).toBeInTheDocument();
  });

  test('uses singular "day" for 1 day ago', () => {
    const yesterdayVideo = {
      ...mockVideo,
      lastViewedAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    };

    render(
      <VideoHistoryCard
        video={yesterdayVideo}
        progress={mockProgress}
        onSelect={mockOnSelect}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText(/1 day ago/)).toBeInTheDocument();
    expect(screen.queryByText(/1 days ago/)).not.toBeInTheDocument();
  });

  test('shows formatted date for older videos', () => {
    const oldVideo = {
      ...mockVideo,
      lastViewedAt: new Date('2024-01-01T10:00:00Z').toISOString(),
    };

    render(
      <VideoHistoryCard
        video={oldVideo}
        progress={mockProgress}
        onSelect={mockOnSelect}
        onDelete={mockOnDelete}
      />
    );

    // Should show formatted date with year
    const dateElement = screen.getByText(/Last viewed/);
    expect(dateElement).toBeInTheDocument();
    expect(dateElement.textContent).toMatch(/Last viewed.+2024/);
  });

  // ========== EDGE CASE TESTS ==========

  test('handles 0% progress', () => {
    const zeroProgress = {
      progressPercentage: 0,
      isCompleted: false,
    };

    const { container } = render(
      <VideoHistoryCard
        video={mockVideo}
        progress={zeroProgress}
        onSelect={mockOnSelect}
        onDelete={mockOnDelete}
      />
    );

    const progressBar = container.querySelector('.history-progress-fill');
    expect(progressBar).toBeInTheDocument();
    // Check that width is explicitly set to 0% in style
    expect(progressBar.style.width).toBe('0%');
    expect(screen.getByText('0% watched')).toBeInTheDocument();
  });

  test('handles missing thumbnail gracefully', () => {
    const videoWithoutThumbnail = {
      ...mockVideo,
      thumbnailUrl: null,
    };

    render(
      <VideoHistoryCard
        video={videoWithoutThumbnail}
        progress={mockProgress}
        onSelect={mockOnSelect}
        onDelete={mockOnDelete}
      />
    );

    const img = screen.getByAltText('Learn React Testing');
    expect(img).toBeInTheDocument();
  });

  test('handles very long video titles', () => {
    const longTitleVideo = {
      ...mockVideo,
      title: 'This is a very long video title that might need to be truncated or wrapped depending on the CSS implementation and available space in the container',
    };

    render(
      <VideoHistoryCard
        video={longTitleVideo}
        progress={mockProgress}
        onSelect={mockOnSelect}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText(longTitleVideo.title)).toBeInTheDocument();
  });

  // ========== ACCESSIBILITY TESTS ==========

  test('delete button has accessible label', () => {
    render(
      <VideoHistoryCard
        video={mockVideo}
        progress={mockProgress}
        onSelect={mockOnSelect}
        onDelete={mockOnDelete}
      />
    );

    const deleteButton = screen.getByRole('button', { name: /delete from history/i });
    expect(deleteButton).toHaveAttribute('aria-label', 'Delete from history');
  });

  test('thumbnail has alt text', () => {
    render(
      <VideoHistoryCard
        video={mockVideo}
        progress={mockProgress}
        onSelect={mockOnSelect}
        onDelete={mockOnDelete}
      />
    );

    const thumbnail = screen.getByAltText('Learn React Testing');
    expect(thumbnail).toBeInTheDocument();
  });
});
