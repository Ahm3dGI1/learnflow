/**
 * Keyboard Shortcuts Help Modal
 *
 * Displays a modal overlay showing available keyboard shortcuts
 * for the video player. Can be toggled with the "?" key.
 *
 * @module KeyboardShortcutsHelp
 *
 * @example
 * <KeyboardShortcutsHelp
 *   isVisible={showHelp}
 *   onClose={() => setShowHelp(false)}
 *   shortcuts={shortcuts}
 * />
 */

import './KeyboardShortcutsHelp.css';

/**
 * KeyboardShortcutsHelp Component
 *
 * @param {Object} props - Component props
 * @param {boolean} props.isVisible - Whether the modal is visible
 * @param {Function} props.onClose - Callback to close the modal
 * @param {Array} props.shortcuts - List of shortcut objects with key and action
 * @returns {React.ReactElement|null} Modal component or null if not visible
 */
export default function KeyboardShortcutsHelp({ isVisible, onClose, shortcuts = [] }) {
  if (!isVisible) return null;

  /**
   * Handle backdrop click to close modal
   *
   * @param {React.MouseEvent} event - Click event
   */
  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="shortcuts-overlay"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
    >
      <div className="shortcuts-modal">
        <header className="shortcuts-header">
          <h2 id="shortcuts-title">⌨️ Keyboard Shortcuts</h2>
          <button
            className="shortcuts-close-btn"
            onClick={onClose}
            aria-label="Close shortcuts help"
          >
            ✕
          </button>
        </header>

        <div className="shortcuts-content">
          <p className="shortcuts-subtitle">
            Use these shortcuts to control video playback
          </p>

          <table className="shortcuts-table" role="grid">
            <thead>
              <tr>
                <th scope="col">Key</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {shortcuts.map((shortcut, index) => (
                <tr key={index}>
                  <td>
                    <kbd className="shortcut-key">{shortcut.key}</kbd>
                  </td>
                  <td className="shortcut-action">{shortcut.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <footer className="shortcuts-footer">
          <span className="shortcuts-hint">
            Press <kbd>?</kbd> or <kbd>Esc</kbd> to close
          </span>
        </footer>
      </div>
    </div>
  );
}

