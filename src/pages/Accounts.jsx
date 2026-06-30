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
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";
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
  ShieldCheck,
} from "lucide-react";
import toast from "react-hot-toast";
import ConfirmModal from "../components/ConfirmModal";

const Accounts = () => {
  const { currentUser, userProfile, setUserProfile, currencySymbol, logout } = useAuth();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingAccount, setEditingAccount] = useState(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [pendingDeleteAccountId, setPendingDeleteAccountId] = useState(null);
  const [profileForm, setProfileForm] = useState({
    displayName: "",
    email: "",
    phone: "",
    currency: "INR",
  });

  useEffect(() => {
    if (!currentUser) return;

    let isMounted = true;

    const fetchData = async () => {
      try {
        const [accountsData, transactionsData, profileData] = await Promise.all(
          [
            getUserAccounts(currentUser.uid),
            getUserTransactions(currentUser.uid),
            getUserProfile(currentUser.uid),
          ],
        );

        if (isMounted) {
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
        }
      } catch (err) {
        console.error("Error loading data:", err);
        toast.error("Failed to load data");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  const handleUpdateAccount = async (accountId, updates) => {
    try {
      await updateAccount(currentUser.uid, accountId, updates);
      const accountsData = await getUserAccounts(currentUser.uid);
      setAccounts(accountsData);
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
      const accountsData = await getUserAccounts(currentUser.uid);
      setAccounts(accountsData);
      toast.success("Account deleted successfully!");
    } catch (err) {
      console.error("Error deleting account:", err);
      toast.error("Failed to delete account");
    } finally {
      setPendingDeleteAccountId(null);
    }
  };

  const requestDeleteAccount = (accountId) => {
    const account = accounts.find((a) => a.id === accountId);
    if (account.balance !== 0) {
      toast.error("Cannot delete account with non-zero balance");
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

  const getAccountTransactions = (accountId) => {
    return transactions.filter(
      (t) => t.fromAccountId === accountId || t.toAccountId === accountId,
    );
  };

  const getBalanceHistory = (accountId, currentBalance) => {
    const accountTransactions = getAccountTransactions(accountId);
    let balance = currentBalance;
    const history = [{ date: new Date(), balance }];

    const sortedTransactions = [...accountTransactions].sort(
      (a, b) => new Date(a.date) - new Date(b.date),
    );
    sortedTransactions.forEach((t) => {
      if (t.fromAccountId === accountId) balance += t.amount;
      if (t.toAccountId === accountId) balance -= t.amount;
      history.push({ date: t.date, balance });
    });

    return history.slice(-30);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Profile Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg p-6 mb-8"
        >
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                Profile Settings
              </h1>
              <p className="text-gray-600 mt-1">
                Manage your personal information
              </p>
            </div>
            {!isEditingProfile && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsEditingProfile(true)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-indigo-700 transition"
              >
                <Edit2 className="w-4 h-4" />
                <span>Edit Profile</span>
              </motion.button>
            )}
          </div>

          {isEditingProfile ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={profileForm.displayName}
                    onChange={(e) =>
                      setProfileForm({
                        ...profileForm,
                        displayName: e.target.value,
                      })
                    }
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={profileForm.email}
                    disabled
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone (Must include country code, e.g. +91)
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    value={profileForm.phone}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, phone: e.target.value })
                    }
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="+919876543210"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Currency
                </label>
                <select
                  value={profileForm.currency}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, currency: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="INR">Indian Rupee (₹)</option>
                  <option value="USD">US Dollar ($)</option>
                  <option value="EUR">Euro (€)</option>
                  <option value="GBP">British Pound (£)</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleUpdateProfile}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg flex items-center space-x-2 hover:bg-green-700 transition"
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
                  className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg flex items-center space-x-2 hover:bg-gray-200 transition"
                >
                  <X className="w-4 h-4" />
                  <span>Cancel</span>
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                <User className="w-5 h-5 text-indigo-600" />
                <div>
                  <p className="text-sm text-gray-500">Full Name</p>
                  <p className="font-medium text-gray-800">
                    {userProfile?.displayName || "Not set"}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                <Mail className="w-5 h-5 text-indigo-600" />
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium text-gray-800">
                    {userProfile?.email || currentUser?.email}
                  </p>
                </div>
              </div>
              {userProfile?.phone && (
                <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                  <Phone className="w-5 h-5 text-indigo-600" />
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="font-medium text-gray-800">
                      {userProfile.phone}
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                <CreditCard className="w-5 h-5 text-indigo-600" />
                <div>
                  <p className="text-sm text-gray-500">Currency</p>
                  <p className="font-medium text-gray-800">
                    {userProfile?.currency || "INR"} ({currencySymbol})
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Accounts Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            Your Accounts
          </h2>
          <div className="grid grid-cols-1 gap-6">
            <AnimatePresence>
              {accounts.map((account) => {
                const Icon = getAccountIcon(account.type);
                return (
                  <motion.div
                    key={account.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="bg-white rounded-2xl shadow-lg overflow-hidden"
                  >
                    {editingAccount === account.id ? (
                      <div className="p-6">
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Account Name
                            </label>
                            <input
                              type="text"
                              defaultValue={account.name}
                              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                              id={`name-${account.id}`}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Balance
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              defaultValue={account.balance}
                              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                              id={`balance-${account.id}`}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Account Type
                            </label>
                            <select
                              defaultValue={account.type}
                              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                              id={`type-${account.id}`}
                            >
                              <option value="bank">Bank Account</option>
                              <option value="savings">Savings Account</option>
                              <option value="credit_card">Credit Card</option>
                              <option value="other">Other</option>
                            </select>
                          </div>
                          <div className="flex gap-3 pt-4">
                            <button
                              onClick={() => {
                                const name = document.getElementById(
                                  `name-${account.id}`,
                                ).value;
                                const balance = parseFloat(
                                  document.getElementById(
                                    `balance-${account.id}`,
                                  ).value,
                                );
                                const type = document.getElementById(
                                  `type-${account.id}`,
                                ).value;
                                handleUpdateAccount(account.id, {
                                  name,
                                  balance,
                                  type,
                                });
                              }}
                              className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-green-700"
                            >
                              <Save className="w-4 h-4" />
                              <span>Save</span>
                            </button>
                            <button
                              onClick={() => setEditingAccount(null)}
                              className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-gray-400"
                            >
                              <X className="w-4 h-4" />
                              <span>Cancel</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="p-6 border-b border-gray-100">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl flex items-center justify-center">
                                <Icon className="w-6 h-6 text-indigo-600" />
                              </div>
                              <div>
                                <h3 className="text-xl font-bold text-gray-800">
                                  {account.name}
                                </h3>
                                <p className="text-gray-500 capitalize">
                                  {account.type.replace("_", " ")}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                                {currencySymbol}{account.balance?.toLocaleString("en-IN")}
                              </p>
                              <div className="flex gap-2 mt-2">
                                <button
                                  onClick={() => setEditingAccount(account.id)}
                                  className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() =>
                                    requestDeleteAccount(account.id)
                                  }
                                  className="text-red-600 hover:text-red-800 text-sm font-medium"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Balance History Chart */}
                          <div className="mt-6">
                            <h4 className="font-semibold text-gray-700 mb-3">
                              Balance Trend
                            </h4>
                            <ResponsiveContainer width="100%" height={200}>
                              <LineChart
                                data={getBalanceHistory(
                                  account.id,
                                  account.balance,
                                )}
                              >
                                <XAxis
                                  dataKey="date"
                                  tickFormatter={(date) =>
                                    format(new Date(date), "MM/dd")
                                  }
                                />
                                <YAxis />
                                <Tooltip
                                  labelFormatter={(date) =>
                                    format(new Date(date), "MMM dd, yyyy")
                                  }
                                  formatter={(value) => [
                                    `${currencySymbol}${value.toLocaleString("en-IN")}`,
                                    "Balance",
                                  ]}
                                />
                                <Line
                                  type="monotone"
                                  dataKey="balance"
                                  stroke="#8B5CF6"
                                  strokeWidth={2}
                                  dot={false}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>

                          {/* Recent Transactions */}
                          <div className="mt-6">
                            <h4 className="font-semibold text-gray-700 mb-3">
                              Recent Transactions
                            </h4>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                              {getAccountTransactions(account.id)
                                .slice(0, 5)
                                .map((t) => (
                                  <div
                                    key={t.id}
                                    className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                                  >
                                    <div>
                                      <p className="text-sm font-medium text-gray-800">
                                        {t.description || t.category}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        {format(
                                          new Date(t.date),
                                          "MMM dd, yyyy",
                                        )}
                                      </p>
                                    </div>
                                    <p
                                      className={`text-sm font-semibold ${t.fromAccountId === account.id ? "text-red-600" : "text-green-600"}`}
                                    >
                                      {t.fromAccountId === account.id
                                        ? "-"
                                        : "+"}{" "}
                                      {currencySymbol}{t.amount.toLocaleString("en-IN")}
                                    </p>
                                  </div>
                                ))}
                              {getAccountTransactions(account.id).length ===
                                0 && (
                                <p className="text-center text-gray-500 py-4">
                                  No transactions yet
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {accounts.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white rounded-2xl shadow-lg p-12 text-center"
            >
              <Wallet className="w-20 h-20 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">
                No accounts yet. Create your first account from the Dashboard!
              </p>
            </motion.div>
          )}
        </motion.div>

        {/* Logout Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-10 flex justify-center"
        >
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={async () => {
              await logout();
              navigate("/login");
            }}
            className="flex items-center gap-3 bg-red-50 text-red-600 border border-red-200 px-8 py-3 rounded-xl font-semibold hover:bg-red-100 transition-all shadow-sm"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </motion.button>
        </motion.div>
      </div>

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
