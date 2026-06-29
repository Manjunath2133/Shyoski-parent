import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useTenant } from "../context/TenantContext";
import { useNavigate } from "react-router-dom";
import { LogOut, Shield, ChevronDown, Loader2, Home, AlertCircle } from "lucide-react";

import StudentDashboardView from "../components/StudentDashboardView";
import MentorDashboard from "../components/MentorDashboard";
import EvaluatorDashboard from "../components/EvaluatorDashboard";
import OrgAdminDashboard from "../components/OrgAdminDashboard";
import NotificationsDrawer from "../components/NotificationsDrawer";

export default function Dashboard() {
  const { currentUser, logout } = useAuth();
  const { memberships, organizations, activeOrg, activeRole, loading, switchOrganization } = useTenant();
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
    }
  }, [currentUser]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-900">
        <Loader2 className="animate-spin w-8 h-8 text-blue-600 mb-4" />
        <p className="text-gray-500 text-xs font-semibold">Initializing secure workspace context...</p>
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="bg-transparent text-gray-900 flex flex-col w-full">
      {/* Top Banner Branding / Navbar Dashboard Section */}
      <header className="bg-white/40 border border-white/40 shadow-sm backdrop-blur-md rounded-2xl p-4 mb-8 flex justify-between items-center flex-wrap gap-4">
        <div className="flex items-center space-x-4 flex-wrap gap-2">
          {/* Back Home */}
          <div className="flex items-center space-x-1.5 cursor-pointer text-gray-600 hover:text-blue-600 transition" onClick={() => navigate("/")}>
            <Home className="w-4 h-4" />
            <span className="font-bold text-xs">Home</span>
          </div>

          <span className="text-gray-300">|</span>

          {/* Org Switcher Dropdown */}
          {(memberships.length > 0 || organizations.length > 0) && (
            <div className="relative group">
              <button className="flex items-center space-x-2 bg-white/60 hover:bg-white/80 px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-800 transition cursor-pointer">
                {activeOrg?.logoUrl && (
                  <img src={activeOrg.logoUrl} alt="Logo" className="w-4 h-4 object-contain rounded-xs" />
                )}
                <span>{activeOrg?.name || "Select Tenant Organization"}</span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              </button>
              
              {/* Dropdown Box */}
              <div className="absolute left-0 mt-2 w-64 bg-white border border-gray-100 rounded-2xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="p-2 space-y-1">
                  <span className="block text-[9px] font-bold text-gray-400 uppercase px-3 py-1.5 tracking-wider">Your Memberships</span>
                  {memberships.map(mem => (
                    <button 
                      key={mem.organizationId} 
                      onClick={() => switchOrganization(mem.organizationId)}
                      className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg hover:bg-gray-50 transition flex items-center space-x-2 ${activeOrg?._id === mem.organizationId ? "bg-blue-50 text-blue-650 font-bold" : "text-gray-700"}`}
                    >
                      {mem.organization?.logoUrl && (
                        <img src={mem.organization.logoUrl} alt="logo" className="w-3.5 h-3.5 object-contain" />
                      )}
                      <span className="truncate">{mem.organization?.name}</span>
                      <span className="text-[9px] font-mono text-gray-400 ml-auto uppercase">({mem.role})</span>
                    </button>
                  ))}

                  {/* Super admin global listings */}
                  {(currentUser?.globalRole === "super_admin" || currentUser?.role === "admin") && organizations.length > 0 && (
                    <>
                      <span className="block text-[9px] font-bold text-gray-400 uppercase px-3 py-1.5 border-t border-gray-150 mt-2 pt-2 tracking-wider">All Tenants (Super Admin)</span>
                      {organizations.map(org => {
                        if (memberships.some(m => m.organizationId === org._id)) return null;
                        return (
                          <button 
                            key={org._id} 
                            onClick={() => switchOrganization(org._id)}
                            className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg hover:bg-gray-50 transition flex items-center space-x-2 ${activeOrg?._id === org._id ? "bg-blue-50 text-blue-650 font-bold" : "text-gray-700"}`}
                          >
                            {org.logoUrl && (
                              <img src={org.logoUrl} alt="logo" className="w-3.5 h-3.5 object-contain" />
                            )}
                            <span className="truncate">{org.name}</span>
                          </button>
                        );
                      })}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Global Toolbar */}
        <div className="flex items-center space-x-3">
          {/* Notifications Drawer Component */}
          <NotificationsDrawer />

          {/* Super Admin Control Panel link */}
          {(currentUser?.globalRole === "super_admin" || currentUser?.role === "admin") && (
            <button onClick={() => navigate("/super-admin")} className="flex items-center space-x-1.5 text-xs font-bold text-blue-700 bg-blue-50 px-3.5 py-2 rounded-xl border border-blue-100 hover:bg-blue-100 transition-all shadow-sm">
              <Shield className="w-3.5 h-3.5" />
              <span>Platform Settings</span>
            </button>
          )}

          {/* Logout Action */}
          <button onClick={handleLogout} className="flex items-center space-x-1 p-2 text-gray-555 hover:text-red-650 bg-white/60 hover:bg-white rounded-full border border-gray-200 transition shadow-xs cursor-pointer">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Workspace Panel */}
      <main className="flex-1 w-full">
        {!activeOrg ? (
          /* Empty / Fallback State */
          <div className="max-w-md mx-auto text-center p-8 bg-white/50 border border-white/50 rounded-3xl mt-10 space-y-4 shadow-sm">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto" />
            <h3 className="text-lg font-bold text-gray-950">No Active Organization</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              You are currently not registered under any tenant organizations. If you just applied, please await administrator approval or log in to a different account.
            </p>
            {(currentUser?.globalRole === "super_admin" || currentUser?.role === "admin") && (
              <button onClick={() => navigate("/super-admin")} className="mt-4 w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition">
                Access Platform Settings (Super Admin)
              </button>
            )}
          </div>
        ) : (
          /* Delegated Dashboard View based on role */
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-150 pb-6 mb-6">
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-950">
                  {activeRole === "super_admin" ? "Super Admin Platform Mode" : `${activeOrg.name} Workspace`}
                </h1>
                <p className="text-xs text-gray-500 mt-1">Logged in as: <strong className="text-gray-700">{currentUser.displayName || currentUser.email}</strong></p>
              </div>
              <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-3 py-1 rounded-full border border-blue-100 uppercase tracking-wider">
                Active Role: {activeRole}
              </span>
            </div>

            {/* Dashboard Routing */}
            {activeRole === "super_admin" && (
              <div className="space-y-4">
                <div className="bg-white/40 border border-white/40 p-6 rounded-3xl flex items-center justify-between shadow-sm">
                  <div>
                    <h3 className="font-bold text-gray-950 text-sm">Super Admin Override Active</h3>
                    <p className="text-xs text-gray-500 mt-1">You are viewing this organization as a Super Administrator. You can switch to other tenants above or manage platform controls.</p>
                  </div>
                  <button onClick={() => navigate("/super-admin")} className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-xs cursor-pointer">
                    Platform Console
                  </button>
                </div>
                {/* Fallback to render org admin widgets since super admin bypasses org admin restrictions */}
                <OrgAdminDashboard />
              </div>
            )}
            {activeRole === "org_admin" && <OrgAdminDashboard />}
            {activeRole === "mentor" && <MentorDashboard />}
            {activeRole === "evaluator" && <EvaluatorDashboard />}
            {activeRole === "student" && <StudentDashboardView />}
          </div>
        )}
      </main>
    </div>
  );
}