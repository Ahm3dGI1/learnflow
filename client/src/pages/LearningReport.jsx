/**
 * Personal Learning Report Page Component
 *
 * Displays a comprehensive view of the user's learning achievements and progress.
 * Shows statistics about videos watched, quizzes completed, checkpoints mastered,
 * and overall learning metrics.
 *
 * Features:
 * - Key statistics cards (videos, quizzes, checkpoints, scores)
 * - Learning streak tracking
 * - Recent activity timeline
 * - Watch time analytics
 * - Loading and error states
 *
 * @module LearningReport
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { learningReportService } from '../services';
import useToast from '../hooks/useToast';
import Skeleton from '../components/Skeleton';
import './LearningReport.css';

/**
 * Learning Report Component
 *
 * Protected page that displays user's learning statistics and achievements.
 * Fetches comprehensive learning data from the backend and displays it in
 * an organized, easy-to-understand format.
 *
 * @returns {React.ReactElement} Learning report page with statistics
 */
export default function LearningReport() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { error: toastError } = useToast();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Fetch Learning Report on Mount
   */
  useEffect(() => {
    const fetchReport = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await learningReportService.getLearningReport(user.uid);
        setReport(data || {});
      } catch (err) {
        console.error('Error fetching learning report:', err);
        const errorMsg = err.message || 'Failed to load learning report. Please try again later.';
        setError(errorMsg);
        toastError(errorMsg);
        // Set empty report to show friendly message instead of error state
        setReport({
          totalVideosWatched: 0,
          totalVideosCompleted: 0,
          completionRate: 0,
          totalWatchTime: 0,
          totalQuizAttempts: 0,
          totalQuizzesTaken: 0,
          averageQuizScore: 0,
          highestQuizScore: 0,
          lowestQuizScore: 0,
          totalCheckpointsCompleted: 0,
          recentActivity: [],
          learningStreak: 0,
          lastActivityDate: null
        });
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [user, toastError]);

  /**
   * Format seconds to readable time format (hours and minutes)
   * @param {number} seconds - Total seconds
   * @returns {string} Formatted time string
   */
  const formatWatchTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  /**
   * Render statistic card component
   */
  const StatCard = ({ icon, title, value, subtitle, highlight = false }) => (
    <div className={`stat-card ${highlight ? 'highlight' : ''}`}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-content">
        <p className="stat-title">{title}</p>
        <p className="stat-value">{value}</p>
        {subtitle && <p className="stat-subtitle">{subtitle}</p>}
      </div>
    </div>
  );

  /**
   * Render recent activity item
   */
  const ActivityItem = ({ date, videosWatched, quizAttempts, checkpointsCompleted }) => (
    <div className="activity-item">
      <div className="activity-date">{new Date(date).toLocaleDateString()}</div>
      <div className="activity-details">
        {videosWatched > 0 && (
          <span className="activity-badge">🎥 {videosWatched} video{videosWatched !== 1 ? 's' : ''}</span>
        )}
        {quizAttempts > 0 && (
          <span className="activity-badge">📝 {quizAttempts} quiz{quizAttempts !== 1 ? 'zes' : ''}</span>
        )}
        {checkpointsCompleted > 0 && (
          <span className="activity-badge">✓ {checkpointsCompleted} checkpoint{checkpointsCompleted !== 1 ? 's' : ''}</span>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="learning-report-container">
        <div className="report-header">
          <h1><Skeleton width="200px" /></h1>
        </div>
        <div className="stats-grid">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} height="150px" />
          ))}
        </div>
      </div>
    );
  }

  // Show empty state for new users with no activities (regardless of error)
  const hasNoActivities = !report || (
    report.totalVideosWatched === 0 &&
    report.totalQuizAttempts === 0 &&
    report.totalCheckpointsCompleted === 0
  );

  return (
    <div className="learning-report-container">
      {/* Header */}
      <div className="report-header">
        <h1>📊 Personal Learning Report</h1>
        <p className="header-subtitle">Your learning journey at a glance</p>
      </div>

      {error && (
        <div className="error-state">
          <p className="error-message">⚠️ {error}</p>
        </div>
      )}

      {/* Empty State for New Users */}
      {hasNoActivities ? (
        <div className="empty-state">
          <p className="empty-icon">🚀</p>
          <h2>Start Learning to See Your Progress</h2>
          <p>
            Your learning statistics will appear here as you watch videos,
            take quizzes, and complete checkpoints. Begin your learning journey
            to see your achievements grow!
          </p>
          <button
            className="btn-primary"
            onClick={() => navigate('/dashboard')}
          >
            Go to Dashboard & Start Learning
          </button>
        </div>
      ) : (
        <>
          {/* Main Statistics */}
          <div className="stats-grid">
            {/* Videos Watched */}
            <StatCard
              icon="🎥"
              title="Videos Watched"
              value={report.totalVideosWatched}
              subtitle={`${report.totalVideosCompleted} completed (${report.completionRate}%)`}
              highlight={true}
            />

            {/* Watch Time */}
            <StatCard
              icon="⏱️"
              title="Total Watch Time"
              value={formatWatchTime(report.totalWatchTime)}
              subtitle={`${report.totalWatchTime} seconds`}
            />

            {/* Quizzes Completed */}
            <StatCard
              icon="📝"
              title="Quizzes Completed"
              value={report.totalQuizzesTaken}
              subtitle={`${report.totalQuizAttempts} attempts`}
            />

            {/* Average Quiz Score */}
            <StatCard
              icon="📈"
              title="Average Quiz Score"
              value={`${report.averageQuizScore.toFixed(1)}%`}
              subtitle={`High: ${report.highestQuizScore.toFixed(1)}% | Low: ${report.lowestQuizScore.toFixed(1)}%`}
              highlight={true}
            />

            {/* Checkpoints Completed */}
            <StatCard
              icon="✓"
              title="Checkpoints Completed"
              value={report.totalCheckpointsCompleted}
              subtitle="Learning milestones achieved"
            />

            {/* Learning Streak */}
            <StatCard
              icon="🔥"
              title="Learning Streak"
              value={`${report.learningStreak} day${report.learningStreak !== 1 ? 's' : ''}`}
              subtitle={
                report.learningStreak > 0
                  ? `Last active: ${report.lastActivityDate}`
                  : 'Start a new streak!'
              }
              highlight={report.learningStreak > 0}
            />
          </div>

          {/* Recent Activity Section */}
          {report.recentActivity && report.recentActivity.length > 0 && (
            <div className="activity-section">
              <h2>📅 Recent Activity (Last 7 Days)</h2>
              <div className="activity-list">
                {report.recentActivity.map((activity, idx) => (
                  <ActivityItem
                    key={idx}
                    date={activity.date}
                    videosWatched={activity.videosWatched}
                    quizAttempts={activity.quizAttempts}
                    checkpointsCompleted={activity.checkpointsCompleted}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="action-buttons">
            <button
              className="btn-primary"
              onClick={() => navigate('/dashboard')}
            >
              Continue Learning
            </button>
          </div>
        </>
      )}
    </div>
  );
}
