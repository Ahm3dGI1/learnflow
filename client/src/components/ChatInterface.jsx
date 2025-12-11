import React, { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import llmService from '../services/llmService';
import './ChatInterface.css';

/**
 * Chat Interface Component
 *
 * AI tutor chat interface for asking questions about video content.
 * Features:
 * - Real-time chat with AI tutor
 * - Chat history persistence
 * - Message timestamps
 * - Loading states
 * - Error handling
 * - Auto-scroll to latest message
 * - Session management
 *
 * @param {object} props - Component props
 * @param {boolean} props.isOpen - Whether the chat interface is visible
 * @param {function} props.onClose - Callback when chat is closed
 * @param {number} props.userId - Current user ID
 * @param {string} props.videoId - YouTube video ID
 * @param {object} props.videoContext - Video context (transcript, language)
 * @param {string} props.currentTimestamp - Current video timestamp (MM:SS format)
 * @param {string} props.initialMessage - Optional initial message to send
 */
const ChatInterface = ({
  isOpen,
  onClose,
  userId,
  videoId,
  videoContext,
  currentTimestamp,
  initialMessage = null
}) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const hasLoadedHistory = useRef(false);
  const hasSentInitialMessage = useRef(false);

  /**
   * Scroll to the bottom of the messages
   */
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  /**
   * Load chat history from the backend
   */
  const loadChatHistory = useCallback(async () => {
    if (!userId || !videoId || hasLoadedHistory.current) return;

    try {
      setIsLoadingHistory(true);
      const response = await llmService.getChatHistory(videoId, userId, 100);

      if (response && response.messages && Array.isArray(response.messages)) {
        // Transform backend messages to component format
        const transformedMessages = response.messages.map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.message,
          timestamp: msg.created_at,
          timestampContext: msg.timestamp_context
        }));

        setMessages(transformedMessages);

        // Extract session ID from last message if available
        if (response.messages.length > 0) {
          const lastMessage = response.messages[response.messages.length - 1];
          if (lastMessage.session_id) {
            setSessionId(lastMessage.session_id);
          }
        }
      }

      hasLoadedHistory.current = true;
      setError(null);
    } catch (err) {
      console.error('Error loading chat history:', err);
      // Don't show error for empty history, just start fresh
      hasLoadedHistory.current = true;
    } finally {
      setIsLoadingHistory(false);
    }
  }, [userId, videoId]);

  /**
   * Send a message to the AI tutor
   */
  const sendMessage = useCallback(async (messageText) => {
    if (!messageText.trim() || !userId || !videoId || isLoading) return;

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: messageText.trim(),
      timestamp: new Date().toISOString(),
      timestampContext: currentTimestamp
    };

    // Add user message immediately
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setError(null);
    setIsLoading(true);

    try {
      // Send message to backend
      const response = await llmService.sendChatMessage(messageText.trim(), {
        userId,
        videoId,
        videoContext,
        sessionId,
        timestamp: currentTimestamp
      });

      // Update session ID if provided
      if (response.sessionId) {
        setSessionId(response.sessionId);
      }

      // Add assistant response
      const assistantMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: response.response,
        timestamp: new Date().toISOString(),
        timestampContext: response.timestamp || currentTimestamp
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message. Please try again.');

      // Remove the user message on error
      setMessages(prev => prev.filter(msg => msg.id !== userMessage.id));
    } finally {
      setIsLoading(false);
    }
  }, [userId, videoId, videoContext, currentTimestamp, sessionId, isLoading]);

  /**
   * Handle send button click
   */
  const handleSend = useCallback(() => {
    sendMessage(inputMessage);
  }, [inputMessage, sendMessage]);

  /**
   * Handle input key press (Enter to send, Shift+Enter for new line)
   */
  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  /**
   * Format timestamp for display
   */
  const formatTimestamp = (isoString) => {
    if (!isoString) return '';

    try {
      const date = new Date(isoString);
      const now = new Date();
      const diff = now - date;

      // If less than 1 minute ago, show "Just now"
      if (diff < 60000) return 'Just now';

      // If less than 1 hour ago, show minutes
      if (diff < 3600000) {
        const minutes = Math.floor(diff / 60000);
        return `${minutes}m ago`;
      }

      // If today, show time
      if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit'
        });
      }

      // Otherwise show date and time
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
    } catch (err) {
      return '';
    }
  };

  // Load chat history when component opens
  useEffect(() => {
    if (isOpen && !hasLoadedHistory.current) {
      loadChatHistory();
    }
  }, [isOpen, loadChatHistory]);

  // Send initial message if provided
  useEffect(() => {
    if (isOpen && initialMessage && !hasSentInitialMessage.current && !isLoadingHistory) {
      hasSentInitialMessage.current = true;
      sendMessage(initialMessage);
    }
  }, [isOpen, initialMessage, isLoadingHistory, sendMessage]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && !isLoadingHistory) {
      inputRef.current?.focus();
    }
  }, [isOpen, isLoadingHistory]);

  // Reset state when closing
  useEffect(() => {
    if (!isOpen) {
      // Reset initial message flag when closing
      hasSentInitialMessage.current = false;
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="chat-overlay" onClick={onClose}>
      <div className="chat-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="chat-header">
          <h2>AI Tutor</h2>
          <button
            className="chat-close-button"
            onClick={onClose}
            aria-label="Close chat"
          >
            ×
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="chat-error">
            <span className="chat-error-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Messages Area */}
        <div className="chat-messages">
          {isLoadingHistory ? (
            <div className="chat-empty-state">
              <div className="chat-loading">
                <div className="loading-dot"></div>
                <div className="loading-dot"></div>
                <div className="loading-dot"></div>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="chat-empty-state">
              <div className="chat-empty-state-icon">💬</div>
              <h3>Ask the AI Tutor</h3>
              <p>Ask questions about the video content and get helpful explanations!</p>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <div key={message.id} className={`chat-message ${message.role}`}>
                  <div className="message-bubble">
                    {message.content}
                  </div>
                  <div className="message-timestamp">
                    {formatTimestamp(message.timestamp)}
                    {message.timestampContext && ` • ${message.timestampContext}`}
                  </div>
                </div>
              ))}

              {/* Loading indicator */}
              {isLoading && (
                <div className="chat-message assistant">
                  <div className="chat-loading">
                    <div className="loading-dot"></div>
                    <div className="loading-dot"></div>
                    <div className="loading-dot"></div>
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="chat-input-container">
          <div className="chat-input-wrapper">
            <textarea
              ref={inputRef}
              className="chat-input"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask a question about the video..."
              disabled={isLoading || isLoadingHistory}
              rows={1}
            />
            <button
              className="chat-send-button"
              onClick={handleSend}
              disabled={!inputMessage.trim() || isLoading || isLoadingHistory}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

ChatInterface.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  userId: PropTypes.number.isRequired,
  videoId: PropTypes.string.isRequired,
  videoContext: PropTypes.shape({
    videoId: PropTypes.string,
    transcriptSnippet: PropTypes.string,
    language: PropTypes.string
  }),
  currentTimestamp: PropTypes.string,
  initialMessage: PropTypes.string
};

ChatInterface.defaultProps = {
  videoContext: null,
  currentTimestamp: null,
  initialMessage: null
};

export default ChatInterface;
