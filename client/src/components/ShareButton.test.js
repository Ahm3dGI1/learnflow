/**
 * Tests for ShareButton Component
 *
 * Verifies that the share button correctly copies video links
 * to clipboard and shows appropriate toast notifications.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ShareButton from './ShareButton';

// Mock clipboard API
const mockWriteText = jest.fn();
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: mockWriteText,
  },
  writable: true,
});

describe('ShareButton', () => {
  beforeEach(() => {
    mockWriteText.mockClear();
    mockWriteText.mockResolvedValue(undefined);
  });

  describe('rendering', () => {
    it('renders share button with text', () => {
      render(<ShareButton videoId="abc123" />);

      const button = screen.getByRole('button', { name: /copy video link/i });
      expect(button).toBeInTheDocument();
      expect(screen.getByText('Share')).toBeInTheDocument();
    });

    it('renders icon-only variant without visible text', () => {
      render(<ShareButton videoId="abc123" variant="icon-only" />);

      const button = screen.getByRole('button', { name: /copy video link/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass('share-button-icon-only');
    });

    it('includes share icon SVG', () => {
      const { container } = render(<ShareButton videoId="abc123" />);

      const svg = container.querySelector('.share-icon');
      expect(svg).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(<ShareButton videoId="abc123" className="custom-class" />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });
  });

  describe('clipboard functionality', () => {
    it('copies YouTube URL to clipboard when clicked', async () => {
      render(<ShareButton videoId="dQw4w9WgXcQ" />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledWith(
          'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
        );
      });
    });

    it('shows success toast after successful copy', async () => {
      render(<ShareButton videoId="abc123" />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(/copied to clipboard/i)).toBeInTheDocument();
      });
    });

    it('shows error toast when no videoId provided', async () => {
      render(<ShareButton videoId="" />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(/no video to share/i)).toBeInTheDocument();
      });
    });

    it('shows error toast when clipboard copy fails', async () => {
      // Mock clipboard failure with no fallback
      mockWriteText.mockRejectedValue(new Error('Clipboard error'));

      // Mock document.execCommand to also fail
      const originalExecCommand = document.execCommand;
      document.execCommand = jest.fn(() => {
        throw new Error('execCommand failed');
      });

      render(<ShareButton videoId="abc123" />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(/failed to copy/i)).toBeInTheDocument();
      });

      document.execCommand = originalExecCommand;
    });
  });

  describe('accessibility', () => {
    it('has accessible label', () => {
      render(<ShareButton videoId="abc123" />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Copy video link to clipboard');
    });

    it('has title for tooltip', () => {
      render(<ShareButton videoId="abc123" />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'Share video link');
    });

    it('icon is hidden from screen readers', () => {
      const { container } = render(<ShareButton videoId="abc123" />);

      const svg = container.querySelector('.share-icon');
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });
  });
});

