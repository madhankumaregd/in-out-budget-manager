import { useState, useEffect } from "react";
import {
  getAllTrashItems,
  restoreFromTrash,
  permanentDeleteTrashItem,
  emptyAllTrash,
} from "../../firebase/adminService";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trash2, RotateCcw, X, Search, AlertTriangle, Loader,
  Clock, User, Wallet, ArrowUpDown, RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";

const AdminTrash = () => {
  const [trashItems, setTrashItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [emptyConfirm, setEmptyConfirm] = useState(false);
  const [emptying, setEmptying] = useState(false);

  useEffect(() => {
    fetchTrash();
  }, []);

  const fetchTrash = async () => {
    setLoading(true);
    try {
      const items = await getAllTrashItems();
      setTrashItems(items);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (item) => {
    try {
      await restoreFromTrash(item.userId, item.id);
      toast.success("Item restored successfully!");
      await fetchTrash();
    } catch (error) {
      toast.error("Failed to restore item");
    }
  };

  const handlePermanentDelete = async (item) => {
    try {
      await permanentDeleteTrashItem(item.userId, item.id);
      toast.success("Item permanently deleted");
      await fetchTrash();
    } catch (error) {
      toast.error("Failed to delete item");
    }
  };

  const handleEmptyAll = async () => {
    setEmptying(true);
    try {
      await emptyAllTrash();
      toast.success("All trash emptied");
      setEmptyConfirm(false);
      await fetchTrash();
    } catch (error) {
      toast.error("Failed to empty trash");
    } finally {
      setEmptying(false);
    }
  };

  const filteredItems = trashItems.filter((item) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      item.userName?.toLowerCase().includes(q) ||
      item.data?.name?.toLowerCase().includes(q) ||
      item.data?.category?.toLowerCase().includes(q) ||
      item.itemType?.toLowerCase().includes(q);

    if (filter === "all") return matchesSearch;
    return matchesSearch && item.itemType === filter;
  });

  const getTimeRemaining = (expiresAt) => {
    const now = new Date();
    const diff = expiresAt - now;
    if (diff <= 0) return "Expired";
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days > 0) return `${days}d remaining`;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours > 0) return `${hours}h remaining`;
    return "< 1h remaining";
  };

  const getItemIcon = (itemType) => {
    switch (itemType) {
      case "account":
        return Wallet;
      case "transaction":
        return ArrowUpDown;
      default:
        return Trash2;
    }
  };

  const getItemTitle = (item) => {
    if (item.itemType === "account") return item.data?.name || "Unnamed Account";
    if (item.itemType === "transaction") {
      return `${item.data?.type || "Transaction"} - ${item.data?.category || "N/A"}`;
    }
    return "Unknown Item";
  };

  const getItemSubtitle = (item) => {
    if (item.itemType === "account") {
      return `${item.data?.type || ""} • ₹${(item.data?.balance || 0).toLocaleString("en-IN")}`;
    }
    if (item.itemType === "transaction") {
      return `₹${(item.data?.amount || 0).toLocaleString("en-IN")}`;
    }
    return "";
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
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Trash Bin</h1>
          <p className="text-gray-500 mt-1 text-sm">
            {trashItems.length} item{trashItems.length !== 1 ? "s" : ""} in trash
            — auto-deleted after 30 days
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={fetchTrash}
            className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
          </motion.button>
          {trashItems.length > 0 && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setEmptyConfirm(true)}
              className="flex items-center space-x-2 px-4 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 hover:bg-red-500/20 transition-all text-sm"
            >
              <Trash2 className="w-4 h-4" />
              <span>Empty All</span>
            </motion.button>
          )}
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search trash items..."
            className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
          />
        </div>
        <div className="flex space-x-2">
          {["all", "account", "transaction"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                filter === f
                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/20"
                  : "bg-white/5 text-gray-400 border border-white/5 hover:bg-white/10"
              }`}
            >
              {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1) + "s"}
            </button>
          ))}
        </div>
      </div>

      {/* Trash Items */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {filteredItems.map((item, index) => {
            const ItemIcon = getItemIcon(item.itemType);
            const timeRemaining = getTimeRemaining(item.expiresAt);
            const isExpiring = item.expiresAt - new Date() < 3 * 24 * 60 * 60 * 1000;

            return (
              <motion.div
                key={item.id + item.userId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ delay: index * 0.03 }}
                className="bg-white/[0.03] backdrop-blur-xl border border-white/5 rounded-2xl p-4 sm:p-5 hover:bg-white/[0.05] transition-all group"
              >
                <div className="flex items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start sm:items-center space-x-4 flex-1 min-w-0">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                        item.itemType === "account"
                          ? "bg-blue-500/20"
                          : "bg-amber-500/20"
                      }`}
                    >
                      <ItemIcon
                        className={`w-5 h-5 ${
                          item.itemType === "account"
                            ? "text-blue-400"
                            : "text-amber-400"
                        }`}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white truncate">
                        {getItemTitle(item)}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {getItemSubtitle(item)}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                        <span className="flex items-center space-x-1 text-xs text-gray-600">
                          <User className="w-3 h-3" />
                          <span>{item.userName}</span>
                        </span>
                        <span className="flex items-center space-x-1 text-xs text-gray-600">
                          <Clock className="w-3 h-3" />
                          <span>
                            Deleted{" "}
                            {item.deletedAt?.toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                            })}
                          </span>
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            isExpiring
                              ? "bg-red-500/10 text-red-400"
                              : "bg-gray-500/10 text-gray-500"
                          }`}
                        >
                          {timeRemaining}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleRestore(item)}
                      className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                      title="Restore"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handlePermanentDelete(item)}
                      className="p-2.5 bg-red-500/10 rounded-xl text-red-400 hover:bg-red-500/20 transition-colors"
                      title="Delete Permanently"
                    >
                      <X className="w-4 h-4" />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filteredItems.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="w-20 h-20 mx-auto mb-4 bg-white/5 rounded-2xl flex items-center justify-center">
              <Trash2 className="w-10 h-10 text-gray-700" />
            </div>
            <h3 className="text-lg font-semibold text-gray-400 mb-1">
              Trash is Empty
            </h3>
            <p className="text-sm text-gray-600">
              {searchQuery
                ? "No items match your search"
                : "Deleted items will appear here"}
            </p>
          </motion.div>
        )}
      </div>

      {/* Empty All Confirmation */}
      <AnimatePresence>
        {emptyConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setEmptyConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-red-500/20 rounded-2xl w-full max-w-sm p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Empty Trash</h3>
                  <p className="text-sm text-gray-500">
                    {trashItems.length} items will be permanently deleted
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-400 mb-6">
                This will permanently delete all items in trash across all users.
                This action cannot be undone.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setEmptyConfirm(false)}
                  className="flex-1 py-2.5 bg-white/5 border border-white/10 rounded-xl text-gray-300 hover:bg-white/10 transition-all text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEmptyAll}
                  disabled={emptying}
                  className="flex-1 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-500 transition-all disabled:opacity-50 text-sm font-semibold flex items-center justify-center space-x-2"
                >
                  {emptying ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Empty All</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminTrash;
