/**
 * Login Page Component
 * 
 * User authentication page supporting both email/password and Google OAuth
 * login methods. Validates credentials, handles Firebase authentication,
 * displays error messages, and redirects to dashboard upon successful login.
 * 
 * @module Login
 */

import { mapAuthError } from "../utils/authErrors";

import { useState } from "react";
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "../firebase";
import { Link, useNavigate } from "react-router-dom";
import "./Auth.css";

/**
 * Login Component
 * 
 * Provides login form with email/password authentication and Google sign-in
 * option. Trims email input, displays Firebase error messages, and navigates
 * to dashboard after successful authentication. Includes link to signup page
 * for new users.
 * 
 * @returns {React.ReactElement} Login page with form and OAuth options
 * 
 * @example
 * // Used in main App routing
 * <Route path="/login" element={<Login />} />
 */
export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  /**
   * Handle Form Submission
   * 
   * Authenticates user with Firebase using email and password. Trims email
   * input, clears previous errors, and redirects to dashboard on success.
   * Displays Firebase error message if authentication fails.
   * 
   * @param {Event} e - Form submit event
   * @returns {Promise<void>}
   */
  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      nav("/dashboard");
    } catch (e) {
      setErr(mapAuthError(e.code));
    }
  }

  /**
   * Handle Google OAuth Login
   * 
   * Authenticates user with Firebase using Google OAuth popup. Redirects
   * to dashboard on success or displays error message on failure.
   * 
   * @returns {Promise<void>}
   */
  async function googleLogin() {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      nav("/dashboard");
    } catch (e) {
      setErr(mapAuthError(e.code));
    }
  }

  return (
    <div className="auth-container">
      <div>
        <Link to="/" className="back-home">← Back to Home</Link>
        <div className="auth-card">
          <div className="auth-header">
            <h1>Welcome Back</h1>
            <p>Log in to continue to LearnFlow</p>
          </div>

          {err && (
            <div className="error-message" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span>{err}</span>
            </div>
          )}

          <form onSubmit={onSubmit} className="auth-form">
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

            <div className="form-group">
              <label>Password</label>
              <input
                className="form-input"
                placeholder="Enter your password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <div style={{ textAlign: 'right', marginTop: '4px' }}>
                <Link to="/forgot-password" style={{ color: 'var(--auth-primary)', fontSize: '0.85rem', textDecoration: 'none', fontWeight: 500 }}>
                  Forgot Password?
                </Link>
              </div>
            </div>

            <button type="submit" className="auth-button">
              Log In
            </button>
          </form>

          <div className="divider">or</div>

          <button onClick={googleLogin} className="google-button">
            <svg className="google-icon" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>

          <div className="auth-footer">
            Don't have an account? <Link to="/signup">Sign up</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
