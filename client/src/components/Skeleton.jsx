/**
 * Skeleton Loading Component
 *
 * Displays animated placeholder content while data is loading.
 * Provides a better user experience than showing "Loading..." text
 * by indicating the shape and layout of content that will appear.
 *
 * @module Skeleton
 *
 * @example
 * // Basic text skeleton
 * <Skeleton variant="text" width="200px" />
 *
 * @example
 * // Circular avatar skeleton
 * <Skeleton variant="circular" width="48px" height="48px" />
 *
 * @example
 * // Rectangular card skeleton
 * <Skeleton variant="rectangular" width="100%" height="120px" />
 *
 * @example
 * // Video history card skeleton
 * <SkeletonVideoCard />
 */

import './Skeleton.css';

/**
 * Base Skeleton Component
 *
 * Renders an animated placeholder element that pulses to indicate loading.
 *
 * @param {Object} props - Component props
 * @param {string} [props.variant='text'] - Shape variant: 'text', 'circular', 'rectangular'
 * @param {string} [props.width] - Width of the skeleton (CSS value)
 * @param {string} [props.height] - Height of the skeleton (CSS value)
 * @param {string} [props.className] - Additional CSS classes
 * @returns {React.ReactElement} Skeleton placeholder element
 */
export function Skeleton({
  variant = 'text',
  width,
  height,
  className = '',
  // When used inside a parent container that already provides an ARIA status
  // (e.g. SkeletonVideoCard), set suppressRole to true to avoid nested
  // role="status" regions which can be noisy for screen readers.
  suppressRole = false,
}) {
  const style = {
    width: width || (variant === 'text' ? '100%' : undefined),
    height: height || (variant === 'text' ? '1em' : undefined),
  };

  const commonProps = {
    className: `skeleton skeleton-${variant} ${className}`,
    style,
  };

  if (suppressRole) {
    return <div {...commonProps} />;
  }

  return (
    <div
      {...commonProps}
      role="status"
      aria-label="Loading..."
    />
  );
}

/**
 * Skeleton Video Card Component
 *
 * Pre-built skeleton that matches the VideoHistoryCard layout.
 * Use this in the Dashboard when loading video history.
 *
 * @returns {React.ReactElement} Skeleton matching video card layout
 *
 * @example
 * // In Dashboard.jsx while loading
 * {loading ? (
 *   <SkeletonVideoCard />
 * ) : (
 *   <VideoHistoryCard video={video} />
 * )}
 */
export function SkeletonVideoCard() {
  return (
    <div className="skeleton-video-card" role="status" aria-label="Loading video card...">
      {/* Thumbnail placeholder */}
      <div className="skeleton-thumbnail">
        <Skeleton variant="rectangular" width="100%" height="100%" suppressRole />
      </div>

      {/* Content placeholder */}
      <div className="skeleton-content">
        {/* Title */}
  <Skeleton variant="text" width="85%" height="18px" className="skeleton-title" suppressRole />

        {/* Metadata row */}
        <div className="skeleton-meta">
          <Skeleton variant="text" width="60px" height="14px" suppressRole />
          <Skeleton variant="text" width="80px" height="14px" suppressRole />
        </div>

        {/* Progress bar placeholder */}
        <div className="skeleton-progress">
          <Skeleton variant="rectangular" width="100%" height="6px" suppressRole />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton Quiz Card Component
 *
 * Pre-built skeleton that matches a quiz question card layout.
 *
 * @returns {React.ReactElement} Skeleton matching quiz card layout
 */
export function SkeletonQuizCard() {
  return (
    <div className="skeleton-quiz-card" role="status" aria-label="Loading quiz question...">
      {/* Question number */}
      <Skeleton variant="text" width="100px" height="14px" className="skeleton-question-num" suppressRole />

      {/* Question text */}
      <Skeleton variant="text" width="90%" height="20px" className="skeleton-question" suppressRole />
      <Skeleton variant="text" width="70%" height="20px" suppressRole />

      {/* Options */}
      <div className="skeleton-options">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton
            key={i}
            variant="rectangular"
            width="100%"
            height="48px"
            className="skeleton-option"
            suppressRole
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton Summary Component
 *
 * Pre-built skeleton that matches the VideoSummary layout.
 *
 * @returns {React.ReactElement} Skeleton matching summary layout
 */
export function SkeletonSummary() {
  return (
    <div className="skeleton-summary" role="status" aria-label="Loading summary...">
      <Skeleton variant="text" width="150px" height="24px" className="skeleton-summary-title" suppressRole />
      <Skeleton variant="text" width="100%" height="16px" suppressRole />
      <Skeleton variant="text" width="100%" height="16px" suppressRole />
      <Skeleton variant="text" width="100%" height="16px" suppressRole />
      <Skeleton variant="text" width="75%" height="16px" suppressRole />
    </div>
  );
}

export default Skeleton;

