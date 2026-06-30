import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  getUserAccounts,
  createAccount,
  getUserTransactions,
  createTransaction,
} from "../firebase/firestoreService";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { subDays } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Wallet,
  ArrowUpCircle,
  ArrowDownCircle,
  RefreshCw,
  Loader
} from "lucide-react";
import AddAccountModal from "../components/AddAccountModal";
import AddTransactionModal from "../components/AddTransactionModal";
import TransferModal from "../components/TransferModal";
import DashboardDetailModal from "../components/DashboardDetailModal";
import toast from 'react-hot-toast';

const Dashboard = () => {
  const { currentUser, userProfile, currencySymbol } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showAddIncome, setShowAddIncome] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [detailMode, setDetailMode] = useState(null);

  useEffect(() => {
    if (!currentUser) return;
    
    let isMounted = true;
    
    const fetchData = async () => {
      if (!isMounted) return;
      setLoading(true);
      
      try {
        const [accountsData, transactionsData] = await Promise.all([
          getUserAccounts(currentUser.uid),
          getUserTransactions(currentUser.uid),
        ]);
        
        if (isMounted) {
          setAccounts(accountsData || []);
          setTransactions(transactionsData || []);
        }
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("Failed to load data");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    fetchData();
    
    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  const handleAddAccount = async (accountData) => {
    if (!currentUser) return;
    
    try {
      await createAccount(currentUser.uid, accountData);
      const [accountsData, transactionsData] = await Promise.all([
        getUserAccounts(currentUser.uid),
        getUserTransactions(currentUser.uid),
      ]);
      setAccounts(accountsData || []);
      setTransactions(transactionsData || []);
      toast.success("Account created successfully!");
    } catch (error) {
      console.error("Error adding account:", error);
      toast.error("Failed to create account");
    }
  };

  const handleAddTransaction = async (transactionData) => {
    if (!currentUser) return;
    
    try {
      await createTransaction(currentUser.uid, transactionData);
      const [accountsData, transactionsData] = await Promise.all([
        getUserAccounts(currentUser.uid),
        getUserTransactions(currentUser.uid),
      ]);
      setAccounts(accountsData || []);
      setTransactions(transactionsData || []);
      toast.success("Transaction added successfully!");
    } catch (error) {
      console.error("Error adding transaction:", error);
      toast.error("Failed to add transaction");
    }
  };

  const totalBalance = accounts.reduce(
    (sum, acc) => sum + (acc.balance || 0),
    0,
  );

  const last30Days = subDays(new Date(), 30);
  const recentTransactions = transactions.filter((t) => {
    if (!t.date) return false;
    return new Date(t.date) >= last30Days;
  });

  const totalIncome = recentTransactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const totalExpense = recentTransactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const monthlyData = [];
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  
  months.forEach((month, index) => {
    const monthTransactions = transactions.filter((t) => {
      if (!t.date) return false;
      return new Date(t.date).getMonth() === index;
    });
    const income = monthTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    const expense = monthTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    if (income > 0 || expense > 0) {
      monthlyData.push({ month, income, expense });
    }
  });

  const categoryData = transactions
    .filter((t) => t.type === "expense" && t.category)
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + (t.amount || 0);
      return acc;
    }, {});

  const pieData = Object.entries(categoryData).map(([name, value]) => ({
    name,
    value,
  }));
  
  const COLORS = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD"];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="w-12 h-12 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 md:mb-8"
        >
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
            Welcome back, <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              {userProfile?.displayName || 'User'}!
            </span>
          </h1>
          <p className="text-gray-600 mt-1">Here's your financial overview</p>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setDetailMode("accounts")}
            className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-5 md:p-6 text-white cursor-pointer hover:shadow-xl transition-shadow"
          >
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <Wallet className="w-6 h-6 md:w-8 md:h-8 opacity-80" />
              <span className="text-xs md:text-sm opacity-80">Total Balance</span>
            </div>
            <p className="text-2xl md:text-3xl font-bold">{currencySymbol}{totalBalance.toLocaleString('en-IN')}</p>
            <p className="text-xs md:text-sm opacity-80 mt-1 md:mt-2">Across {accounts.length} accounts</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setDetailMode("income")}
            className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg p-5 md:p-6 text-white cursor-pointer hover:shadow-xl transition-shadow"
          >
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <TrendingUp className="w-6 h-6 md:w-8 md:h-8 opacity-80" />
              <span className="text-xs md:text-sm opacity-80">Income (30d)</span>
            </div>
            <p className="text-2xl md:text-3xl font-bold">+{currencySymbol}{totalIncome.toLocaleString('en-IN')}</p>
            <p className="text-xs md:text-sm opacity-80 mt-1 md:mt-2">From {recentTransactions.filter(t => t.type === 'income').length} transactions</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setDetailMode("expense")}
            className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl shadow-lg p-5 md:p-6 text-white cursor-pointer hover:shadow-xl transition-shadow"
          >
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <TrendingDown className="w-6 h-6 md:w-8 md:h-8 opacity-80" />
              <span className="text-xs md:text-sm opacity-80">Expense (30d)</span>
            </div>
            <p className="text-2xl md:text-3xl font-bold">-{currencySymbol}{totalExpense.toLocaleString('en-IN')}</p>
            <p className="text-xs md:text-sm opacity-80 mt-1 md:mt-2">From {recentTransactions.filter(t => t.type === 'expense').length} transactions</p>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-3 gap-3 md:gap-4 mb-8"
        >
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowAddIncome(true)}
            className="bg-white rounded-xl shadow-md p-3 md:p-4 flex flex-col md:flex-row items-center justify-center space-y-1 md:space-y-0 md:space-x-2 hover:shadow-lg transition-all"
          >
            <ArrowUpCircle className="w-6 h-6 text-green-600" />
            <span className="text-xs md:text-base font-semibold text-gray-700">Income</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowAddExpense(true)}
            className="bg-white rounded-xl shadow-md p-3 md:p-4 flex flex-col md:flex-row items-center justify-center space-y-1 md:space-y-0 md:space-x-2 hover:shadow-lg transition-all"
          >
            <ArrowDownCircle className="w-6 h-6 text-red-600" />
            <span className="text-xs md:text-base font-semibold text-gray-700">Expense</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowTransfer(true)}
            className="bg-white rounded-xl shadow-md p-3 md:p-4 flex flex-col md:flex-row items-center justify-center space-y-1 md:space-y-0 md:space-x-2 hover:shadow-lg transition-all"
          >
            <RefreshCw className="w-6 h-6 text-blue-600" />
            <span className="text-xs md:text-base font-semibold text-gray-700">Transfer</span>
          </motion.button>
        </motion.div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Monthly Chart */}
          {monthlyData.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className="bg-white rounded-2xl shadow-lg p-6"
            >
              <h2 className="text-xl font-bold text-gray-800 mb-4">Monthly Summary</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => `${currencySymbol}${value.toLocaleString('en-IN')}`} />
                  <Legend />
                  <Bar dataKey="income" fill="#10B981" radius={[10, 10, 0, 0]} />
                  <Bar dataKey="expense" fill="#EF4444" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          )}

          {/* Category Spending */}
          {pieData.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 }}
              className="bg-white rounded-2xl shadow-lg p-6"
            >
              <h2 className="text-xl font-bold text-gray-800 mb-4">Spending by Category</h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${currencySymbol}${value.toLocaleString('en-IN')}`} />
                </PieChart>
              </ResponsiveContainer>
            </motion.div>
          )}
        </div>

        {/* Accounts Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white rounded-2xl shadow-lg p-6"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800">Your Accounts</h2>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowAddAccount(true)}
              className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:shadow-lg transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Account</span>
            </motion.button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {accounts.map((account, index) => (
                <motion.div
                  key={account.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -5 }}
                  className="border border-gray-200 rounded-xl p-4 hover:shadow-xl transition-all duration-300"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-lg text-gray-800">{account.name}</h3>
                      <p className="text-sm text-gray-500 capitalize">{account.type}</p>
                    </div>
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center">
                      <Wallet className="w-5 h-5 text-indigo-600" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    {currencySymbol}{account.balance?.toLocaleString('en-IN') || '0'}
                  </p>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {accounts.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <Wallet className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No accounts yet. Create your first account!</p>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Modals */}
      {showAddAccount && (
        <AddAccountModal
          onClose={() => setShowAddAccount(false)}
          onSave={handleAddAccount}
        />
      )}
      {showAddIncome && (
        <AddTransactionModal
          type="income"
          accounts={accounts}
          onClose={() => setShowAddIncome(false)}
          onSave={handleAddTransaction}
        />
      )}
      {showAddExpense && (
        <AddTransactionModal
          type="expense"
          accounts={accounts}
          onClose={() => setShowAddExpense(false)}
          onSave={handleAddTransaction}
        />
      )}
      {showTransfer && (
        <TransferModal
          accounts={accounts}
          onClose={() => setShowTransfer(false)}
          onSave={handleAddTransaction}
        />
      )}

      {/* Detail Modal */}
      <DashboardDetailModal
        isOpen={!!detailMode}
        onClose={() => setDetailMode(null)}
        mode={detailMode}
        transactions={transactions}
        accounts={accounts}
      />
    </div>
  );
};

export default Dashboard;