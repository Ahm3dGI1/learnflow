import "./InputBar.css";

export default function InputBar({ videoUrl, setVideoUrl, onSend }) {
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