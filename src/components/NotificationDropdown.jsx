import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  CheckCheck,
  Trash2,
  ShieldAlert,
  BarChart2,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  X,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import {
  streamNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  clearAllNotifications,
  requestBrowserNotificationPermission,
} from "../firebase/notificationService";
import { formatDistanceToNow } from "date-fns";

const NotificationDropdown = () => {
  const { currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const dropdownRef = useRef(null);

  // Subscribe to real-time notifications
  useEffect(() => {
    if (!currentUser?.uid) return;
    const unsubscribe = streamNotifications(currentUser.uid, (items) => {
      setNotifications(items);
    });
    return () => unsubscribe();
  }, [currentUser?.uid]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleToggle = () => {
    if (!isOpen) {
      // Proactively request browser notification permission on user gesture
      requestBrowserNotificationPermission();
    }
    setIsOpen(!isOpen);
  };

  const getIconForType = (type) => {
    switch (type) {
      case "security_low_balance":
        return <ShieldAlert className="w-4 h-4 text-red-500" />;
      case "overdraft":
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case "daily_summary":
        return <BarChart2 className="w-4 h-4 text-violet-600" />;
      case "high_expense":
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      case "income":
        return <TrendingUp className="w-4 h-4 text-emerald-500" />;
      default:
        return <Bell className="w-4 h-4 text-violet-600" />;
    }
  };

  const formatTime = (date) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch {
      return "Recently";
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleToggle}
        className="relative p-2 text-gray-600 hover:text-violet-600 hover:bg-gray-100 rounded-xl transition"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full ring-2 ring-white animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl py-3 z-50 border border-gray-100 flex flex-col max-h-[80vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-900 text-sm">Notifications</span>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 text-xs font-semibold text-red-600 bg-red-50 rounded-full border border-red-200">
                    {unreadCount} new
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllNotificationsAsRead(currentUser.uid)}
                    className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition"
                    title="Mark all as read"
                  >
                    <CheckCheck className="w-4 h-4" />
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={() => clearAllNotifications(currentUser.uid)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                    title="Clear all notifications"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition sm:hidden"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="overflow-y-auto divide-y divide-gray-50 flex-1 px-1">
              {notifications.length === 0 ? (
                <div className="py-12 text-center text-gray-400">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-semibold text-gray-600">All caught up!</p>
                  <p className="text-xs text-gray-400 mt-0.5">No notifications right now.</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => {
                      if (!n.read) markNotificationAsRead(currentUser.uid, n.id);
                    }}
                    className={`flex items-start gap-3 p-3 rounded-xl transition cursor-pointer my-1 ${
                      n.read
                        ? "hover:bg-gray-50 text-gray-600"
                        : "bg-violet-50/40 hover:bg-violet-50/70 text-gray-900 border-l-2 border-violet-500"
                    }`}
                  >
                    <div className="p-2 rounded-xl bg-gray-100/80 shrink-0 mt-0.5">
                      {getIconForType(n.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={`text-xs ${
                            n.read ? "font-semibold text-gray-700" : "font-bold text-gray-900"
                          } truncate`}
                        >
                          {n.title}
                        </p>
                        <span className="text-[10px] text-gray-400 whitespace-nowrap">
                          {formatTime(n.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                        {n.message}
                      </p>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(currentUser.uid, n.id);
                      }}
                      className="p-1 text-gray-300 hover:text-red-500 rounded transition shrink-0"
                      title="Delete"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationDropdown;

