import { useAuth } from "../context/AuthContext";
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { getUserProfile } from "../api";

export default function AdminProtectedRoute({ children }) {
  const { currentUser } = useAuth();
  const [isAdmin, setIsAdmin] = useState(null);

  useEffect(() => {
    async function checkAdmin() {
      if (!currentUser) {
        setIsAdmin(false);
        return;
      }

      try {
        const profile = await getUserProfile(currentUser.uid);
        setIsAdmin(profile.role === "admin" || profile.role === "super_admin" || profile.globalRole === "super_admin");
      } catch (error) {
        console.error("Failed to fetch user profile:", error);
        setIsAdmin(false);
      }
    }

    checkAdmin();
  }, [currentUser]);

  if (isAdmin === null) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="animate-spin w-8 h-8 text-blue-600" />
      </div>
    );
  }

  if (!currentUser || !isAdmin) {
    return <Navigate to="/" />;
  }

  return children;
}
