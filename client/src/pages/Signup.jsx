import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { Link, useNavigate } from "react-router-dom";

export default function Signup() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    try {
      await createUserWithEmailAndPassword(auth, email.trim(), password);
      nav("/dashboard");
    } catch (e) { setErr(e.message); }
  }

  return (
    <div>
      <h1>Create account</h1>
      {err && <p>{err}</p>}
      <form onSubmit={onSubmit}>
        <input placeholder="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
        <input placeholder="Password (≥6)" type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
        <button type="submit">Sign up</button>
      </form>
      <p>Already have an account? <Link to="/login">Log in</Link></p>
    </div>
  );
}
