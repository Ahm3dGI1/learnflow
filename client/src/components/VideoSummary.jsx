/**
 * Video Summary Component
 *
 * Displays AI-generated summary of video content below the video player.
 * Shows a concise 2-3 paragraph overview of what the video covers,
 * helping learners quickly understand the content before or after watching.
 *
 * @module VideoSummary
 */

import { useState } from 'react';
import './VideoSummary.css';

/**
 * VideoSummary Component
 *
 * Collapsible summary section that displays AI-generated video overview.
 * Includes loading state, error handling, and smooth expand/collapse animation.
 *
 * @param {Object} props - Component props
 * @param {string} props.summary - The summary text to display (2-3 paragraphs)
 * @param {boolean} props.loading - Whether summary is being generated
 * @param {string} props.error - Error message if summary generation failed
 * @param {number} props.wordCount - Word count of the summary (optional)
 * @returns {React.ReactElement|null} Summary section or null if no summary
 *
 * @example
 * <VideoSummary
 *   summary="Photosynthesis is the process..."
 *   loading={false}
 *   wordCount={150}
 * />
 */
export default function VideoSummary({ summary, loading, error, wordCount }) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Don't render if no summary and not loading
  if (!summary && !loading && !error) {
    return null;
  }

  /**
   * Toggle Summary Expansion
   *
   * Expands or collapses the summary content with smooth animation.
   */
  const toggleExpansion = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="video-summary-section">
      <div className="video-summary-header" onClick={toggleExpansion} role="button" tabIndex={0} aria-expanded={isExpanded}>
        <div className="video-summary-header-content">
          <span className="summary-icon">📝</span>
          <h3 className="video-summary-title">Video Summary</h3>
          {wordCount && !loading && (
            <span className="summary-word-count">{wordCount} words</span>
          )}
        </div>
        <button
          className="summary-toggle-button"
          aria-label={isExpanded ? "Collapse summary" : "Expand summary"}
        >
          {isExpanded ? '▼' : '▶'}
        </button>
      </div>

      {isExpanded && (
        <div className="video-summary-content">
          {loading && (
            <div className="summary-loading" role="status" aria-live="polite">
              <div className="loading-spinner"></div>
              <p>Generating summary...</p>
            </div>
          )}

          {error && (
            <div className="summary-error" role="alert">
              <span className="error-icon">⚠️</span>
              <p>{error}</p>
            </div>
          )}

          {summary && !loading && (
            <div className="summary-text">
              {summary.split('\n').map((paragraph, index) => (
                paragraph.trim() && <p key={index}>{paragraph}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
