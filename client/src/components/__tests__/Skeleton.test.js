/**
 * Tests for Skeleton Loading Components
 *
 * Verifies that skeleton components render correctly and have
 * proper accessibility attributes for screen readers.
 */

import { render, screen } from '@testing-library/react';
import { Skeleton, SkeletonVideoCard, SkeletonQuizCard, SkeletonSummary } from '../Skeleton';

describe('Skeleton Component', () => {
  describe('Base Skeleton', () => {
    test('renders with default text variant', () => {
      render(<Skeleton />);
      const skeleton = screen.getByRole('status');
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveClass('skeleton', 'skeleton-text');
    });

    test('renders with circular variant', () => {
      render(<Skeleton variant="circular" />);
      const skeleton = screen.getByRole('status');
      expect(skeleton).toHaveClass('skeleton-circular');
    });

    test('renders with rectangular variant', () => {
      render(<Skeleton variant="rectangular" />);
      const skeleton = screen.getByRole('status');
      expect(skeleton).toHaveClass('skeleton-rectangular');
    });

    test('applies custom width and height', () => {
      render(<Skeleton width="200px" height="50px" />);
      const skeleton = screen.getByRole('status');
      expect(skeleton).toHaveStyle({ width: '200px', height: '50px' });
    });

    test('applies additional className', () => {
      render(<Skeleton className="custom-class" />);
      const skeleton = screen.getByRole('status');
      expect(skeleton).toHaveClass('custom-class');
    });

    test('has accessible loading label', () => {
      render(<Skeleton />);
      const skeleton = screen.getByRole('status');
      expect(skeleton).toHaveAttribute('aria-label', 'Loading...');
    });
  });

  describe('SkeletonVideoCard', () => {
    test('renders video card skeleton layout', () => {
      render(<SkeletonVideoCard />);
      const skeleton = screen.getByRole('status');
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveClass('skeleton-video-card');
    });

    test('has accessible label for video card', () => {
      render(<SkeletonVideoCard />);
      const skeleton = screen.getByRole('status');
      expect(skeleton).toHaveAttribute('aria-label', 'Loading video card...');
    });
  });

  describe('SkeletonQuizCard', () => {
    test('renders quiz card skeleton layout', () => {
      render(<SkeletonQuizCard />);
      const skeleton = screen.getByRole('status');
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveClass('skeleton-quiz-card');
    });

    test('renders four option placeholders', () => {
      const { container } = render(<SkeletonQuizCard />);
      const options = container.querySelectorAll('.skeleton-option');
      expect(options).toHaveLength(4);
    });
  });

  describe('SkeletonSummary', () => {
    test('renders summary skeleton layout', () => {
      render(<SkeletonSummary />);
      const skeleton = screen.getByRole('status');
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveClass('skeleton-summary');
    });
  });
});

