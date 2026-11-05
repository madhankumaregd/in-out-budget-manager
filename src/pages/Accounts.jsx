import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  getUserAccounts,
  updateAccount,
  deleteAccount,
  getUserTransactions,
  getUserProfile,
  updateUserProfile,
} from "../firebase/firestoreService";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Mail,
  Edit2,
  Save,
  X,
  Wallet,
  CreditCard,
  Building,
  Phone,
  LogOut,
  ChevronRight,
  TrendingUp,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import ConfirmModal from "../components/ConfirmModal";
import AccountDetailModal from "../components/AccountDetailModal";

const Accounts = () => {
  const { currentUser, userProfile, setUserProfile, currencySymbol, logout } =
    useAuth();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingAccount, setEditingAccount] = useState(null);
  const [selectedDetailAccount, setSelectedDetailAccount] = useState(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [pendingDeleteAccountId, setPendingDeleteAccountId] = useState(null);
  const [profileForm, setProfileForm] = useState({
    displayName: "",
    email: "",
    phone: "",
    currency: "INR",
  });

  const fetchData = async () => {
    if (!currentUser) return;
    try {
      const [accountsData, transactionsData, profileData] = await Promise.all([
        getUserAccounts(currentUser.uid),
        getUserTransactions(currentUser.uid),
        getUserProfile(currentUser.uid),
      ]);
      setAccounts(accountsData);
      setTransactions(transactionsData);
      if (profileData) {
        setProfileForm({
          displayName: profileData.displayName || "",
          email: profileData.email || currentUser.email,
          phone: profileData.phone || "",
          currency: profileData.currency || "INR",
        });
      }
    } catch (err) {
      console.error("Error loading data:", err);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUser]);

  const handleUpdateAccount = async (accountId, updates) => {
    try {
      await updateAccount(currentUser.uid, accountId, updates);
      await fetchData();
      setEditingAccount(null);
      toast.success("Account updated successfully!");
    } catch (err) {
      console.error("Error updating account:", err);
      toast.error("Failed to update account");
    }
  };

  const handleDeleteAccount = async () => {
    const accountId = pendingDeleteAccountId;
    if (!accountId) return;
    try {
      await deleteAccount(currentUser.uid, accountId);
      await fetchData();
      toast.success("Account deleted successfully!");
    } catch (err) {
      console.error("Error deleting account:", err);
      toast.error(err.message || "Failed to delete account");
    } finally {
      setPendingDeleteAccountId(null);
    }
  };

  const requestDeleteAccount = (accountId) => {
    const account = accounts.find((a) => a.id === accountId);
    if (!account) return;
    if (account.balance !== 0) {
      toast.error(
        `Cannot delete "${account.name}". Account has a balance of ${currencySymbol}${account.balance.toFixed(2)}. Transfer or adjust funds to 0 first.`
      );
      return;
    }
    setPendingDeleteAccountId(accountId);
  };

  const handleUpdateProfile = async () => {
    try {
      if (profileForm.phone && !profileForm.phone.startsWith("+")) {
        toast.error("Phone must include country code (e.g. +91...)");
        return;
      }

      await updateUserProfile(currentUser.uid, profileForm);
      setUserProfile(profileForm);
      setIsEditingProfile(false);
      toast.success("Profile updated successfully!");
    } catch (err) {
      console.error("Error updating profile:", err);
      toast.error(err.message || "Failed to update profile");
    }
  };

  const getAccountIcon = (type) => {
    switch (type) {
      case "bank":
        return Building;
      case "credit_card":
        return CreditCard;
      default:
        return Wallet;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Account being currently edited
  const currentEditingAccountObj = accounts.find((a) => a.id === editingAccount);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-6 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Profile Settings Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6 mb-8"
        >
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
                Profile Settings
              </h1>
              <p className="text-gray-500 text-xs sm:text-sm mt-0.5">
                Manage your personal information and preferences
              </p>
            </div>
            {!isEditingProfile && (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setIsEditingProfile(true)}
                className="bg-indigo-600 text-white px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center space-x-2 hover:bg-indigo-700 transition shadow-xs"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </motion.button>
            )}
          </div>

          {isEditingProfile ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={profileForm.displayName}
                    onChange={(e) =>
                      setProfileForm({
                        ...profileForm,
                        displayName: e.target.value,
                      })
                    }
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={profileForm.email}
                    disabled
                    className="w-full pl-10 pr-4 py-2 bg-gray-100 border border-gray-200 rounded-xl text-sm text-gray-500 cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                  Phone
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="tel"
                    value={profileForm.phone}
                    onChange={(e) =>
                      setProfileForm({
                        ...profileForm,
                        phone: e.target.value,
                      })
                    }
                    placeholder="+91..."
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                  Currency
                </label>
                <select
                  value={profileForm.currency}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      currency: e.target.value,
                    })
                  }
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                >
                  <option value="INR">Indian Rupee (₹)</option>
                  <option value="USD">US Dollar ($)</option>
                  <option value="EUR">Euro (€)</option>
                  <option value="GBP">British Pound (£)</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2 md:col-span-2">
                <button
                  onClick={handleUpdateProfile}
                  className="bg-emerald-600 text-white px-5 py-2 rounded-xl text-sm font-semibold flex items-center space-x-2 hover:bg-emerald-700 transition shadow-xs"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </button>
                <button
                  onClick={() => {
                    setIsEditingProfile(false);
                    setProfileForm({
                      displayName: userProfile?.displayName || "",
                      email: userProfile?.email || currentUser.email,
                      phone: userProfile?.phone || "",
                      currency: userProfile?.currency || "INR",
                    });
                  }}
                  className="bg-gray-100 text-gray-700 px-5 py-2 rounded-xl text-sm font-semibold flex items-center space-x-2 hover:bg-gray-200 transition"
                >
                  <X className="w-4 h-4" />
                  <span>Cancel</span>
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl">
                <User className="w-4 h-4 text-indigo-600" />
                <div className="truncate">
                  <p className="text-[11px] text-gray-400 font-medium">Full Name</p>
                  <p className="text-sm font-semibold text-gray-800 truncate">
                    {userProfile?.displayName || "Not set"}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl">
                <Mail className="w-4 h-4 text-indigo-600" />
                <div className="truncate">
                  <p className="text-[11px] text-gray-400 font-medium">Email</p>
                  <p className="text-sm font-semibold text-gray-800 truncate">
                    {userProfile?.email || currentUser?.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl">
                <Phone className="w-4 h-4 text-indigo-600" />
                <div className="truncate">
                  <p className="text-[11px] text-gray-400 font-medium">Phone</p>
                  <p className="text-sm font-semibold text-gray-800 truncate">
                    {userProfile?.phone || "Not set"}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl">
                <CreditCard className="w-4 h-4 text-indigo-600" />
                <div className="truncate">
                  <p className="text-[11px] text-gray-400 font-medium">Currency</p>
                  <p className="text-sm font-semibold text-gray-800 truncate">
                    {userProfile?.currency || "INR"} ({currencySymbol})
                  </p>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* ─── Accounts Section ─── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
                Your Accounts
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Click any account to view balance trend graph and recent activity
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 font-semibold border border-indigo-100">
              {accounts.length} Account{accounts.length === 1 ? "" : "s"}
            </span>
          </div>

          {/* Accounts List */}
          <div className="grid grid-cols-1 gap-4">
            <AnimatePresence>
              {accounts.map((account) => {
                const Icon = getAccountIcon(account.type);
                return (
                  <motion.div
                    key={account.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-indigo-100 transition-all overflow-hidden"
                  >
                    {/* ── MOBILE VIEW: Just Account Value and Name Visible ── */}
                    {/* "in mobile view: just account value only has to visible in the account page
                        if the account is clicked then in the popup section has to display edit, delete option, graph and recent transactions" */}
                    <div
                      onClick={() => setSelectedDetailAccount(account)}
                      className="md:hidden p-4 flex items-center justify-between cursor-pointer active:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center space-x-3.5">
                        <div className="w-11 h-11 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl flex items-center justify-center shrink-0 border border-indigo-100">
                          <Icon className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-800 text-base">
                            {account.name}
                          </h3>
                          <p className="text-xs text-gray-400 capitalize">
                            {account.type?.replace("_", " ")}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {/* Just Account Value */}
                        <p className="text-xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                          {currencySymbol}
                          {account.balance?.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </p>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>

                    {/* ── DESKTOP VIEW: Account Card with View Details & Actions ── */}
                    {/* "in desktop view: recent transaction has to displaay on the popup when any account is clicked with the account value and graph on the pop up" */}
                    <div
                      onClick={() => setSelectedDetailAccount(account)}
                      className="hidden md:flex items-center justify-between p-5 cursor-pointer hover:bg-gray-50/50 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl flex items-center justify-center shrink-0 border border-indigo-100 shadow-xs">
                          <Icon className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-gray-800">
                              {account.name}
                            </h3>
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize font-medium">
                              {account.type?.replace("_", " ")}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">
                            Click to view balance graph and recent activity
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-6">
                        {/* Account Value */}
                        <div className="text-right">
                          <p className="text-2xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                            {currencySymbol}
                            {account.balance?.toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                            })}
                          </p>
                          <span className="text-xs text-gray-400 font-medium">
                            Current Balance
                          </span>
                        </div>

                        {/* Action buttons */}
                        <div
                          className="flex items-center gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => setSelectedDetailAccount(account)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition border border-indigo-100 shadow-xs"
                            title="View graph and transactions popup"
                          >
                            <TrendingUp className="w-3.5 h-3.5" />
                            <span>View Details</span>
                          </button>
                          <button
                            onClick={() => setEditingAccount(account.id)}
                            className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition"
                            title="Edit Account"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => requestDeleteAccount(account.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
                            title="Delete Account"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {accounts.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center"
            >
              <Wallet className="w-16 h-16 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-700 font-semibold text-base">
                No accounts found
              </p>
              <p className="text-gray-400 text-xs mt-1">
                Create your first account from the Dashboard to start tracking.
              </p>
            </motion.div>
          )}
        </motion.div>

        {/* Logout Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-12 flex justify-center"
        >
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={async () => {
              await logout();
              navigate("/login");
            }}
            className="flex items-center gap-2.5 bg-white text-red-600 border border-red-200 px-6 py-2.5 rounded-xl font-semibold hover:bg-red-50 transition shadow-xs text-sm"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout from Session</span>
          </motion.button>
        </motion.div>
      </div>

      {/* ─── Account Detail Popup Modal (Graph, Value, Recent Tx, Edit, Delete, Swipe Down to Close) ─── */}
      <AccountDetailModal
        account={selectedDetailAccount}
        isOpen={Boolean(selectedDetailAccount)}
        onClose={() => setSelectedDetailAccount(null)}
        transactions={transactions}
        currencySymbol={currencySymbol}
        onEdit={(accId) => setEditingAccount(accId)}
        onDelete={(accId) => requestDeleteAccount(accId)}
      />

      {/* ─── Edit Account Modal (with Swipe Down to close & X button) ─── */}
      {currentEditingAccountObj && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setEditingAccount(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => {
              e.currentTarget._touchStartY = e.touches[0].clientY;
            }}
            onTouchEnd={(e) => {
              if (!e.currentTarget._touchStartY) return;
              const delta = e.changedTouches[0].clientY - e.currentTarget._touchStartY;
              if (delta > 60) setEditingAccount(null);
            }}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100"
          >
            {/* Swipe Down handle */}
            <div className="w-full flex justify-center pb-2 cursor-grab">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
            </div>

            <div className="flex justify-between items-center pb-4 mb-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-800">
                Edit Account: {currentEditingAccountObj.name}
              </h3>
              <button
                onClick={() => setEditingAccount(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const name = e.target.accountName.value;
                const balance = parseFloat(e.target.accountBalance.value);
                const type = e.target.accountType.value;
                handleUpdateAccount(currentEditingAccountObj.id, {
                  name,
                  balance,
                  type,
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                  Account Name
                </label>
                <input
                  name="accountName"
                  type="text"
                  defaultValue={currentEditingAccountObj.name}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                  Balance ({currencySymbol})
                </label>
                <input
                  name="accountBalance"
                  type="number"
                  step="0.01"
                  defaultValue={currentEditingAccountObj.balance}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                  Account Type
                </label>
                <select
                  name="accountType"
                  defaultValue={currentEditingAccountObj.type}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                >
                  <option value="bank">Bank Account</option>
                  <option value="savings">Savings Account</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="flex gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingAccount(null)}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Account delete confirmation modal */}
      <ConfirmModal
        isOpen={!!pendingDeleteAccountId}
        onCancel={() => setPendingDeleteAccountId(null)}
        onConfirm={handleDeleteAccount}
        title="Delete Account?"
        message="This will permanently delete the account. Make sure the balance is zero before deleting."
        confirmLabel="Yes, Delete"
      />
    </div>
  );
};

export default Accounts;
