import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../auth/AuthContext';
import { llmService } from '../services';
import '../pages/Auth.css'; // Import auth styles for glass variables

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
    const messagesEndRef = useRef(null);

    /**
     * Load Chat History Effect
     * 
     * Fetches previous chat history for this video/user pair on mount.
     * Prevents state updates if component unmounts during fetch.
     */
    useEffect(() => {
        let isMounted = true;

        async function fetchHistory() {
            if (!user || !user.id || !videoId) return;

            try {
                const history = await llmService.getChatHistory(videoId, user.id);
                if (isMounted && history.messages) {
                    // Map backend messages to UI format
                    const formattedMessages = history.messages.map(msg => ({
                        role: msg.role,
                        content: msg.message,
                        timestamp: msg.timestamp_context
                    }));
                    setMessages(formattedMessages);
                }
            } catch (err) {
                console.error("Failed to load chat history:", err);
                // Graceful degradation - just don't show history
            }
        }

        fetchHistory();

        return () => { isMounted = false; };
    }, [videoId, user]);

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
        if (!input.trim() || loading || !user) return;

        const userMessage = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setLoading(true);

        try {
            let fullResponse = "";
            let isFirstChunk = true;

            await llmService.sendChatMessageStream(
                userMessage,
                {
                    userId: user.id,
                    videoId: videoId,
                    videoContext: { videoId, language: 'en' }
                },
                (chunk) => {
                    fullResponse += chunk;
                    setMessages(prev => {
                        const newMessages = [...prev];

                        // If it's the very first chunk, we need to create the assistant message
                        if (isFirstChunk) {
                            isFirstChunk = false;
                            return [...newMessages, { role: 'assistant', content: chunk }];
                        }

                        // For subsequent chunks, update the last message (which is our streaming assistant message)
                        const lastMsg = newMessages[newMessages.length - 1];
                        if (lastMsg && lastMsg.role === 'assistant') {
                            lastMsg.content = fullResponse;
                            return newMessages;
                        } else {
                            // Fallback in case state got out of sync, though unlikely with isFirstChunk flag
                            return [...newMessages, { role: 'assistant', content: chunk }];
                        }
                    });
                }
            );
        } catch (err) {
            console.error("Chat error:", err);
            // Fallback for error handling with helpful message
            let errorMessage = "Sorry, I encountered an error";
            if (err && err.message) errorMessage += `: ${err.message}`;
            errorMessage += ". Please try again later.";

            setMessages(prev => [...prev, { role: 'assistant', content: errorMessage }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="chat-section" style={{
            display: 'flex',
            flexDirection: 'column',
            height: '600px', // Fixed height for consistency
            background: 'var(--auth-card-bg)', // Use auth card background
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderRadius: '24px',
            border: '1px solid var(--auth-glass-border)',
            boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
            overflow: 'hidden'
        }}>
            <div className="chat-header" style={{
                padding: '20px 24px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.3)',
                background: 'rgba(255, 255, 255, 0.4)'
            }}>
                <h2 style={{
                    margin: 0,
                    fontSize: '1.25rem',
                    color: 'var(--auth-text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <span style={{ fontSize: '1.5rem' }}>💬</span>
                    AI Tutor
                </h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--auth-text-secondary)' }}>
                    Ask questions about the video content
                </p>
            </div>

            <div className="chat-messages" style={{
                flex: 1,
                overflowY: 'auto',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                background: 'rgba(255, 255, 255, 0.2)'
            }}>
                {messages.length === 0 && (
                    <div style={{
                        textAlign: 'center',
                        color: 'var(--auth-text-muted)',
                        marginTop: '3rem',
                        padding: '0 20px'
                    }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}>👋</div>
                        <h3 style={{ margin: '0 0 8px 0', color: 'var(--auth-text-primary)' }}>Hello!</h3>
                        <p style={{ margin: 0 }}>I'm your AI Tutor. Ask me anything about this video!</p>
                    </div>
                )}
                {messages.map((msg, idx) => (
                    <div key={idx} style={{
                        alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                        background: msg.role === 'user'
                            ? 'linear-gradient(135deg, var(--auth-primary) 0%, var(--auth-primary-dark) 100%)'
                            : 'white',
                        color: msg.role === 'user' ? 'white' : 'var(--auth-text-primary)',
                        padding: '12px 16px',
                        borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        maxWidth: '85%',
                        fontSize: '0.95rem',
                        lineHeight: '1.5',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                        border: msg.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.5)'
                    }}>
                        {msg.role === 'assistant' && (
                            <div style={{
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                marginBottom: '4px',
                                color: 'var(--auth-text-secondary)'
                            }}>
                                Tutor
                            </div>
                        )}
                        <div>{msg.content}</div>
                    </div>
                ))}
                {loading && (
                    <div style={{ alignSelf: 'flex-start', padding: '12px 16px', background: 'white', borderRadius: '18px', display: 'flex', gap: '4px' }}>
                        <span className="dot" style={{ animation: 'bounce 1.4s infinite ease-in-out both', animationDelay: '-0.32s' }}>•</span>
                        <span className="dot" style={{ animation: 'bounce 1.4s infinite ease-in-out both', animationDelay: '-0.16s' }}>•</span>
                        <span className="dot" style={{ animation: 'bounce 1.4s infinite ease-in-out both' }}>•</span>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSubmit} style={{
                padding: '16px 20px',
                borderTop: '1px solid rgba(255, 255, 255, 0.3)',
                display: 'flex',
                gap: '12px',
                background: 'rgba(255, 255, 255, 0.4)'
            }}>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={user ? "Type your question..." : "Please log in to chat"}
                    disabled={loading || !user}
                    style={{
                        flex: 1,
                        padding: '12px 16px',
                        borderRadius: '12px',
                        border: '1px solid var(--auth-glass-border)',
                        background: 'rgba(255, 255, 255, 0.6)',
                        color: 'var(--auth-text-primary)',
                        fontSize: '0.95rem',
                        outline: 'none',
                        transition: 'all 0.2s',
                        cursor: !user ? 'not-allowed' : 'text'
                    }}
                    onFocus={(e) => user && (e.target.style.background = 'white')}
                    onBlur={(e) => user && (e.target.style.background = 'rgba(255, 255, 255, 0.6)')}
                />
                <button
                    type="submit"
                    disabled={loading || !input.trim() || !user}
                    style={{
                        padding: '0 20px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, var(--auth-primary) 0%, var(--auth-primary-dark) 100%)',
                        color: 'white',
                        border: 'none',
                        cursor: loading || !input.trim() || !user ? 'default' : 'pointer',
                        fontWeight: '600',
                        opacity: loading || !input.trim() || !user ? 0.7 : 1,
                        boxShadow: '0 4px 6px rgba(14, 165, 233, 0.2)'
                    }}
                >
                    Send
                </button>
            </form>
            <style jsx>{`
                @keyframes bounce {
                    0%, 80%, 100% { transform: scale(0); }
                    40% { transform: scale(1); }
                }
                .dot { display: inline-block; font-size: 1.5rem; line-height: 0.5; color: var(--auth-text-muted); }
            `}</style>
        </div>
    );
}
