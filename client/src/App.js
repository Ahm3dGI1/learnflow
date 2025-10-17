import './App.css';
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import ProtectedRoute from "./auth/ProtectedRoute";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";

function Home() {
  return (
    <div style={{ maxWidth: 720, margin: "64px auto", padding: 24 }}>
      <h1>It is LearnFlow! To be edited!</h1>
      <p>Simple and empty landing page.</p>
      <div style={{ display: "flex", gap: 12 }}>
        <Link to="/login"><button>Log in</button></Link>
        <Link to="/signup"><button>Sign up</button></Link>
        <Link to="/dashboard"><button>Go to Dashboard</button></Link>
      </div>
    </div>
  );
}

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