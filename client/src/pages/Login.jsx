// src/pages/Login.jsx
import { useState } from "react";
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "../firebase";
import { Link, useNavigate } from "react-router-dom";

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      nav("/dashboard");
    } catch (e) { setErr(e.message); }
  }

  async function googleLogin() {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      nav("/dashboard");
    } catch (e) { setErr(e.message); }
  }

  return (
    <div style={{ maxWidth: 420, margin: "64px auto", padding: 24 }}>
      <h1>Log in</h1>
      {err && <p style={{ color: "crimson" }}>{err}</p>}
      <form onSubmit={onSubmit}>
        <input placeholder="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
        <input placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
        <button type="submit">Log in</button>
      </form>
      <button onClick={googleLogin} style={{ marginTop: 8 }}>Continue with Google</button>
      <p style={{ marginTop: 16 }}>No account? <Link to="/signup">Sign up</Link></p>
    </div>
  );
}
