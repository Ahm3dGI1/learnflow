import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import { llmService, videoService } from '../services';
import '../pages/Auth.css'; // Import auth styles for glass variables
import './ChatInterface.css';

/**
 * ChatInterface Component
 * 
 * Provides a chat interface for users to interact with an AI tutor about specific video content.
 * Features include:
 * - Real-time message streaming
 * - Chat history loading from backend
 * - Loading states and error handling
 * - Auto-scrolling to new messages
 * 
 * @param {Object} props - Component props
 * @param {string} props.videoId - ID of the video being discussed
 * @param {string} props.videoTitle - Title of the video for context
 * @returns {React.ReactElement} The chat interface
 */
export default function ChatInterface({ videoId, videoTitle }) {
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [transcriptText, setTranscriptText] = useState(null);
    const [transcriptLanguage, setTranscriptLanguage] = useState('en');
    const [chatOffset, setChatOffset] = useState(0);
    const [chatHasMore, setChatHasMore] = useState(false);
    const [chatLoading, setChatLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);

    const TRANSCRIPT_CHAR_LIMIT = 12000; // Protect request size

    /**
     * Load Chat History Effect
     *
     * Fetches previous chat history for this video/user pair on mount.
     * Prevents state updates if component unmounts during fetch.
     */
    useEffect(() => {
        let isMounted = true;

        async function fetchHistory() {
            const userId = user?.id ?? user?.uid;
            if (!userId || !videoId) return;

            try {
                setChatLoading(true);
                const response = await llmService.getChatHistory(videoId, userId, 20, 0);
                if (isMounted && response && response.data) {
                    // Map backend messages to UI format from new pagination structure
                    const formattedMessages = response.data.map(msg => ({
                        role: msg.role,
                        content: msg.message,
                        timestamp: msg.timestamp_context
                    }));
                    setMessages(formattedMessages);
                    setChatOffset(0);
                    setChatHasMore(response.pagination?.hasMore || false);
                }
            } catch (err) {
                console.error('Failed to load chat history:', err);
                // Graceful degradation - just don't show history
            } finally {
                setChatLoading(false);
            }
        }

        fetchHistory();

        return () => { isMounted = false; };
    }, [videoId, user]);

    /**
     * Load transcript for the current video so it can be sent in the system message.
     * We trim the transcript to keep request sizes reasonable.
     */
    useEffect(() => {
        let isMounted = true;

        const loadTranscript = async () => {
            if (!videoId) return;

            try {
                const data = await videoService.fetchTranscript(videoId);
                if (!isMounted) return;

                const fullText = videoService.formatTranscriptText(data?.snippets || []);
                const trimmedText = fullText
                    ? fullText.slice(0, TRANSCRIPT_CHAR_LIMIT)
                    : null;

                setTranscriptText(trimmedText || null);
                setTranscriptLanguage(data?.languageCode || data?.language || 'en');
            } catch (err) {
                console.error('Failed to load transcript for chat context:', err);
                if (isMounted) {
                    setTranscriptText(null);
                    setTranscriptLanguage('en');
                }
            }
        };

        loadTranscript();

        return () => {
            isMounted = false;
        };
    }, [videoId]);

    /**
     * Auto-scroll helper
     * Scrolls the chat container to the bottom smoothly.
     */
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    /**
     * Load More Chat Messages
     * 
     * Fetches the next batch of chat messages for pagination.
     * Prepends to existing messages and maintains scroll position.
     */
    const loadMoreMessages = useCallback(async () => {
        const userId = user?.id ?? user?.uid;
        if (!userId || !videoId || chatLoading || !chatHasMore) return;

        try {
            setChatLoading(true);
            const container = messagesContainerRef.current;
            const scrollHeightBefore = container?.scrollHeight || 0;

            const newOffset = chatOffset + 20;
            const response = await llmService.getChatHistory(videoId, userId, 20, newOffset);
            
            if (response && response.data) {
                const formattedMessages = response.data.map(msg => ({
                    role: msg.role,
                    content: msg.message,
                    timestamp: msg.timestamp_context
                }));
                // Prepend older messages to the top
                setMessages(prev => [...formattedMessages, ...prev]);
                setChatOffset(newOffset);
                setChatHasMore(response.pagination?.hasMore || false);

                // Maintain scroll position: scroll to where we were before
                if (container) {
                    setTimeout(() => {
                        const scrollHeightAfter = container.scrollHeight;
                        const newScrollTop = scrollHeightAfter - scrollHeightBefore + container.scrollTop;
                        container.scrollTop = newScrollTop;
                    }, 0);
                }
            }
        } catch (err) {
            console.error('Failed to load more chat messages:', err);
        } finally {
            setChatLoading(false);
        }
    }, [videoId, user, chatLoading, chatHasMore, chatOffset]);

    /**
     * Scroll Effect
     * Scrolls to bottom for new messages, but not when loading older messages.
     * Only scrolls if user was already at bottom.
     */
    useEffect(() => {
        const container = messagesContainerRef.current;
        if (!container) return;

        // Only auto-scroll if we're at the bottom or if this is the first load
        const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
        const isFirstLoad = chatOffset === 0;
        
        if (isAtBottom || isFirstLoad) {
            scrollToBottom();
        }
    }, [messages, chatOffset]);

    /**
     * Auto-load Messages on Scroll Effect
     * 
     * Detects when user scrolls to top of chat and automatically loads earlier messages.
     * Threshold: When scroll position is within 50px of top, triggers load.
     */
    useEffect(() => {
        const container = messagesContainerRef.current;
        if (!container) return;

        const handleScroll = () => {
            // Check if user scrolled to top (within 50px)
            if (container.scrollTop < 50 && chatHasMore && !chatLoading) {
                loadMoreMessages();
            }
        };

        container.addEventListener('scroll', handleScroll);
        return () => container.removeEventListener('scroll', handleScroll);
    }, [chatHasMore, chatLoading, loadMoreMessages]);

    /**
     * Handle Message Submission
     * 
     * Sends user message to backend and handles streaming response.
     * 1. Optimistically adds user message to UI
     * 2. Initiates stream request
     * 3. Accumulates chunks and updates partial assistant message in real-time
     * 
     * @param {Event} e - Form submission event
     */
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMessage = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setLoading(true);

        const videoContext = {
            videoId: videoId,
            videoTitle,
            language: transcriptLanguage || 'en',
            fullTranscript: transcriptText || undefined,
            // Keep transcriptSnippet for compatibility even if empty
            transcriptSnippet: ''
        };

        try {
            let fullResponse = "";
            // Initialize assistant message so we always append to the same message
            setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

            await llmService.sendChatMessageStream(
                userMessage,
                {
                    videoId: videoId,
                    videoContext
                },
                (chunk) => {
                    fullResponse += chunk;
                    setMessages(prev => {
                        const newMessages = [...prev];
                        const lastMsg = newMessages[newMessages.length - 1];
                        if (lastMsg && lastMsg.role === 'assistant') {
                            lastMsg.content = fullResponse;
                            return newMessages;
                        }
                        // Fallback: append assistant message
                        return [...newMessages, { role: 'assistant', content: fullResponse }];
                    });
                }
            );
        } catch (err) {
            console.error('Chat error:', err);
            // Fallback for error handling with helpful message
            let errorMessage = 'Sorry, I encountered an error';
            if (err && err.message) errorMessage += `: ${err.message}`;
            errorMessage += '. Please try again later.';

            setMessages(prev => [...prev, { role: 'assistant', content: errorMessage }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="chat-section">
            <div className="chat-header">
                <h2 className="chat-header-title"><span className="chat-emoji">💬</span>AI Tutor</h2>
                <p className="chat-header-sub">Ask questions about the video content</p>
            </div>

            <div className="chat-messages" ref={messagesContainerRef}>
                {messages.length === 0 && (
                    <div className="chat-placeholder">
                        <div className="chat-placeholder-emoji">👋</div>
                        <h3 className="chat-placeholder-title">Hello!</h3>
                        <p className="chat-placeholder-text">I'm your AI Tutor. Ask me anything about this video!</p>
                    </div>
                )}
                {chatHasMore && messages.length > 0 && (
                    <div className="chat-load-more-container">
                        <button 
                            onClick={loadMoreMessages}
                            disabled={chatLoading}
                            className="chat-load-more-button"
                        >
                            {chatLoading ? 'Loading...' : 'Load Earlier Messages'}
                        </button>
                    </div>
                )}
                {messages.map((msg, idx) => (
                    <div key={idx} className={`message-bubble ${msg.role === 'user' ? 'message-user' : 'message-assistant'}`}>
                        {msg.role === 'assistant' && (
                            <div className="message-role">Tutor</div>
                        )}
                        <div className="message-content">{msg.content}</div>
                    </div>
                ))}
                {loading && (
                    <div className="message-bubble message-assistant message-loading">
                        <div className="loading-dots">
                            <span className="dot">•</span>
                            <span className="dot">•</span>
                            <span className="dot">•</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSubmit} className="chat-form">
                <input
                    aria-label={user ? 'Type your question to AI Tutor' : 'Please log in to chat'}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={user ? 'Type your question...' : 'Please log in to chat'}
                    disabled={loading || !(user?.id ?? user?.uid)}
                    className="chat-input"
                />
                <button
                    type="submit"
                    disabled={loading || !input.trim() || !(user?.id ?? user?.uid)}
                    className="chat-send-button"
                >
                    Send
                </button>
            </form>
        </div>
    );
}
