import { useState, useEffect } from "react";
import {
  getAllUsers,
  getUserDetailsById,
  deleteAllUserData,
  toggleUserStatus,
} from "../../firebase/adminService";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Search,
  Eye,
  Trash2,
  X,
  Mail,
  Phone,
  Calendar,
  Wallet,
  ArrowUpDown,
  Loader,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Copy,
  Check,
  ShieldCheck,
  ShieldAlert,
  UserX,
  UserCheck,
} from "lucide-react";
import toast from "react-hot-toast";

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'active' | 'disabled'
  const [selectedUser, setSelectedUser] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleteText, setDeleteText] = useState("");
  const [sortField, setSortField] = useState("createdAt");
  const [sortAsc, setSortAsc] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await getAllUsers();
      setUsers(data);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyId = (userId, e) => {
    e?.stopPropagation();
    navigator.clipboard.writeText(userId);
    setCopiedId(userId);
    toast.success("User ID copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleToggleStatus = async (user, e) => {
    e?.stopPropagation();
    if (user.email?.toLowerCase().trim() === "egdmadhankumar@gmail.com") {
      toast.error("Primary administrator (egdmadhankumar@gmail.com) is the source root and cannot be disabled.");
      return;
    }
    const currentStatus = user.status || "active";
    const nextStatus = currentStatus === "disabled" ? "active" : "disabled";
    setTogglingId(user.id);

    try {
      await toggleUserStatus(user.id, currentStatus);
      // Optimistically update list
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id
            ? { ...u, status: nextStatus, disabled: nextStatus === "disabled" }
            : u
        )
      );
      if (selectedUser && selectedUser.id === user.id) {
        setSelectedUser((prev) => ({
          ...prev,
          status: nextStatus,
          disabled: nextStatus === "disabled",
        }));
      }
      toast.success(
        nextStatus === "active"
          ? `User "${user.displayName || user.email}" is now ACTIVE.`
          : `User "${user.displayName || user.email}" has been DISABLED.`
      );
    } catch (err) {
      console.error("Failed to toggle user status:", err);
      toast.error("Failed to update user status");
    } finally {
      setTogglingId(null);
    }
  };

  const handleViewUser = async (userId) => {
    setDetailLoading(true);
    try {
      const details = await getUserDetailsById(userId);
      setSelectedUser(details);
    } catch (error) {
      console.error("Error fetching user details:", error);
      toast.error("Failed to load user details");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      await deleteAllUserData(userId);
      toast.success("User deleted successfully");
      setDeleteConfirm(null);
      setDeleteText("");
      setSelectedUser(null);
      await fetchUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Failed to delete user");
    }
  };

  // Counts
  const totalUserCount = users.length;
  const activeUserCount = users.filter((u) => (u.status || "active") !== "disabled").length;
  const disabledUserCount = users.filter((u) => (u.status || "active") === "disabled").length;

  const filteredUsers = users
    .filter((u) => {
      const userStatus = u.status || "active";
      if (statusFilter !== "all" && userStatus !== statusFilter) {
        return false;
      }
      const q = searchQuery.toLowerCase();
      return (
        u.id?.toLowerCase().includes(q) ||
        u.displayName?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.phone?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      let aVal, bVal;
      if (sortField === "createdAt") {
        aVal = a.createdAt?.toDate?.() || a.createdAt || new Date(0);
        bVal = b.createdAt?.toDate?.() || b.createdAt || new Date(0);
      } else if (sortField === "totalBalance") {
        aVal = a.totalBalance || 0;
        bVal = b.totalBalance || 0;
      } else if (sortField === "transactionCount") {
        aVal = a.transactionCount || 0;
        bVal = b.transactionCount || 0;
      } else {
        aVal = a[sortField] || "";
        bVal = b[sortField] || "";
      }
      if (sortAsc) return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });

  const toggleSort = (field) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return null;
    return sortAsc ? (
      <ChevronUp className="w-3.5 h-3.5 inline ml-1" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 inline ml-1" />
    );
  };

  const formatDate = (date) => {
    if (!date) return "N/A";
    const d = date?.toDate?.() || new Date(date);
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader className="w-10 h-10 text-purple-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Header & Summary Counts ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            User Management & Access Control
          </h1>
          <p className="text-gray-400 mt-1 text-sm">
            Inspect all registered user IDs, copy Firebase UIDs, and control active/disabled access modes
          </p>
        </div>
      </div>

      {/* ─── Summary Metric Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Users */}
        <div
          onClick={() => setStatusFilter("all")}
          className={`p-5 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === "all"
              ? "bg-purple-500/15 border-purple-500/40 ring-1 ring-purple-500/30 shadow-lg shadow-purple-500/10"
              : "bg-white/[0.03] border-white/5 hover:border-white/10"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Total User IDs
            </span>
            <Users className="w-5 h-5 text-purple-400" />
          </div>
          <p className="text-3xl font-extrabold text-white">{totalUserCount}</p>
          <p className="text-xs text-gray-500 mt-1">All registered Firebase accounts</p>
        </div>

        {/* Active Accounts */}
        <div
          onClick={() => setStatusFilter("active")}
          className={`p-5 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === "active"
              ? "bg-emerald-500/15 border-emerald-500/40 ring-1 ring-emerald-500/30 shadow-lg shadow-emerald-500/10"
              : "bg-white/[0.03] border-white/5 hover:border-white/10"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Active Accounts
            </span>
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-3xl font-extrabold text-emerald-400">{activeUserCount}</p>
          <p className="text-xs text-emerald-500/80 mt-1">Full login & budget access</p>
        </div>

        {/* Disabled Accounts */}
        <div
          onClick={() => setStatusFilter("disabled")}
          className={`p-5 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === "disabled"
              ? "bg-red-500/15 border-red-500/40 ring-1 ring-red-500/30 shadow-lg shadow-red-500/10"
              : "bg-white/[0.03] border-white/5 hover:border-white/10"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Disabled Accounts
            </span>
            <ShieldAlert className="w-5 h-5 text-red-400" />
          </div>
          <p className="text-3xl font-extrabold text-red-400">{disabledUserCount}</p>
          <p className="text-xs text-red-400/80 mt-1">Access restricted by administrator</p>
        </div>
      </div>

      {/* ─── Search & Status Filters ─── */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            spellCheck="false"
            autoCorrect="off"
            autoComplete="off"
            placeholder="Search by User ID, Name, Email, or Phone..."
            className="w-full pl-11 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 text-sm transition-all"
          />
        </div>

        {/* Status Filter Buttons */}
        <div className="flex items-center bg-white/5 p-1 rounded-xl border border-white/10 shrink-0">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              statusFilter === "all"
                ? "bg-purple-600 text-white shadow-sm"
                : "text-gray-400 hover:text-white"
            }`}
          >
            All ({totalUserCount})
          </button>
          <button
            onClick={() => setStatusFilter("active")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              statusFilter === "active"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-gray-400 hover:text-emerald-400"
            }`}
          >
            Active ({activeUserCount})
          </button>
          <button
            onClick={() => setStatusFilter("disabled")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              statusFilter === "disabled"
                ? "bg-red-600 text-white shadow-sm"
                : "text-gray-400 hover:text-red-400"
            }`}
          >
            Disabled ({disabledUserCount})
          </button>
        </div>
      </div>

      {/* ─── Users Table ─── */}
      <div className="bg-white/[0.03] backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.01]">
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  User & ID
                </th>
                <th className="text-center px-4 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Access Mode
                </th>
                <th
                  className="text-left px-5 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-200 transition-colors"
                  onClick={() => toggleSort("createdAt")}
                >
                  Joined <SortIcon field="createdAt" />
                </th>
                <th
                  className="text-right px-5 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-200 transition-colors"
                  onClick={() => toggleSort("totalBalance")}
                >
                  Balance <SortIcon field="totalBalance" />
                </th>
                <th
                  className="text-right px-5 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-200 transition-colors"
                  onClick={() => toggleSort("transactionCount")}
                >
                  Txns <SortIcon field="transactionCount" />
                </th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filteredUsers.map((user, index) => {
                  const isUserDisabled = (user.status || "active") === "disabled";
                  return (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className={`border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors group ${
                        isUserDisabled ? "bg-red-500/[0.02]" : ""
                      }`}
                    >
                      {/* User Info & UID */}
                      <td className="px-6 py-4">
                        <div className="flex items-start space-x-3">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center border shrink-0 mt-0.5 ${
                              isUserDisabled
                                ? "bg-red-500/20 border-red-500/30 text-red-400"
                                : "bg-gradient-to-br from-purple-500/30 to-indigo-500/30 border-purple-500/20 text-purple-300"
                            }`}
                          >
                            <span className="text-sm font-bold">
                              {(user.displayName || user.email || "?")[0]?.toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0 max-w-xs">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-white truncate">
                                {user.displayName || "No Name"}
                              </p>
                              {isUserDisabled && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-red-500/20 text-red-300 border border-red-500/30 font-semibold">
                                  Disabled
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400 truncate mt-0.5">
                              {user.email}
                            </p>
                            {/* Prominent Firebase User ID with copy button */}
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="text-[11px] font-mono text-gray-500 truncate max-w-[170px]">
                                ID: {user.id}
                              </span>
                              <button
                                onClick={(e) => handleCopyId(user.id, e)}
                                className="p-1 hover:bg-white/10 rounded text-gray-500 hover:text-purple-400 transition"
                                title="Copy User ID"
                              >
                                {copiedId === user.id ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Access Mode Toggle / Control */}
                      <td className="px-4 py-4 text-center whitespace-nowrap">
                        {user.email?.toLowerCase().trim() === "egdmadhankumar@gmail.com" ? (
                          <span className="px-3 py-1 rounded-xl text-xs font-bold bg-violet-600/20 text-violet-300 border border-violet-500/30 flex items-center justify-center gap-1.5 shadow-xs">
                            <Shield className="w-3.5 h-3.5 text-violet-400" />
                            Root Admin (Protected)
                          </span>
                        ) : (
                          <div className="inline-flex flex-col items-center gap-1.5">
                            {isUserDisabled ? (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/30 flex items-center gap-1">
                                <UserX className="w-3 h-3" />
                                Disabled
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                                <UserCheck className="w-3 h-3" />
                                Active
                              </span>
                            )}

                            <button
                              onClick={(e) => handleToggleStatus(user, e)}
                              disabled={togglingId === user.id}
                              className={`px-3 py-1 rounded-lg text-xs font-semibold transition border ${
                                isUserDisabled
                                  ? "bg-emerald-600/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-600/30"
                                  : "bg-red-600/20 text-red-300 border-red-500/30 hover:bg-red-600/30"
                              } disabled:opacity-50`}
                            >
                              {togglingId === user.id
                                ? "Updating..."
                                : isUserDisabled
                                ? "Activate User"
                                : "Disable User"}
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Joined Date */}
                      <td className="px-5 py-4 text-sm text-gray-400 whitespace-nowrap">
                        {formatDate(user.createdAt)}
                      </td>

                      {/* Balance */}
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <span className="text-sm font-semibold text-emerald-400">
                          ₹{(user.totalBalance || 0).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </td>

                      {/* Txns Count */}
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <span className="text-sm text-gray-300">
                          {user.transactionCount || 0}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleViewUser(user.id)}
                            className="p-2 hover:bg-purple-500/10 rounded-lg text-gray-400 hover:text-purple-400 transition-colors"
                            title="View User Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(user)}
                            className="p-2 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-400 transition-colors"
                            title="Delete User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-16">
            <Users className="w-12 h-12 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">
              {searchQuery ? "No user IDs match your search" : "No users found"}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Try searching by UID, email, or changing the status filter.
            </p>
          </div>
        )}
      </div>

      {/* ─── User Detail Slide-out / Modal (with Swipe Down & X button) ─── */}
      <AnimatePresence>
        {selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedUser(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              onTouchStart={(e) => {
                e.currentTarget._touchStartY = e.touches[0].clientY;
              }}
              onTouchEnd={(e) => {
                if (!e.currentTarget._touchStartY) return;
                const delta = e.changedTouches[0].clientY - e.currentTarget._touchStartY;
                if (delta > 60) setSelectedUser(null);
              }}
            >
              {/* Swipe Down Handle */}
              <div className="w-full flex justify-center pt-3 pb-1 cursor-grab">
                <div className="w-12 h-1.5 bg-gray-600 rounded-full" />
              </div>

              {detailLoading ? (
                <div className="flex items-center justify-center p-12">
                  <Loader className="w-8 h-8 text-purple-400 animate-spin" />
                </div>
              ) : (
                <>
                  {/* Modal Header */}
                  <div className="p-6 border-b border-white/5 flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold text-white">
                          {selectedUser.displayName || "User Details"}
                        </h2>
                        {selectedUser.status === "disabled" ? (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-red-500/20 text-red-400 border border-red-500/30 font-semibold">
                            Disabled
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold">
                            Active
                          </span>
                        )}
                      </div>
                      {/* Copyable User ID in Header */}
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs font-mono text-purple-300 bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-500/20">
                          UID: {selectedUser.id}
                        </span>
                        <button
                          onClick={(e) => handleCopyId(selectedUser.id, e)}
                          className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white transition"
                          title="Copy Full User ID"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedUser(null)}
                      className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Access Mode Toggle Bar inside Modal */}
                  {selectedUser.email?.toLowerCase().trim() === "egdmadhankumar@gmail.com" ? (
                    <div className="px-6 py-3 bg-violet-500/10 border-b border-violet-500/20 flex items-center justify-between">
                      <span className="text-xs text-violet-300 font-medium flex items-center gap-1.5">
                        <Shield className="w-4 h-4 text-violet-400" />
                        Primary Root Administrator Account
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-violet-600/20 text-violet-300 border border-violet-500/30">
                        Protected Source Root
                      </span>
                    </div>
                  ) : (
                    <div className="px-6 py-3 bg-white/[0.02] border-b border-white/5 flex items-center justify-between">
                      <span className="text-xs text-gray-400 font-medium">
                        Account Access Control Mode:
                      </span>
                      <button
                        onClick={(e) => handleToggleStatus(selectedUser, e)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
                          selectedUser.status === "disabled"
                            ? "bg-emerald-600/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-600/30"
                            : "bg-red-600/20 text-red-300 border-red-500/30 hover:bg-red-600/30"
                        }`}
                      >
                        {selectedUser.status === "disabled"
                          ? "Switch to Active Mode"
                          : "Switch to Disabled Mode"}
                      </button>
                    </div>
                  )}

                  <div className="p-6 space-y-6">
                    {/* User Info Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-white/5 rounded-xl p-4 border border-white/5 flex items-center space-x-3">
                        <Mail className="w-5 h-5 text-purple-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-gray-500">Email Address</p>
                          <p className="text-sm text-white truncate">
                            {selectedUser.email || "N/A"}
                          </p>
                        </div>
                      </div>
                      <div className="bg-white/5 rounded-xl p-4 border border-white/5 flex items-center space-x-3">
                        <Phone className="w-5 h-5 text-cyan-400 shrink-0" />
                        <div>
                          <p className="text-xs text-gray-500">Phone</p>
                          <p className="text-sm text-white">
                            {selectedUser.phone || "Not set"}
                          </p>
                        </div>
                      </div>
                      <div className="bg-white/5 rounded-xl p-4 border border-white/5 flex items-center space-x-3">
                        <Calendar className="w-5 h-5 text-amber-400 shrink-0" />
                        <div>
                          <p className="text-xs text-gray-500">Registration Date</p>
                          <p className="text-sm text-white">
                            {formatDate(selectedUser.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="bg-white/5 rounded-xl p-4 border border-white/5 flex items-center space-x-3">
                        <Wallet className="w-5 h-5 text-emerald-400 shrink-0" />
                        <div>
                          <p className="text-xs text-gray-500">Preferred Currency</p>
                          <p className="text-sm text-white">
                            {selectedUser.currency || "INR"} (
                            {selectedUser.currencySymbol || "₹"})
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Accounts List */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center space-x-2">
                        <Wallet className="w-4 h-4 text-purple-400" />
                        <span>Accounts ({selectedUser.accounts?.length || 0})</span>
                      </h3>
                      <div className="space-y-2">
                        {selectedUser.accounts?.map((acc) => (
                          <div
                            key={acc.id}
                            className="flex items-center justify-between bg-white/5 rounded-xl p-3 border border-white/5"
                          >
                            <div>
                              <p className="text-sm font-medium text-white">{acc.name}</p>
                              <p className="text-xs text-gray-500 capitalize">{acc.type}</p>
                            </div>
                            <p className="text-sm font-semibold text-emerald-400">
                              ₹{(acc.balance || 0).toLocaleString("en-IN", {
                                minimumFractionDigits: 2,
                              })}
                            </p>
                          </div>
                        ))}
                        {(!selectedUser.accounts || selectedUser.accounts.length === 0) && (
                          <p className="text-sm text-gray-600 text-center py-4">No accounts</p>
                        )}
                      </div>
                    </div>

                    {/* Recent Transactions List */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center space-x-2">
                        <ArrowUpDown className="w-4 h-4 text-purple-400" />
                        <span>
                          Recent Transactions ({selectedUser.transactions?.length || 0} total)
                        </span>
                      </h3>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {selectedUser.transactions?.slice(0, 10).map((tx) => (
                          <div
                            key={tx.id}
                            className="flex items-center justify-between bg-white/5 rounded-xl p-3 border border-white/5"
                          >
                            <div className="flex items-center space-x-3">
                              <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                  tx.type === "income"
                                    ? "bg-emerald-500/20"
                                    : tx.type === "expense"
                                    ? "bg-red-500/20"
                                    : "bg-violet-500/20"
                                }`}
                              >
                                <ArrowUpDown
                                  className={`w-4 h-4 ${
                                    tx.type === "income"
                                      ? "text-emerald-400"
                                      : tx.type === "expense"
                                      ? "text-red-400"
                                      : "text-violet-400"
                                  }`}
                                />
                              </div>
                              <div>
                                <p className="text-sm text-white">
                                  {tx.category || tx.type}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {tx.date
                                    ? new Date(tx.date).toLocaleDateString("en-IN")
                                    : "N/A"}
                                </p>
                              </div>
                            </div>
                            <p
                              className={`text-sm font-semibold ${
                                tx.type === "income"
                                  ? "text-emerald-400"
                                  : tx.type === "expense"
                                  ? "text-red-400"
                                  : "text-violet-400"
                              }`}
                            >
                              {tx.type === "income" ? "+" : tx.type === "expense" ? "−" : ""}
                              ₹{(tx.amount || 0).toLocaleString("en-IN", {
                                minimumFractionDigits: 2,
                              })}
                            </p>
                          </div>
                        ))}
                        {(!selectedUser.transactions ||
                          selectedUser.transactions.length === 0) && (
                          <p className="text-sm text-gray-600 text-center py-4">
                            No transactions
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Delete Confirmation Modal ─── */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => {
              setDeleteConfirm(null);
              setDeleteText("");
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-red-500/20 rounded-2xl w-full max-w-md p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Delete User</h3>
                  <p className="text-sm text-gray-500">This action is irreversible</p>
                </div>
              </div>

              <p className="text-sm text-gray-400 mb-4">
                You are about to permanently delete{" "}
                <span className="text-white font-semibold">
                  {deleteConfirm.displayName || deleteConfirm.email}
                </span>{" "}
                (UID: <span className="font-mono text-purple-300">{deleteConfirm.id}</span>) and all associated data.
              </p>

              <p className="text-xs text-gray-500 mb-2">
                Type <span className="font-mono text-red-400 font-bold">DELETE</span> to confirm:
              </p>
              <input
                type="text"
                value={deleteText}
                onChange={(e) => setDeleteText(e.target.value)}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20 transition-all mb-4 font-mono"
                placeholder="DELETE"
              />

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setDeleteConfirm(null);
                    setDeleteText("");
                  }}
                  className="flex-1 py-2.5 bg-white/5 border border-white/10 rounded-xl text-gray-300 hover:bg-white/10 transition-all text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteUser(deleteConfirm.id)}
                  disabled={deleteText !== "DELETE"}
                  className="flex-1 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed text-sm font-semibold"
                >
                  Delete Forever
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminUsers;
