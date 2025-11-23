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
import { createUserWithEmailAndPassword } from "firebase/auth";
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

  return (
    <div className="auth-container">
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

          <div className="auth-footer">
            Already have an account? <Link to="/login">Log in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
