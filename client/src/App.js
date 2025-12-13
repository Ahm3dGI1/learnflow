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
 * - /video/:videoId : Video player page (protected, requires authentication)
 *
 * @returns {JSX.Element} The application component with routing configured
 */

import './App.css';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import ProtectedRoute from "./auth/ProtectedRoute";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import VideoPage from "./pages/VideoPage";
import QuizPage from "./pages/QuizPage";
import ForgotPassword from "./pages/ForgotPassword";
import Toast from "./components/Toast";
import useToast from "./hooks/useToast";

export default function App() {
  const toast = useToast();

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* public routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* protected routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/video/:videoId"
            element={
              <ProtectedRoute>
                <VideoPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/video/:videoId/quiz"
            element={
              <ProtectedRoute>
                <QuizPage />
              </ProtectedRoute>
            }
          />
        </Routes>
        {/* Global toast notifications */}
        <Toast toasts={toast.toasts} onDismiss={toast.dismiss} />
      </BrowserRouter>
    </AuthProvider>
  );
}