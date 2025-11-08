import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useAuth } from "../auth/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();
  return (
    <div>
      <header>
        <h1>LearnFlow</h1>
        <div>
          <span>{user?.email}</span>
          <button onClick={() => signOut(auth)}>Logout</button>
        </div>
      </header>

      <hr />
      <p>You’re authenticated!</p>

      {/* To put video/checkpoint UI here later */}
    </div>
  );
}
