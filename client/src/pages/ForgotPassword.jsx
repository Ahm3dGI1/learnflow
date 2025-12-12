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

        try {
            setMessage("");
            setError("");
            setLoading(true);
            await sendPasswordResetEmail(auth, email);
            setMessage("Password reset instructions sent. (Check Spam folder)");
        } catch (e) {
            console.error(e.code, e.message);

            // Handle User Enumeration Protection (if enabled, Firebase might not throw, but if it does:)
            if (e.code === 'auth/user-not-found') {
                setError("No account found with this email address.");
            } else if (e.code === 'auth/invalid-email') {
                setError("Please enter a valid email address.");
            } else if (e.code === 'auth/too-many-requests') {
                setError("Too many attempts. Please try again later.");
            } else {
                setError("Failed to reset password. Please try again.");
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

                    {error && <div className="error-message" style={{ background: '#fee', color: '#c33', borderColor: '#c33' }}>{error}</div>}
                    {message && <div className="error-message" style={{ background: '#def7ec', color: '#046c4e', borderColor: '#31c48d' }}>{message}</div>}

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
