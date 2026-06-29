import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const { currentUser } = useAuth();

  if (!currentUser) {
    // If not logged in, redirect to Home/Login
    return <Navigate to="/" />;
  }

  return children;
}