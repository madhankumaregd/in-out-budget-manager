import { useState, useEffect } from "react";
import { getAllUsers, getUserDetailsById, deleteAllUserData } from "../../firebase/adminService";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Search, Eye, Trash2, X, Mail, Phone, Calendar,
  Wallet, ArrowUpDown, Loader, ChevronDown, ChevronUp,
  AlertTriangle,
} from "lucide-react";

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleteText, setDeleteText] = useState("");
  const [sortField, setSortField] = useState("createdAt");
  const [sortAsc, setSortAsc] = useState(false);

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
    } finally {
      setLoading(false);
    }
  };

  const handleViewUser = async (userId) => {
    setDetailLoading(true);
    try {
      const details = await getUserDetailsById(userId);
      setSelectedUser(details);
    } catch (error) {
      console.error("Error fetching user details:", error);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      await deleteAllUserData(userId);
      setDeleteConfirm(null);
      setDeleteText("");
      setSelectedUser(null);
      await fetchUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
    }
  };

  const filteredUsers = users
    .filter((u) => {
      const q = searchQuery.toLowerCase();
      return (
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">User Management</h1>
          <p className="text-gray-500 mt-1 text-sm">
            {users.length} registered user{users.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, email, or phone..."
          className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
        />
      </div>

      {/* Users Table */}
      <div className="bg-white/[0.03] backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  User
                </th>
                <th
                  className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-200 transition-colors"
                  onClick={() => toggleSort("createdAt")}
                >
                  Joined <SortIcon field="createdAt" />
                </th>
                <th
                  className="text-right px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-200 transition-colors"
                  onClick={() => toggleSort("totalBalance")}
                >
                  Balance <SortIcon field="totalBalance" />
                </th>
                <th
                  className="text-right px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-200 transition-colors"
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
                {filteredUsers.map((user, index) => (
                  <motion.tr
                    key={user.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500/30 to-indigo-500/30 rounded-full flex items-center justify-center border border-purple-500/20 shrink-0">
                          <span className="text-sm font-bold text-purple-300">
                            {(user.displayName || user.email || "?")[0]?.toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {user.displayName || "No Name"}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-semibold text-emerald-400">
                        ₹{(user.totalBalance || 0).toLocaleString("en-IN")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm text-gray-400">
                        {user.transactionCount || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleViewUser(user.id)}
                          className="p-2 hover:bg-purple-500/10 rounded-lg text-gray-400 hover:text-purple-400 transition-colors"
                          title="View Details"
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
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-16">
            <Users className="w-12 h-12 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500">
              {searchQuery ? "No users match your search" : "No users found"}
            </p>
          </div>
        )}
      </div>

      {/* User Detail Modal */}
      <AnimatePresence>
        {(selectedUser || detailLoading) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => !detailLoading && setSelectedUser(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {detailLoading ? (
                <div className="flex items-center justify-center p-16">
                  <Loader className="w-8 h-8 text-purple-400 animate-spin" />
                </div>
              ) : selectedUser ? (
                <>
                  {/* Header */}
                  <div className="sticky top-0 bg-slate-900/95 backdrop-blur-xl p-6 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center">
                        <span className="text-xl font-bold text-white">
                          {(selectedUser.displayName || selectedUser.email || "?")[0]?.toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white">
                          {selectedUser.displayName || "Unknown"}
                        </h2>
                        <p className="text-sm text-gray-500">
                          ID: {selectedUser.id?.slice(0, 12)}...
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedUser(null)}
                      className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* User Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-white/5 rounded-xl p-4 border border-white/5 flex items-center space-x-3">
                        <Mail className="w-5 h-5 text-purple-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-gray-500">Email</p>
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
                          <p className="text-xs text-gray-500">Joined</p>
                          <p className="text-sm text-white">
                            {formatDate(selectedUser.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="bg-white/5 rounded-xl p-4 border border-white/5 flex items-center space-x-3">
                        <Wallet className="w-5 h-5 text-emerald-400 shrink-0" />
                        <div>
                          <p className="text-xs text-gray-500">Currency</p>
                          <p className="text-sm text-white">
                            {selectedUser.currency || "INR"} ({selectedUser.currencySymbol || "₹"})
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Accounts */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center space-x-2">
                        <Wallet className="w-4 h-4" />
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
                              ₹{(acc.balance || 0).toLocaleString("en-IN")}
                            </p>
                          </div>
                        ))}
                        {(!selectedUser.accounts || selectedUser.accounts.length === 0) && (
                          <p className="text-sm text-gray-600 text-center py-4">No accounts</p>
                        )}
                      </div>
                    </div>

                    {/* Recent Transactions */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center space-x-2">
                        <ArrowUpDown className="w-4 h-4" />
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
                                    : "bg-blue-500/20"
                                }`}
                              >
                                <ArrowUpDown
                                  className={`w-4 h-4 ${
                                    tx.type === "income"
                                      ? "text-emerald-400"
                                      : tx.type === "expense"
                                      ? "text-red-400"
                                      : "text-blue-400"
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
                                  : "text-blue-400"
                              }`}
                            >
                              {tx.type === "income" ? "+" : tx.type === "expense" ? "-" : ""}
                              ₹{(tx.amount || 0).toLocaleString("en-IN")}
                            </p>
                          </div>
                        ))}
                        {(!selectedUser.transactions || selectedUser.transactions.length === 0) && (
                          <p className="text-sm text-gray-600 text-center py-4">No transactions</p>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              ) : null}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
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
                and all associated data (accounts, transactions, trash).
              </p>

              <p className="text-xs text-gray-500 mb-2">
                Type <span className="font-mono text-red-400">DELETE</span> to confirm:
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
