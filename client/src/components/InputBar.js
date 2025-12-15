/**
 * Input Bar Component
 * 
 * YouTube URL input field with submit button. Supports both button click
 * and Enter key submission. Provides user-friendly placeholder text and
 * disables browser autocomplete for cleaner UX.
 * 
 * @module InputBar
 */

import { Play } from "lucide-react";
import "./InputBar.css";

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
 * @param {boolean} props.isLoading - Whether the video is loading
 * @returns {React.ReactElement} Input bar with text field and button
 * 
 * @example
 * <InputBar 
 *   videoUrl={url}
 *   setVideoUrl={setUrl}
 *   onSend={handleLoadVideo}
 *   isLoading={false}
 * />
 */
export default function InputBar({ videoUrl, setVideoUrl, onSend, isLoading = false }) {
    /**
     * Handle Enter Key Press
     * 
     * Triggers the onSend callback when user presses Enter key,
     * providing keyboard-based submission as an alternative to
     * clicking the button.
     * 
     * @param {KeyboardEvent} e - Keyboard event object
     */
    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            onSend();
        }
    };

    return (
        <div className="input-section">
            <div className="input-wrapper">
                <Play className="input-icon" size={20} />
                <input
                    type="text"
                    className="url-input"
                    placeholder="Paste your YouTube link here..."
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    onKeyPress={handleKeyPress}
                    autoComplete="off"
                    disabled={isLoading}
                />
                <button
                    onClick={onSend}
                    className="submit-button"
                    disabled={isLoading}
                >
                    {isLoading ? 'Loading...' : 'Load Video'}
                    {!isLoading && <Play className="button-icon" size={16} />}
                </button>
            </div>
        </div>
    );
}