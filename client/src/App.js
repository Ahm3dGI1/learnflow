/**
 * Main Application Component for LearnFlow.
 * 
 * This is the root component that sets up routing, authentication context,
 * and defines all application routes. It wraps the entire application with
 * the AuthProvider to make authentication state available throughout the app.
 * 
 * Routes:
 * - / : Home page (public)
 * - /login : Login page (public)
 * - /signup : Signup page (public)
 * - /dashboard : Main dashboard (protected, requires authentication)
 * 
 * @returns {JSX.Element} The application component with routing configured
 */

import './App.css';
import { BrowserRouter, Routes, Route} from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import ProtectedRoute from "./auth/ProtectedRoute";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* public routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* protected route */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}