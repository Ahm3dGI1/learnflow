/**
 * Forgot Password Page Component
 * 
 * Allows users to request a password reset email via Firebase Authentication.
 * Reuses authentication styling for consistency.
 * 
 * @module ForgotPassword
 */

import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase";
import { Link } from "react-router-dom";
import { mapAuthError } from "../utils/authErrors";
import "./Auth.css";

/**
 * Forgot Password Component
 * 
 * Provides a form for users to enter their email address and receive
 * a password reset link. Handles input validation, Firebase interaction,
 * and user feedback.
 * 
 * @returns {React.ReactElement} The forgot password page
 */
export default function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    /**
     * Validates email format using regex
     * 
     * @param {string} email - Email to validate
     * @returns {boolean} True if email is valid
     */
    const isValidEmail = (email) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    /**
     * Handle Password Reset Submission
     * 
     * Validates the email, sends a reset request to Firebase, and
     * provides feedback to the user. Always returns a generic success
     * message for security purposes to prevent email enumeration.
     * 
     * @param {Event} e - Form submission event
     */
    async function handleSubmit(e) {
        e.preventDefault();
        setMessage("");
        setError("");

        const trimmedEmail = email.trim();

        if (!isValidEmail(trimmedEmail)) {
            setError("Please enter a valid email address.");
            return;
        }

        try {
            setLoading(true);
            await sendPasswordResetEmail(auth, trimmedEmail);
            // Always show success message for security (prevents user enumeration)
            setMessage("If an account exists with this email, you will receive password reset instructions shortly.");
        } catch (err) {
            // Only handle rate limiting or connectivity issues explicitly
            // For other auth errors, we still show the generic success message or a generic error
            if (err.code === 'auth/too-many-requests' || err.code === 'auth/network-request-failed') {
                setError(mapAuthError(err.code));
            } else if (err.code === 'auth/invalid-email') {
                // Formatting error from firebase, though our regex should catch most
                setError("Please enter a valid email address.");
            } else {
                // Fallback for other errors - show success to mask existence
                setMessage("If an account exists with this email, you will receive password reset instructions shortly.");
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="auth-container">
            <div>
                <Link to="/login" className="back-home">← Back to Login</Link>
                <div className="auth-card">
                    <div className="auth-header">
                        <h1>Password Reset</h1>
                        <p>Enter your email to reset your password</p>
                    </div>

                    {error && <div className="error-message" role="alert">{error}</div>}
                    {message && <div className="success-message" role="status">{message}</div>}

                    <form onSubmit={handleSubmit} className="auth-form">
                        <div className="form-group">
                            <label>Email</label>
                            <input
                                className="form-input"
                                placeholder="Enter your email"
                                type="email"
                                value={email}
                                onChange={e => {
                                    setEmail(e.target.value);
                                    if (error) setError("");
                                    if (message) setMessage("");
                                }}
                                required
                            />
                        </div>

                        <button disabled={loading} type="submit" className="auth-button">
                            {loading ? 'Sending...' : 'Reset Password'}
                        </button>
                    </form>

                    <div className="auth-footer">
                        Remember your password? <Link to="/login">Log In</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
