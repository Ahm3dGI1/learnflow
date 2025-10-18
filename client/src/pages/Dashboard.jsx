import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useAuth } from "../auth/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();
  return (
    <div style={{ maxWidth: 720, margin: "64px auto", padding: 24 }}>
      <header style={{ display: "flex", justifyContent: "space-between" }}>
        <h1>LearnFlow</h1>
        <div>
          <span style={{ marginRight: 12 }}>{user?.email}</span>
          <button onClick={() => signOut(auth)}>Logout</button>
        </div>
      </header>

      <hr style={{ margin: "16px 0" }} />
      <p>You’re authenticated!</p>

      {/* To put video/checkpoint UI here later */}
    </div>
  );
}
