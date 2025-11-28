/**
 * Signup Page Component
 * 
 * User registration page for creating new accounts with email and password.
 * Validates input requirements (minimum 6 character password), handles
 * Firebase account creation, displays error messages, and redirects to
 * dashboard upon successful registration.
 * 
 * @module Signup
 */

import { useState } from "react";
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "../firebase";
import { Link, useNavigate } from "react-router-dom";
import "./Auth.css";

/**
 * Signup Component
 * 
 * Provides registration form with email/password fields and client-side
 * validation. Trims email input, enforces 6-character minimum password,
 * displays Firebase error messages, and navigates to dashboard after
 * successful account creation. Includes link to login page for existing users.
 * 
 * @returns {React.ReactElement} Signup page with registration form
 * 
 * @example
 * // Used in main App routing
 * <Route path="/signup" element={<Signup />} />
 */
export default function Signup() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  /**
   * Handle Form Submission
   * 
   * Creates new Firebase user account with email and password. Trims email
   * input, clears previous errors, and redirects to dashboard on success.
   * Displays Firebase error message if registration fails (e.g., email
   * already in use, weak password).
   * 
   * @param {Event} e - Form submit event
   * @returns {Promise<void>}
   */
  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    try {
      await createUserWithEmailAndPassword(auth, email.trim(), password);
      nav("/dashboard");
    } catch (e) {
      setErr(e.message);
    }
  }

  /**
   * Handle Google OAuth Signup
   * 
   * Creates new Firebase user account with Google OAuth popup. Redirects
   * to dashboard on success or displays error message on failure.
   * 
   * @returns {Promise<void>}
   */
  async function googleSignup() {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      nav("/dashboard");
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <div className="auth-container">
      <header className="auth-header-top">
        <div className="auth-header-content">
          <Link to="/" className="auth-logo">LearnFlow</Link>
          <div className="auth-header-buttons">
            <Link to="/login" className="auth-header-link">Login</Link>
            <Link to="/signup" className="auth-header-button">Sign Up</Link>
          </div>
        </div>
      </header>
      <div>
        <Link to="/" className="back-home">← Back to Home</Link>
        <div className="auth-card">
          <div className="auth-header">
            <h1>Create Account</h1>
            <p>Join LearnFlow to start learning</p>
          </div>

          {err && <div className="error-message">{err}</div>}

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
                placeholder="At least 6 characters"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <button type="submit" className="auth-button">
              Sign Up
            </button>
          </form>

          <div className="divider">or</div>

          <button onClick={googleSignup} className="google-button">
            <svg className="google-icon" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <div className="auth-footer">
            Already have an account? <Link to="/login">Log in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
