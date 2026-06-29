import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { authenticatedFetch } from "../api";
import { Bell, X, Check, Loader2, Info, AlertTriangle } from "lucide-react";

export default function NotificationsDrawer() {
  const { currentUser } = useAuth();
  
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  // Poll for unread count
  useEffect(() => {
    if (!currentUser) return;
    fetchUnreadCount();

    const interval = setInterval(fetchUnreadCount, 30000); // 30s polling
    return () => clearInterval(interval);
  }, [currentUser]);

  // Load notification feed when drawer opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  async function fetchUnreadCount() {
    try {
      const data = await authenticatedFetch("/api/v2/notifications/unread-count");
      setUnreadCount(data.unreadCount || 0);
    } catch (e) {
      console.error("Failed to load notification unread count:", e);
    }
  }

  async function fetchNotifications() {
    setLoading(true);
    try {
      const data = await authenticatedFetch("/api/v2/notifications?limit=25");
      setNotifications(data.data || []);
    } catch (e) {
      console.error("Failed to load notifications list:", e);
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(id) {
    try {
      await authenticatedFetch(`/api/v2/notifications/${id}/read`, { method: "PATCH" });
      // Optimistic state update
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      fetchUnreadCount();
    } catch (e) {
      alert("Failed to mark notification as read: " + e.message);
    }
  }

  async function markAllAsRead() {
    try {
      await authenticatedFetch("/api/v2/notifications/read-all", { method: "PATCH" });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (e) {
      alert("Failed to mark all as read: " + e.message);
    }
  }

  if (!currentUser) return null;

  return (
    <div className="relative">
      {/* Bell Icon trigger */}
      <button onClick={() => setIsOpen(!isOpen)} className="relative p-2 text-gray-500 hover:text-blue-600 transition-colors bg-white/60 hover:bg-white rounded-full border border-gray-200 shadow-xs focus:outline-none cursor-pointer">
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white font-extrabold text-[10px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-white shadow-md">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Slide-out Drawer */}
      {isOpen && (
        <>
          {/* Backdrop overlay */}
          <div onClick={() => setIsOpen(false)} className="fixed inset-0 bg-black/20 backdrop-blur-xs z-40" />

          <div className="fixed right-0 top-0 h-screen w-80 sm:w-96 bg-white/90 border-l border-gray-200 text-gray-900 shadow-2xl flex flex-col z-50 animate-slideLeft backdrop-blur-md">
            {/* Drawer Header */}
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white/60">
              <div className="flex items-center space-x-2">
                <Bell className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-gray-950">Notifications</h3>
              </div>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <button onClick={markAllAsRead} className="text-xs text-blue-600 hover:text-blue-700 font-semibold px-2 py-1 hover:bg-blue-50 rounded-lg transition cursor-pointer">
                    Mark All Read
                  </button>
                )}
                <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-700 p-1 hover:bg-gray-100 rounded-lg transition cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* List Feed */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loading ? (
                <div className="flex justify-center p-20"><Loader2 className="animate-spin text-blue-500" /></div>
              ) : notifications.length === 0 ? (
                <div className="p-20 text-center text-gray-400 text-sm">
                  <Info className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  No notifications yet.
                </div>
              ) : (
                notifications.map(notif => (
                  <div key={notif._id} className={`p-4 rounded-xl border transition relative flex items-start space-x-3 ${notif.isRead ? "bg-white/50 border-gray-100" : "bg-blue-50/60 border-blue-100 hover:border-blue-200"}`}>
                    {!notif.isRead && (
                      <span className="absolute top-4 right-4 w-2 h-2 bg-blue-500 rounded-full" />
                    )}
                    <div className="shrink-0 mt-0.5">
                      {notif.type === "CRITICAL" ? (
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                      ) : (
                        <Info className="w-5 h-5 text-blue-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 pr-4">
                      <p className="text-xs font-mono text-gray-400 mb-1">{new Date(notif.createdAt).toLocaleDateString()}</p>
                      <h4 className="font-bold text-gray-900 text-sm break-words">{notif.title}</h4>
                      <p className="text-xs text-gray-500 mt-1 break-words leading-relaxed">{notif.body}</p>
                      
                      {!notif.isRead && (
                        <button onClick={() => markAsRead(notif._id)} className="mt-3 text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-lg transition cursor-pointer">
                          <Check className="w-3 h-3 mr-1" /> Mark Read
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
