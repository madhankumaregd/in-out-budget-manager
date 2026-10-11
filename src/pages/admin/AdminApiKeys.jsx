import { useState, useEffect } from "react";
import {
  createApiKey,
  getAllApiKeys,
  toggleApiKey,
  deleteApiKey,
  revokeAllApiKeys,
} from "../../firebase/adminService";
import { motion, AnimatePresence } from "framer-motion";
import {
  Key, Plus, Copy, Trash2, Power, PowerOff, Loader,
  RefreshCw, AlertTriangle, Shield, Clock, Check,
  Eye, EyeOff, Zap, Globe, X,
} from "lucide-react";
import toast from "react-hot-toast";

const AdminApiKeys = () => {
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRevokeAll, setShowRevokeAll] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyDesc, setNewKeyDesc] = useState("");
  const [newKeyPerms, setNewKeyPerms] = useState(["read"]);
  const [newKeyRate, setNewKeyRate] = useState(100);
  const [creating, setCreating] = useState(false);
  const [createdKey, setCreatedKey] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [visibleKeys, setVisibleKeys] = useState({});
  const [showDocs, setShowDocs] = useState(false);

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    setLoading(true);
    try {
      const keys = await getAllApiKeys();
      setApiKeys(keys);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newKeyName.trim()) {
      toast.error("Key name is required");
      return;
    }
    setCreating(true);
    try {
      const result = await createApiKey({
        name: newKeyName,
        description: newKeyDesc,
        permissions: newKeyPerms,
        rateLimit: newKeyRate,
      });
      setCreatedKey(result.key);
      toast.success("API key created!");
      await fetchKeys();
    } catch (error) {
      toast.error("Failed to create API key");
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (keyId, currentState) => {
    try {
      await toggleApiKey(keyId, !currentState);
      toast.success(
        currentState ? "Key deactivated" : "Key activated"
      );
      await fetchKeys();
    } catch (error) {
      toast.error("Failed to toggle key");
    }
  };

  const handleDelete = async (keyId) => {
    try {
      await deleteApiKey(keyId);
      toast.success("API key deleted");
      await fetchKeys();
    } catch (error) {
      toast.error("Failed to delete key");
    }
  };

  const handleRevokeAll = async () => {
    try {
      await revokeAllApiKeys();
      toast.success("All keys revoked");
      setShowRevokeAll(false);
      await fetchKeys();
    } catch (error) {
      toast.error("Failed to revoke keys");
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleKeyVisibility = (id) => {
    setVisibleKeys((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const maskKey = (key) => {
    if (!key) return "";
    return key.slice(0, 8) + "•".repeat(20) + key.slice(-4);
  };

  const resetCreateForm = () => {
    setShowCreateModal(false);
    setCreatedKey(null);
    setNewKeyName("");
    setNewKeyDesc("");
    setNewKeyPerms(["read"]);
    setNewKeyRate(100);
  };

  const availablePerms = [
    { key: "read", label: "Read", desc: "Read transactions & accounts", icon: Eye },
    { key: "write", label: "Write", desc: "Create transactions", icon: Zap },
    { key: "delete", label: "Delete", desc: "Delete records", icon: Trash2 },
    { key: "admin", label: "Admin", desc: "Full access", icon: Shield },
  ];

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
          <h1 className="text-2xl sm:text-3xl font-bold text-white">API Keys</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Manage API access for AI integrations & external apps
          </p>
        </div>
        <div className="flex items-center space-x-3 self-start">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowDocs(!showDocs)}
            className="flex items-center space-x-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition-all text-sm"
          >
            <Globe className="w-4 h-4" />
            <span>API Docs</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-500 hover:to-indigo-500 transition-all text-sm font-semibold"
          >
            <Plus className="w-4 h-4" />
            <span>Generate Key</span>
          </motion.button>
        </div>
      </div>

      {/* API Documentation Panel */}
      <AnimatePresence>
        {showDocs && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/5 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
                  <Globe className="w-5 h-5 text-cyan-400" />
                  <span>API Documentation</span>
                </h3>
                <button
                  onClick={() => setShowDocs(false)}
                  className="p-1.5 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-slate-950/50 rounded-xl p-4 border border-white/5">
                  <p className="text-xs text-gray-400 mb-2 font-semibold">BASE URL</p>
                  <code className="text-sm text-cyan-400 font-mono">
                    https://in-out-budget-manager.web.app/api/v1
                  </code>
                </div>

                <div className="bg-slate-950/50 rounded-xl p-4 border border-white/5">
                  <p className="text-xs text-gray-400 mb-2 font-semibold">AUTHENTICATION</p>
                  <p className="text-sm text-gray-300 mb-2">
                    Pass your API key in the <code className="text-purple-400 bg-purple-400/10 px-1.5 py-0.5 rounded">Authorization</code> header:
                  </p>
                  <pre className="text-sm text-gray-300 font-mono bg-black/30 rounded-lg p-3 overflow-x-auto">
{`Authorization: Bearer iom_xxxx_xxxx_xxxx_xxxx`}
                  </pre>
                </div>

                <div className="bg-slate-950/50 rounded-xl p-4 border border-white/5">
                  <p className="text-xs text-gray-400 mb-3 font-semibold">ENDPOINTS</p>
                  <div className="space-y-3">
                    {[
                      { method: "GET", path: "/users/:id/transactions", desc: "List transactions" },
                      { method: "POST", path: "/users/:id/transactions", desc: "Create transaction" },
                      { method: "GET", path: "/users/:id/accounts", desc: "List accounts" },
                      { method: "POST", path: "/users/:id/accounts", desc: "Create account" },
                      { method: "GET", path: "/analytics", desc: "Global analytics" },
                      { method: "DELETE", path: "/users/:id/transactions/:txId", desc: "Delete transaction" },
                    ].map((ep, i) => (
                      <div key={i} className="flex items-center space-x-3">
                        <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                          ep.method === "GET" ? "bg-emerald-500/20 text-emerald-400" :
                          ep.method === "POST" ? "bg-blue-500/20 text-blue-400" :
                          "bg-red-500/20 text-red-400"
                        }`}>{ep.method}</span>
                        <code className="text-sm text-gray-300 font-mono">{ep.path}</code>
                        <span className="text-xs text-gray-600">— {ep.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-950/50 rounded-xl p-4 border border-white/5">
                  <p className="text-xs text-gray-400 mb-2 font-semibold">EXAMPLE: CREATE TRANSACTION VIA AI</p>
                  <pre className="text-sm text-gray-300 font-mono bg-black/30 rounded-lg p-3 overflow-x-auto">
{`curl -X POST \\
  https://in-out-budget-manager.web.app/api/v1/users/{uid}/transactions \\
  -H "Authorization: Bearer iom_xxxx_xxxx_xxxx_xxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "type": "expense",
    "amount": 500,
    "category": "Food",
    "fromAccountId": "account_id",
    "date": "2024-01-15",
    "description": "Lunch at restaurant"
  }'`}
                  </pre>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Revoke All */}
      {apiKeys.filter((k) => k.isActive).length > 0 && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowRevokeAll(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 hover:bg-amber-500/20 transition-all text-sm"
        >
          <PowerOff className="w-4 h-4" />
          <span>Revoke All Active Keys</span>
        </motion.button>
      )}

      {/* API Keys List */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {apiKeys.map((apiKey, index) => (
            <motion.div
              key={apiKey.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`bg-white/[0.03] backdrop-blur-xl border rounded-2xl p-5 hover:bg-white/[0.05] transition-all ${
                apiKey.isActive
                  ? "border-white/5"
                  : "border-red-500/10 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start space-x-4 flex-1 min-w-0">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                      apiKey.isActive
                        ? "bg-purple-500/20"
                        : "bg-gray-500/20"
                    }`}
                  >
                    <Key
                      className={`w-5 h-5 ${
                        apiKey.isActive
                          ? "text-purple-400"
                          : "text-gray-500"
                      }`}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <p className="text-sm font-semibold text-white">
                        {apiKey.name}
                      </p>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          apiKey.isActive
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {apiKey.isActive ? "Active" : "Revoked"}
                      </span>
                    </div>
                    {apiKey.description && (
                      <p className="text-xs text-gray-500 mb-2">
                        {apiKey.description}
                      </p>
                    )}

                    {/* Key value */}
                    <div className="flex items-center space-x-2 mb-2">
                      <code className="text-xs font-mono text-gray-400 bg-black/20 px-3 py-1.5 rounded-lg flex-1 truncate">
                        {visibleKeys[apiKey.id]
                          ? apiKey.key
                          : maskKey(apiKey.key)}
                      </code>
                      <button
                        onClick={() => toggleKeyVisibility(apiKey.id)}
                        className="p-1.5 hover:bg-white/5 rounded-lg text-gray-500 hover:text-gray-300 transition-colors"
                      >
                        {visibleKeys[apiKey.id] ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        onClick={() => copyToClipboard(apiKey.key, apiKey.id)}
                        className="p-1.5 hover:bg-white/5 rounded-lg text-gray-500 hover:text-gray-300 transition-colors"
                      >
                        {copiedId === apiKey.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    {/* Metadata */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span className="flex items-center space-x-1 text-xs text-gray-600">
                        <Clock className="w-3 h-3" />
                        <span>
                          Created{" "}
                          {apiKey.createdAt?.toLocaleDateString("en-IN")}
                        </span>
                      </span>
                      <span className="flex items-center space-x-1 text-xs text-gray-600">
                        <Zap className="w-3 h-3" />
                        <span>{apiKey.rateLimit || 100} req/hr</span>
                      </span>
                      <span className="flex items-center space-x-1 text-xs text-gray-600">
                        <Shield className="w-3 h-3" />
                        <span>
                          {(apiKey.permissions || ["read"]).join(", ")}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-1 shrink-0">
                  <button
                    onClick={() => handleToggle(apiKey.id, apiKey.isActive)}
                    className={`p-2 rounded-lg transition-colors ${
                      apiKey.isActive
                        ? "hover:bg-amber-500/10 text-gray-400 hover:text-amber-400"
                        : "hover:bg-emerald-500/10 text-gray-400 hover:text-emerald-400"
                    }`}
                    title={apiKey.isActive ? "Deactivate" : "Activate"}
                  >
                    {apiKey.isActive ? (
                      <PowerOff className="w-4 h-4" />
                    ) : (
                      <Power className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(apiKey.id)}
                    className="p-2 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {apiKeys.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="w-20 h-20 mx-auto mb-4 bg-white/5 rounded-2xl flex items-center justify-center">
              <Key className="w-10 h-10 text-gray-700" />
            </div>
            <h3 className="text-lg font-semibold text-gray-400 mb-1">
              No API Keys
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Generate an API key to connect external apps & AI services
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-sm font-semibold"
            >
              <Plus className="w-4 h-4" />
              <span>Generate Your First Key</span>
            </motion.button>
          </motion.div>
        )}
      </div>

      {/* Create Key Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => !createdKey && resetCreateForm()}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {createdKey ? (
                /* Key created success */
                <div className="p-6 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-emerald-500/20 rounded-2xl flex items-center justify-center">
                    <Check className="w-8 h-8 text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    API Key Created!
                  </h3>
                  <p className="text-sm text-gray-400 mb-6">
                    Copy this key now — you won't see the full key again.
                  </p>
                  <div className="flex items-center space-x-2 mb-6">
                    <code className="flex-1 text-sm font-mono text-emerald-400 bg-emerald-500/10 px-4 py-3 rounded-xl border border-emerald-500/20 text-left break-all">
                      {createdKey}
                    </code>
                    <button
                      onClick={() => copyToClipboard(createdKey, "new")}
                      className="p-3 bg-white/5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                    >
                      {copiedId === "new" ? (
                        <Check className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <Copy className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  <button
                    onClick={resetCreateForm}
                    className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-gray-300 hover:bg-white/10 transition-all"
                  >
                    Done
                  </button>
                </div>
              ) : (
                /* Create form */
                <>
                  <div className="p-6 border-b border-white/5">
                    <h3 className="text-lg font-bold text-white">
                      Generate New API Key
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Configure access permissions for the new key
                    </p>
                  </div>
                  <div className="p-6 space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Key Name *
                      </label>
                      <input
                        type="text"
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                        placeholder="e.g. ChatGPT Integration"
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Description
                      </label>
                      <input
                        type="text"
                        value={newKeyDesc}
                        onChange={(e) => setNewKeyDesc(e.target.value)}
                        placeholder="What will this key be used for?"
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Permissions
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {availablePerms.map((perm) => {
                          const PermIcon = perm.icon;
                          const isSelected = newKeyPerms.includes(perm.key);
                          return (
                            <button
                              key={perm.key}
                              onClick={() => {
                                setNewKeyPerms((prev) =>
                                  isSelected
                                    ? prev.filter((p) => p !== perm.key)
                                    : [...prev, perm.key]
                                );
                              }}
                              className={`flex items-center space-x-2 p-3 rounded-xl border text-left text-sm transition-all ${
                                isSelected
                                  ? "bg-purple-500/10 border-purple-500/20 text-purple-300"
                                  : "bg-white/5 border-white/5 text-gray-400 hover:bg-white/10"
                              }`}
                            >
                              <PermIcon className="w-4 h-4 shrink-0" />
                              <div>
                                <p className="font-medium">{perm.label}</p>
                                <p className="text-[10px] opacity-60">{perm.desc}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Rate Limit (requests/hour)
                      </label>
                      <input
                        type="number"
                        value={newKeyRate}
                        onChange={(e) => setNewKeyRate(Number(e.target.value))}
                        min={1}
                        max={10000}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
                      />
                    </div>
                  </div>
                  <div className="p-6 border-t border-white/5 flex space-x-3">
                    <button
                      onClick={resetCreateForm}
                      className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl text-gray-300 hover:bg-white/10 transition-all text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreate}
                      disabled={creating || !newKeyName.trim()}
                      className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-500 hover:to-indigo-500 transition-all disabled:opacity-50 text-sm font-semibold flex items-center justify-center space-x-2"
                    >
                      {creating ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Key className="w-4 h-4" />
                          <span>Generate</span>
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Revoke All Confirmation */}
      <AnimatePresence>
        {showRevokeAll && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowRevokeAll(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-amber-500/20 rounded-2xl w-full max-w-sm p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Revoke All Keys</h3>
                  <p className="text-sm text-gray-500">
                    All active keys will be deactivated
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-400 mb-6">
                All external integrations and AI connections will stop working
                immediately. You can re-activate keys individually afterwards.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowRevokeAll(false)}
                  className="flex-1 py-2.5 bg-white/5 border border-white/10 rounded-xl text-gray-300 hover:bg-white/10 transition-all text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRevokeAll}
                  className="flex-1 py-2.5 bg-amber-600 text-white rounded-xl hover:bg-amber-500 transition-all text-sm font-semibold"
                >
                  Revoke All
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminApiKeys;
