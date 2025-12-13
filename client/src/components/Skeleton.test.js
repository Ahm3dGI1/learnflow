/**
 * Tests for Skeleton Loading Components
 *
 * Verifies that skeleton components render correctly and have
 * proper accessibility attributes for screen readers.
 */

import { render, screen } from '@testing-library/react';
import { Skeleton, SkeletonVideoCard, SkeletonQuizCard, SkeletonSummary } from './Skeleton';

describe('Skeleton Component', () => {
  describe('Base Skeleton', () => {
    it('renders with default text variant', () => {
      render(<Skeleton />);
      const skeleton = screen.getByRole('status');
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveClass('skeleton', 'skeleton-text');
    });

    it('renders with circular variant', () => {
      render(<Skeleton variant="circular" />);
      const skeleton = screen.getByRole('status');
      expect(skeleton).toHaveClass('skeleton-circular');
    });

    it('renders with rectangular variant', () => {
      render(<Skeleton variant="rectangular" />);
      const skeleton = screen.getByRole('status');
      expect(skeleton).toHaveClass('skeleton-rectangular');
    });

    it('applies custom width and height', () => {
      render(<Skeleton width="200px" height="50px" />);
      const skeleton = screen.getByRole('status');
      expect(skeleton).toHaveStyle({ width: '200px', height: '50px' });
    });

    it('applies additional className', () => {
      render(<Skeleton className="custom-class" />);
      const skeleton = screen.getByRole('status');
      expect(skeleton).toHaveClass('custom-class');
    });

    it('has accessible loading label', () => {
      render(<Skeleton />);
      const skeleton = screen.getByRole('status');
      expect(skeleton).toHaveAttribute('aria-label', 'Loading...');
    });
  });

  describe('SkeletonVideoCard', () => {
    it('renders video card skeleton layout', () => {
      render(<SkeletonVideoCard />);
      const skeleton = screen.getByRole('status');
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveClass('skeleton-video-card');
    });

    it('has accessible label for video card', () => {
      render(<SkeletonVideoCard />);
      const skeleton = screen.getByRole('status');
      expect(skeleton).toHaveAttribute('aria-label', 'Loading video card...');
    });
  });

  describe('SkeletonQuizCard', () => {
    it('renders quiz card skeleton layout', () => {
      render(<SkeletonQuizCard />);
      const skeleton = screen.getByRole('status');
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveClass('skeleton-quiz-card');
    });

    it('renders four option placeholders', () => {
      const { container } = render(<SkeletonQuizCard />);
      const options = container.querySelectorAll('.skeleton-option');
      expect(options).toHaveLength(4);
    });
  });

  describe('SkeletonSummary', () => {
    it('renders summary skeleton layout', () => {
      render(<SkeletonSummary />);
      const skeleton = screen.getByRole('status');
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveClass('skeleton-summary');
    });
  });
});

