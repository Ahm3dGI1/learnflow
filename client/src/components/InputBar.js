import React from 'react';
import { Sparkles, Youtube } from 'lucide-react';

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
        <div className="w-full max-w-3xl mx-auto">
            <div className="relative flex items-center group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Youtube className={`h-5 w-5 transition-colors ${isLoading ? 'text-gray-300' : 'text-gray-400 group-focus-within:text-red-500'}`} />
                </div>
                <input
                    type="text"
                    className="block w-full pl-12 pr-40 py-4 bg-white border border-gray-200 rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 shadow-sm transition-all text-base disabled:bg-gray-50 disabled:text-gray-400"
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
                    className={`absolute right-2 top-2 bottom-2 px-6 font-semibold rounded-xl shadow-md transition-all transform flex items-center gap-2
                        ${isLoading
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                            : 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 hover:scale-[1.02] active:scale-95'
                        }`}
                >
                    <span>{isLoading ? 'Loading...' : 'Load Video'}</span>
                    <Sparkles className={`w-4 h-4 ${isLoading ? 'animate-pulse' : ''}`} />
                </button>
            </div>
        </div>
    );
}