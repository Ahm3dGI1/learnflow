import React from 'react';
import { Sparkles, Youtube } from 'lucide-react';
import './InputBar.css';

/**
 * InputBar Component
 * 
 * Controlled input component for YouTube URL entry. Includes a text input
 * field and submit button. Triggers onSend callback on either button click
 * or Enter key press for convenient submission.
 * 
 * @param {Object} props - Component props
 * @param {string} props.videoUrl - Current input value
 * @param {Function} props.setVideoUrl - Callback to update input value
 * @param {Function} props.onSend - Callback to trigger when user submits URL
 * @param {boolean} props.isLoading - Loading state to disable input and button
 * @returns {React.ReactElement} Input bar with text field and button
 */
export default function InputBar({ videoUrl, setVideoUrl, onSend, isLoading }) {
    /**
     * Handle Enter Key Press
     */
    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !isLoading) {
            onSend();
        }
    };

    return (
        <div className="input-bar-container">
            <div className="input-bar-wrapper">
                <div className="youtube-icon-container">
                    <Youtube className={`youtube-icon ${isLoading ? 'loading' : ''}`} />
                </div>
                <input
                    type="text"
                    className="input-bar-field"
                    placeholder="Paste your YouTube link here..."
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={isLoading}
                    autoComplete="off"
                />
                <button
                    onClick={onSend}
                    disabled={isLoading}
                    className="input-bar-button"
                >
                    <span>{isLoading ? 'Loading...' : 'Load Video'}</span>
                    <Sparkles className={`sparkles-icon ${isLoading ? 'loading' : ''}`} />
                </button>
            </div>
        </div>
    );
}