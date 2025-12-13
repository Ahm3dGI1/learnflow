/**
 * Authentication Context for LearnFlow.
 * 
 * This module provides authentication state management using React Context API
 * and Firebase Authentication. It wraps the application with an AuthProvider
 * that tracks the current user's authentication status and provides it to
 * all child components via the useAuth hook.
 * 
 * @module AuthContext
 */

import { createContext, useContext, useEffect, useState } from "react";
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import api from "../services/api";

/**
 * Authentication context with default values.
 * 
 * @type {React.Context<{user: object|null, loading: boolean}>}
 */
const AuthCtx = createContext({ user: null, loading: true });

/**
 * Authentication Provider Component.
 * 
 * Wraps the application and provides authentication state to all child components.
 * Listens to Firebase auth state changes and updates the context accordingly.
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to wrap
 * @returns {JSX.Element} Provider component with authentication context
 * 
 * @example
 * <AuthProvider>
 *   <App />
 * </AuthProvider>
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    /**
     * Subscribe to Firebase auth state changes.
     * Updates user state when authentication status changes.
     */
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u ?? null);
      setLoading(false);

      if (u) {
        try {
          // Sync user with backend
          console.log('[AuthContext] Syncing user with backend...');
          const response = await api.post("/api/users", {});
          console.log('[AuthContext] User synced:', response);
        } catch (err) {
          console.error("[AuthContext] Failed to sync user with backend:", err);
        }
      }
    });

    // Cleanup subscription on unmount
    return () => unsub();
  }, []);

  return <AuthCtx.Provider value={{ user, loading }}>{children}</AuthCtx.Provider>;
}

/**
 * Custom hook to access authentication context.
 * 
 * Provides access to the current user object and loading state.
 * Must be used within an AuthProvider component.
 * 
 * @returns {{user: object|null, loading: boolean}} Authentication context value
 * @property {object|null} user - Current authenticated user or null
 * @property {boolean} loading - Whether authentication state is being determined
 * 
 * @example
 * const { user, loading } = useAuth();
 * if (loading) return <div>Loading...</div>;
 * if (!user) return <Navigate to="/login" />;
 */
export function useAuth() {
  return useContext(AuthCtx);
}
