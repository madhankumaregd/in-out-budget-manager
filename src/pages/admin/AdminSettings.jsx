import { useState, useEffect } from "react";
import {
  getAdminSettings,
  updateAdminSettings,
  changeAdminPassword,
  deleteAllUsers,
  getDatabaseStats,
} from "../../firebase/adminService";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings, Lock, Eye, EyeOff, AlertTriangle, Loader,
  Save, Shield, Database, Trash2, RefreshCw, Info,
  CheckCircle, XCircle, ToggleLeft, ToggleRight,
} from "lucide-react";
import toast from "react-hot-toast";

const AdminSettings = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
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
    // Strength check
    const hasUpper = /[A-Z]/.test(newPass);
    const hasLower = /[a-z]/.test(newPass);
    const hasNumber = /[0-9]/.test(newPass);
    const hasSpecial = /[^A-Za-z0-9]/.test(newPass);
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
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Settings</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Application configuration & security
        </p>
      </div>

      {/* App Settings Section */}
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

      {/* Password Change Section */}
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
            <h2 className="text-lg font-semibold text-white">Change Password</h2>
            <p className="text-xs text-gray-500">Update your account credentials</p>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-5">
          {/* Current Password */}
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

          {/* New Password */}
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
            {/* Strength meter */}
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
            {/* Requirements */}
            <div className="mt-3 space-y-1">
              {[
                { check: newPass.length >= 8, text: "At least 8 characters" },
                { check: /[A-Z]/.test(newPass), text: "Uppercase letter" },
                { check: /[a-z]/.test(newPass), text: "Lowercase letter" },
                { check: /[0-9]/.test(newPass), text: "Number" },
                { check: /[^A-Za-z0-9]/.test(newPass), text: "Special character (recommended)" },
              ].map((req, i) => (
                <div key={i} className="flex items-center space-x-2">
                  {req.check ? (
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-gray-600" />
                  )}
                  <span className={`text-xs ${req.check ? "text-emerald-400" : "text-gray-600"}`}>
                    {req.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-white focus:outline-none transition-all ${
                confirmPass && confirmPass !== newPass
                  ? "border-red-500/50 focus:ring-red-500/20"
                  : confirmPass && confirmPass === newPass
                  ? "border-emerald-500/50 focus:ring-emerald-500/20"
                  : "border-white/10 focus:border-cyan-500/50 focus:ring-cyan-500/20"
              } focus:ring-2`}
              required
            />
            {confirmPass && confirmPass !== newPass && (
              <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
            )}
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

      {/* Danger Zone */}
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
    </div>
  );
};

export default AdminSettings;
