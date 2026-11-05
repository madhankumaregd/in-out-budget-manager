import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  getAdminSettings,
  updateAdminSettings,
  changeAdminPassword,
  deleteAllUsers,
} from "../../firebase/adminService";
import { useAdmin } from "../../contexts/AdminContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings,
  Lock,
  Eye,
  EyeOff,
  AlertTriangle,
  Loader,
  Save,
  Shield,
  Trash2,
  RefreshCw,
  Info,
  CheckCircle,
  XCircle,
  ToggleLeft,
  ToggleRight,
  UserPlus,
  UserCheck,
  UserX,
  Crown,
  ArrowRightLeft,
  X,
  Mail,
  Check,
} from "lucide-react";
import toast from "react-hot-toast";

const AdminSettings = () => {
  const navigate = useNavigate();
  const {
    adminEmail,
    primaryAdmin,
    adminEmails,
    isPrimaryAdmin,
    addNewAdmin,
    removeAdmin,
    transferAdmin,
    refreshAdmins,
  } = useAdmin();

  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Admin access management states
  const [newAdminInput, setNewAdminInput] = useState("");
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [transferTarget, setTransferTarget] = useState("");
  const [showTransferConfirm, setShowTransferConfirm] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [revokingEmail, setRevokingEmail] = useState(null);

  // Version & App settings
  const [appVersion, setAppVersion] = useState("");
  const [appName, setAppName] = useState("");
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  // Password change
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [changingPass, setChangingPass] = useState(false);

  // Danger zone
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [showDangerZone, setShowDangerZone] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const data = await getAdminSettings();
      setSettings(data);
      setAppVersion(data?.appVersion || "");
      setAppName(data?.appName || "");
      setMaintenanceMode(data?.maintenanceMode || false);
      if (refreshAdmins) await refreshAdmins();
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  // ─── Add a new administrator ───
  const handleAddNewAdmin = async (e) => {
    e.preventDefault();
    if (!newAdminInput.trim()) {
      toast.error("Please enter a valid email or user ID");
      return;
    }
    setAddingAdmin(true);
    try {
      await addNewAdmin(newAdminInput.trim());
      toast.success(`Admin access granted to "${newAdminInput.trim()}".`);
      setNewAdminInput("");
      await fetchSettings();
    } catch (err) {
      toast.error(err.message || "Failed to add administrator");
    } finally {
      setAddingAdmin(false);
    }
  };

  // ─── Revoke delegated admin access ───
  const handleRevokeAdmin = async (emailToRemove) => {
    setRevokingEmail(emailToRemove);
    try {
      await removeAdmin(emailToRemove);
      toast.success(`Admin access revoked for "${emailToRemove}".`);
      await fetchSettings();
    } catch (err) {
      toast.error(err.message || "Failed to remove administrator");
    } finally {
      setRevokingEmail(null);
    }
  };

  // ─── Transfer primary admin ownership and lose own power ───
  const handleTransferOwnership = async () => {
    if (!transferTarget.trim()) {
      toast.error("Please specify the recipient administrator email or ID");
      return;
    }
    setTransferring(true);
    try {
      await transferAdmin(transferTarget.trim());
      toast.success(
        `Admin power successfully transferred to "${transferTarget.trim()}". You have relinquished your admin privileges.`,
        { duration: 6000 }
      );
      setShowTransferConfirm(false);
      // Navigate out of admin console to user app
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.message || "Failed to transfer admin ownership");
      setTransferring(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await updateAdminSettings({
        appVersion,
        appName,
        maintenanceMode,
      });
      toast.success("Settings saved successfully!");
      await fetchSettings();
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPass.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (newPass !== confirmPass) {
      toast.error("Passwords do not match");
      return;
    }
    const hasUpper = /[A-Z]/.test(newPass);
    const hasLower = /[a-z]/.test(newPass);
    const hasNumber = /[0-9]/.test(newPass);
    if (!hasUpper || !hasLower || !hasNumber) {
      toast.error("Password must include uppercase, lowercase, and numbers");
      return;
    }

    setChangingPass(true);
    try {
      await changeAdminPassword(currentPass, newPass);
      toast.success("Password changed successfully!");
      setCurrentPass("");
      setNewPass("");
      setConfirmPass("");
    } catch (error) {
      toast.error(error.message || "Failed to change password");
    } finally {
      setChangingPass(false);
    }
  };

  const handleDeleteAll = async () => {
    setDeleting(true);
    try {
      await deleteAllUsers();
      toast.success("All user data has been deleted");
      setDeleteConfirmText("");
      setShowDangerZone(false);
    } catch (error) {
      toast.error("Failed to delete all data");
    } finally {
      setDeleting(false);
    }
  };

  const getPasswordStrength = (pass) => {
    if (!pass) return { score: 0, label: "", color: "" };
    let score = 0;
    if (pass.length >= 8) score++;
    if (pass.length >= 12) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[a-z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    if (score <= 2) return { score: 1, label: "Weak", color: "bg-red-500" };
    if (score <= 4) return { score: 2, label: "Medium", color: "bg-amber-500" };
    return { score: 3, label: "Strong", color: "bg-emerald-500" };
  };

  const strength = getPasswordStrength(newPass);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader className="w-10 h-10 text-purple-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 max-w-4xl">
      {/* ─── Header ─── */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Admin Settings & Delegation
        </h1>
        <p className="text-gray-400 mt-1 text-sm">
          Manage administrator roles, grant access to new IDs, transfer admin ownership, and configure application settings
        </p>
      </div>

      {/* ─── 1. ADMIN ACCESS & DELEGATION (KEY USER REQUIREMENT) ─── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-white/[0.05] to-purple-500/[0.03] backdrop-blur-xl border border-purple-500/20 rounded-3xl p-6 sm:p-7 shadow-xl"
      >
        <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-white/5">
          <div className="w-11 h-11 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 rounded-2xl flex items-center justify-center border border-purple-500/30 shadow-inner">
            <Shield className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">
              Administrator Access & Role Delegation
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Control authorized administrator IDs and ownership rights
            </p>
          </div>
        </div>

        {/* Current Admin Status Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
            <div className="flex items-center space-x-2 text-xs font-semibold text-purple-300 mb-1">
              <Crown className="w-4 h-4 text-amber-400" />
              <span>PRIMARY ADMINISTRATOR</span>
            </div>
            <p className="text-sm font-bold text-white font-mono break-all">
              {primaryAdmin || "egdmadhankumar@gmail.com"}
            </p>
            <p className="text-[11px] text-gray-500 mt-1">
              Holds master administrative authority
            </p>
          </div>

          <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
            <div className="flex items-center space-x-2 text-xs font-semibold text-gray-400 mb-1">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <span>CURRENT LOGGED-IN SESSION</span>
            </div>
            <p className="text-sm font-bold text-white font-mono break-all">
              {adminEmail || "egdmadhankumar@gmail.com"}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                isPrimaryAdmin
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
              }`}>
                {isPrimaryAdmin ? "Primary Owner" : "Delegated Administrator"}
              </span>
            </div>
          </div>
        </div>

        {/* List of Authorized Admins */}
        <div className="mb-6">
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
            Authorized Administrator IDs ({adminEmails?.length || 1})
          </label>
          <div className="space-y-2">
            {adminEmails?.map((email) => {
              const isEmailPrimary = email.toLowerCase() === (primaryAdmin || "").toLowerCase();
              return (
                <div
                  key={email}
                  className="flex items-center justify-between p-3.5 bg-white/5 border border-white/5 rounded-xl hover:bg-white/[0.07] transition"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isEmailPrimary
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          : "bg-purple-500/20 text-purple-400"
                      }`}
                    >
                      {isEmailPrimary ? (
                        <Crown className="w-4 h-4" />
                      ) : (
                        <Shield className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate font-mono">
                        {email}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        {isEmailPrimary
                          ? "Primary Owner (Full control)"
                          : "Delegated Admin"}
                      </p>
                    </div>
                  </div>

                  {!isEmailPrimary && (
                    <button
                      onClick={() => handleRevokeAdmin(email)}
                      disabled={revokingEmail === email}
                      className="px-2.5 py-1 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition border border-red-500/20 disabled:opacity-50"
                      title="Revoke admin access"
                    >
                      {revokingEmail === email ? "Revoking..." : "Revoke Access"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Feature 1: Add a New Admin ── */}
        <div className="p-4 bg-white/5 rounded-2xl border border-white/5 mb-6">
          <h3 className="text-sm font-bold text-white mb-1 flex items-center space-x-2">
            <UserPlus className="w-4 h-4 text-purple-400" />
            <span>Add a New Admin</span>
          </h3>
          <p className="text-xs text-gray-400 mb-3">
            Grant administrative privileges to another user email address or Firebase User ID
          </p>

          <form onSubmit={handleAddNewAdmin} className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={newAdminInput}
                onChange={(e) => setNewAdminInput(e.target.value)}
                placeholder="Enter email (e.g. colleague@gmail.com) or User ID..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-white placeholder:text-gray-500 text-sm focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
                required
              />
            </div>
            <button
              type="submit"
              disabled={addingAdmin || !newAdminInput.trim()}
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-semibold transition shadow-md shadow-purple-600/30 disabled:opacity-50 flex items-center justify-center space-x-2 shrink-0"
            >
              {addingAdmin ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Grant Admin Access</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* ── Feature 2: Switch Admin to Other ID & Lose Admin Power (Transfer Ownership) ── */}
        <div className="p-5 bg-amber-500/[0.04] rounded-2xl border border-amber-500/20">
          <div className="flex items-start space-x-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-300">
                Switch Admin to Other ID & Relinquish Power
              </h3>
              <p className="text-xs text-amber-400/80 mt-1">
                Transfer primary admin ownership to another email or user ID.
                <strong className="text-amber-200"> You will immediately lose your own administrator privileges </strong>
                and will be signed out of this admin portal.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 mt-4">
            <input
              type="text"
              value={transferTarget}
              onChange={(e) => setTransferTarget(e.target.value)}
              placeholder="Enter recipient admin email or User ID..."
              className="flex-1 px-4 py-2.5 bg-slate-900 border border-amber-500/30 rounded-xl text-white placeholder:text-gray-500 text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20"
            />
            <button
              type="button"
              onClick={() => {
                if (!transferTarget.trim()) {
                  toast.error("Please enter the email/ID of the new admin");
                  return;
                }
                setShowTransferConfirm(true);
              }}
              disabled={!transferTarget.trim()}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white rounded-xl text-sm font-semibold transition shadow-md shadow-amber-600/20 disabled:opacity-50 flex items-center justify-center space-x-2 shrink-0"
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>Switch Admin & Relinquish</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* ─── 2. Application Settings ─── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/[0.03] backdrop-blur-xl border border-white/5 rounded-2xl p-6"
      >
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
            <Settings className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Application Settings</h2>
            <p className="text-xs text-gray-500">Version control & app configuration</p>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              App Name
            </label>
            <input
              type="text"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Version
            </label>
            <input
              type="text"
              value={appVersion}
              onChange={(e) => setAppVersion(e.target.value)}
              placeholder="e.g. 1.0.0"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
            />
          </div>
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
            <div className="flex items-center space-x-3">
              <Info className="w-5 h-5 text-amber-400" />
              <div>
                <p className="text-sm font-medium text-white">Maintenance Mode</p>
                <p className="text-xs text-gray-500">
                  Disable user access temporarily
                </p>
              </div>
            </div>
            <button
              onClick={() => setMaintenanceMode(!maintenanceMode)}
              className="transition-transform hover:scale-105"
            >
              {maintenanceMode ? (
                <ToggleRight className="w-10 h-10 text-amber-400" />
              ) : (
                <ToggleLeft className="w-10 h-10 text-gray-600" />
              )}
            </button>
          </div>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={handleSaveSettings}
            disabled={saving}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-indigo-500 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {saving ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>Save Settings</span>
              </>
            )}
          </motion.button>
        </div>
      </motion.div>

      {/* ─── 3. Password Change Section ─── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white/[0.03] backdrop-blur-xl border border-white/5 rounded-2xl p-6"
      >
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-cyan-500/20 rounded-xl flex items-center justify-center">
            <Lock className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Change Admin Password</h2>
            <p className="text-xs text-gray-500">Update your account credentials</p>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Current Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type={showCurrentPass ? "text" : "password"}
                value={currentPass}
                onChange={(e) => setCurrentPass(e.target.value)}
                className="w-full pl-11 pr-11 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrentPass(!showCurrentPass)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              New Password
            </label>
            <div className="relative">
              <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type={showNewPass ? "text" : "password"}
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                className="w-full pl-11 pr-11 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowNewPass(!showNewPass)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {newPass && (
              <div className="mt-2">
                <div className="flex space-x-1 mb-1">
                  {[1, 2, 3].map((level) => (
                    <div
                      key={level}
                      className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                        strength.score >= level ? strength.color : "bg-white/10"
                      }`}
                    />
                  ))}
                </div>
                <p className={`text-xs ${
                  strength.score === 1 ? "text-red-400" :
                  strength.score === 2 ? "text-amber-400" : "text-emerald-400"
                }`}>
                  {strength.label}
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
              required
            />
          </div>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            type="submit"
            disabled={changingPass || !currentPass || !newPass || newPass !== confirmPass}
            className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-xl hover:from-cyan-500 hover:to-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {changingPass ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Lock className="w-5 h-5" />
                <span>Update Password</span>
              </>
            )}
          </motion.button>
        </form>
      </motion.div>

      {/* ─── 4. Danger Zone ─── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-red-500/[0.03] backdrop-blur-xl border border-red-500/10 rounded-2xl p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-red-300">Danger Zone</h2>
              <p className="text-xs text-red-400/60">Destructive actions — proceed with extreme caution</p>
            </div>
          </div>
          <button
            onClick={() => setShowDangerZone(!showDangerZone)}
            className="text-xs text-red-400/60 hover:text-red-400 transition-colors border border-red-500/20 px-3 py-1.5 rounded-lg hover:bg-red-500/10"
          >
            {showDangerZone ? "Hide" : "Show"}
          </button>
        </div>

        <AnimatePresence>
          {showDangerZone && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-4 border-t border-red-500/10 space-y-4">
                <div className="bg-red-500/5 rounded-xl p-4 border border-red-500/10">
                  <h3 className="text-sm font-semibold text-red-300 mb-2 flex items-center space-x-2">
                    <Trash2 className="w-4 h-4" />
                    <span>Delete All Users & Data</span>
                  </h3>
                  <p className="text-xs text-red-400/60 mb-4">
                    This will permanently delete ALL users, accounts, transactions,
                    and trash items. This action cannot be undone.
                  </p>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="Type DELETE ALL to confirm"
                    className="w-full px-4 py-2.5 bg-red-500/5 border border-red-500/20 rounded-xl text-white placeholder:text-red-400/30 focus:outline-none focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20 transition-all mb-3 font-mono text-sm"
                  />
                  <button
                    onClick={handleDeleteAll}
                    disabled={deleteConfirmText !== "DELETE ALL" || deleting}
                    className="w-full py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed text-sm font-semibold flex items-center justify-center space-x-2"
                  >
                    {deleting ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        <span>Delete Everything</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ─── Transfer Admin Ownership Confirmation Modal ─── */}
      <AnimatePresence>
        {showTransferConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowTransferConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-slate-900 border border-amber-500/30 rounded-3xl w-full max-w-md p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-amber-500/20 rounded-2xl flex items-center justify-center text-amber-400">
                  <ArrowRightLeft className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Transfer Admin Ownership?</h3>
                  <p className="text-xs text-amber-400 font-semibold">Irreversible Administrative Action</p>
                </div>
              </div>

              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl mb-4 text-xs text-amber-200 leading-relaxed space-y-2">
                <p>
                  You are about to transfer Primary Admin power to:
                </p>
                <p className="font-mono text-sm font-bold text-white bg-black/40 px-3 py-1.5 rounded-lg border border-white/10 break-all">
                  {transferTarget}
                </p>
                <p className="text-amber-300 font-semibold">
                  ⚠️ WARNING: Your current administrator account ({adminEmail}) will lose all admin permissions immediately and you will be signed out.
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowTransferConfirm(false)}
                  disabled={transferring}
                  className="flex-1 py-2.5 bg-white/5 border border-white/10 rounded-xl text-gray-300 hover:bg-white/10 transition text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleTransferOwnership}
                  disabled={transferring}
                  className="flex-1 py-2.5 bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white rounded-xl text-sm font-bold transition shadow-lg shadow-rose-600/30 flex items-center justify-center space-x-2"
                >
                  {transferring ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>Confirm & Relinquish</span>
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

export default AdminSettings;
