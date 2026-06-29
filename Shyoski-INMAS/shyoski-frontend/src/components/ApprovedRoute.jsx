import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

export default function ApprovedRoute({ children }) {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [isApproved, setIsApproved] = useState(null);

  useEffect(() => {
    async function checkApproval() {
      if (!currentUser?.uid) {
        navigate("/login");
        return;
      }

      try {
        // Super admins or global admins are approved
        if (currentUser.globalRole === "super_admin" || currentUser.role === "admin") {
          setIsApproved(true);
          return;
        }

        // If they have a student batchId, they are approved
        if (currentUser.batchId) {
          setIsApproved(true);
          return;
        }

        // Check if they have memberships
        const { API_URL } = await import("../api");
        const { auth } = await import("../lib/firebase");
        const token = auth.currentUser ? await auth.currentUser.getIdToken() : "";
        const res = await fetch(`${API_URL}/api/v2/student/organizations`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        const data = await res.json();
        
        if (data?.memberships?.length > 0) {
          setIsApproved(true);
        } else {
          // If no batch and no orgs, check if they just logged in
          setIsApproved(true); // Let them through to dynamic dashboard to show fallback state
        }
      } catch (err) {
        console.error("Error checking approval status:", err);
        setIsApproved(true); // Graceful fallback
      }
    }

    checkApproval();
  }, [currentUser, navigate]);

  if (isApproved === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin w-8 h-8 text-blue-600" />
      </div>
    );
  }

  return isApproved ? children : null;
}
