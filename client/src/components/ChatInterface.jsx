import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
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
 * - Programmatic input setting via ref
 * 
 * @param {Object} props - Component props
 * @param {string} props.videoId - ID of the video being discussed
 * @param {string} props.videoTitle - Title of the video for context
 * @param {React.Ref} ref - Forwarded ref to expose setQuestion method
 * @returns {React.ReactElement} The chat interface
 */
const ChatInterface = forwardRef(({ videoId, videoTitle }, ref) => {
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [transcriptText, setTranscriptText] = useState(null);
    const [transcriptLanguage, setTranscriptLanguage] = useState('en');
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const TRANSCRIPT_CHAR_LIMIT = 12000; // Protect request size

    /**
     * Expose methods to parent components via ref
     */
    useImperativeHandle(ref, () => ({
        /**
         * Set a question in the input field and optionally focus it
         * @param {string} question - The question to set
         * @param {boolean} autoFocus - Whether to focus the input (default: true)
         */
        setQuestion: (question, autoFocus = true) => {
            setInput(question);
            if (autoFocus && inputRef.current) {
                inputRef.current.focus();
                // Scroll input into view
                inputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }));

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
                const history = await llmService.getChatHistory(videoId, userId);
                if (isMounted && history && history.messages) {
                    // Map backend messages to UI format
                    const formattedMessages = history.messages.map(msg => ({
                        role: msg.role,
                        content: msg.message,
                        timestamp: msg.timestamp_context
                    }));
                    setMessages(formattedMessages);
                }
            } catch (err) {
                console.error('Failed to load chat history:', err);
                // Graceful degradation - just don't show history
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
     * Scroll Effect
     * Trigger scroll to bottom whenever messages array changes.
     */
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

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
            
            // Check if it's an authentication error
            if (err && err.message && (err.message.includes('Invalid token') || err.message.includes('401'))) {
                errorMessage = 'Please log in to use the AI Tutor chat feature.';
            } else if (err && err.message) {
                errorMessage += `: ${err.message}`;
                errorMessage += '. Please try again later.';
            } else {
                errorMessage += '. Please try again later.';
            }

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

            <div className="chat-messages">
                {messages.length === 0 && (
                    <div className="chat-placeholder">
                        <div className="chat-placeholder-emoji">👋</div>
                        <h3 className="chat-placeholder-title">Hello!</h3>
                        <p className="chat-placeholder-text">I'm your AI Tutor. Ask me anything about this video!</p>
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
                    ref={inputRef}
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
});

ChatInterface.displayName = 'ChatInterface';

export default ChatInterface;
