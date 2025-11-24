/**
 * Input Bar Component
 * 
 * YouTube URL input field with submit button. Supports both button click
 * and Enter key submission. Provides user-friendly placeholder text and
 * disables browser autocomplete for cleaner UX.
 * 
 * @module InputBar
 */

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
 * @returns {React.ReactElement} Input bar with text field and button
 * 
 * @example
 * <InputBar 
 *   videoUrl={url}
 *   setVideoUrl={setUrl}
 *   onSend={handleLoadVideo}
 * />
 */
export default function InputBar({ videoUrl, setVideoUrl, onSend }) {
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
                <input
                    type="text"
                    className="url-input"
                    placeholder="Paste your YouTube link here..."
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    onKeyPress={handleKeyPress}
                    autoComplete="off"
                />
                <button
                    onClick={onSend}
                    className="submit-button"
                >
                    Load Video
                </button>
            </div>
        </div>
    );
}