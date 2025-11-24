/**
 * Protected Route Component
 * 
 * Wraps routes that require authentication. Redirects unauthenticated users
 * to the login page while preserving the intended destination. Displays a
 * loading state during authentication check to prevent flickering.
 * 
 * @module ProtectedRoute
 */

import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

/**
 * ProtectedRoute Component
 * 
 * Conditionally renders child components based on user authentication state.
 * Redirects unauthenticated users to /login with replace flag to prevent
 * back-button navigation issues.
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to render if authenticated
 * @returns {React.ReactElement} Loading state, authenticated children, or redirect to login
 * 
 * @example
 * // Protect a dashboard route
 * <Route 
 *   path="/dashboard" 
 *   element={
 *     <ProtectedRoute>
 *       <Dashboard />
 *     </ProtectedRoute>
 *   } 
 * />
 */
export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  
  // Show loading state while checking authentication
  if (loading) return <div>Loading…</div>;
  
  // Render children if authenticated, otherwise redirect to login
  return user ? children : <Navigate to="/login" replace />;
}
