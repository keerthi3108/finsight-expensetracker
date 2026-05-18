import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

/** Redirect logged-in users away from login/signup. */
export default function GuestRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="auth-loading">
        <span className="spinner lg" />
      </div>
    );
  }
  if (user) return <Navigate to="/" replace />;
  return children;
}
