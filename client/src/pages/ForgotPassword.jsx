/**
 * Forgot Password Page Component
 * 
 * Allows users to request a password reset email via Firebase Authentication.
 * Reuses authentication styling for consistency.
 */

import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase";
import { Link } from "react-router-dom";
import "./Auth.css";

export default function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setMessage("");
        setError("");

        // Basic format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError("Please enter a valid email address.");
            return;
        }

        try {
            setLoading(true);
            await sendPasswordResetEmail(auth, email);
            // Always show success message for security (prevents user enumeration)
            setMessage("If an account exists with this email, you will receive password reset instructions shortly.");
        } catch (err) {
            // Only handle rate limiting or connectivity issues explicitly
            // For other auth errors, we still show the generic success message or a generic error
            if (err.code === 'auth/too-many-requests') {
                setError("Too many requests. Please try again later.");
            } else if (err.code === 'auth/network-request-failed') {
                setError("Network error. Please check your internet connection.");
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

                    {error && <div className="error-message">{error}</div>}
                    {message && <div className="success-message">{message}</div>}

                    <form onSubmit={handleSubmit} className="auth-form">
                        <div className="form-group">
                            <label>Email</label>
                            <input
                                className="form-input"
                                placeholder="Enter your email"
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
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
