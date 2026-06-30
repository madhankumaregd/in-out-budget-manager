import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  getUserTransactions,
  getUserAccounts,
  deleteTransaction,
} from "../firebase/firestoreService";
import { format } from "date-fns";
import { Trash2, Search, Filter, X, ArrowUpRight, ArrowDownRight, RefreshCw, Calendar, Clock, ChevronDown, ChevronUp } from "lucide-react";
import toast from "react-hot-toast";
import ConfirmModal from "../components/ConfirmModal";

const Transactions = () => {
  const { currentUser, currencySymbol } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ type: "all", accountId: "" });
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const fetchData = async () => {
    if (!currentUser) return;
    try {
      const [transactionsData, accountsData] = await Promise.all([
        getUserTransactions(currentUser.uid),
        getUserAccounts(currentUser.uid),
      ]);
      setTransactions(transactionsData);
      setAccounts(accountsData);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load transactions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    let isMounted = true;
    setLoading(true);

    const load = async () => {
      try {
        const [transactionsData, accountsData] = await Promise.all([
          getUserTransactions(currentUser.uid),
          getUserAccounts(currentUser.uid),
        ]);
        if (isMounted) {
          setTransactions(transactionsData);
          setAccounts(accountsData);
        }
      } catch (error) {
        console.error("Error loading data:", error);
        if (isMounted) toast.error("Failed to load transactions");
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  const getAccountName = (accountId) => {
    const account = accounts.find((acc) => acc.id === accountId);
    return account ? account.name : "N/A";
  };

  const handleDelete = async () => {
    if (!pendingDeleteId) return;
    try {
      await deleteTransaction(currentUser.uid, pendingDeleteId);
      toast.success("Transaction deleted and balance restored.");
      setPendingDeleteId(null);
      // Refresh
      const [transactionsData, accountsData] = await Promise.all([
        getUserTransactions(currentUser.uid),
        getUserAccounts(currentUser.uid),
      ]);
      setTransactions(transactionsData);
      setAccounts(accountsData);
    } catch (err) {
      console.error("Error deleting transaction:", err);
      toast.error(err.message || "Failed to delete transaction");
      setPendingDeleteId(null);
    }
  };

  const clearFilters = () => {
    setFilter({ type: "all", accountId: "" });
    setDateRange({ start: "", end: "" });
    setSearchQuery("");
  };

  const hasActiveFilters =
    filter.type !== "all" ||
    filter.accountId !== "" ||
    dateRange.start !== "" ||
    dateRange.end !== "" ||
    searchQuery !== "";

  const filteredTransactions = transactions.filter((t) => {
    let match = true;
    if (filter.type !== "all" && t.type !== filter.type) match = false;
    if (
      filter.accountId &&
      t.fromAccountId !== filter.accountId &&
      t.toAccountId !== filter.accountId
    )
      match = false;
    if (dateRange.start && new Date(t.date) < new Date(dateRange.start))
      match = false;
    if (dateRange.end && new Date(t.date) > new Date(dateRange.end))
      match = false;
    if (
      searchQuery &&
      !(t.description || "").toLowerCase().includes(searchQuery.toLowerCase())
    )
      match = false;
    return match;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              Transaction History
            </h1>
            <p className="text-gray-500 mt-1">
              {filteredTransactions.length} of {transactions.length} transactions
            </p>
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-white border rounded-lg hover:bg-gray-50 transition"
            >
              <X className="w-4 h-4" />
              Clear filters
            </button>
          )}
        </div>

        {/* Search and Filters Section */}
        <div className="bg-white rounded-xl shadow mb-6">
          <div className="p-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            {/* Search */}
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search transactions by description..."
                className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            
            {/* Filter Toggle Button */}
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition whitespace-nowrap"
            >
              <Filter className="w-4 h-4" />
              Filters
              {isFilterOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {/* Expandable Filters Panel */}
          {isFilterOpen && (
            <div className="p-4 border-t border-gray-100 bg-gray-50/50 rounded-b-xl">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Type filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Transaction Type
                  </label>
                  <select
                    value={filter.type}
                    onChange={(e) => setFilter({ ...filter, type: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">All Types</option>
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                    <option value="transfer">Transfer</option>
                  </select>
                </div>

                {/* Account filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Account
                  </label>
                  <select
                    value={filter.accountId}
                    onChange={(e) =>
                      setFilter({ ...filter, accountId: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">All Accounts</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Start date */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) =>
                      setDateRange({ ...dateRange, start: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* End date */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) =>
                      setDateRange({ ...dateRange, end: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          {/* Desktop Table View */}
          <div className="overflow-x-auto hidden md:block">
            <table className="min-w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  From
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  To
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTransactions.map((t) => (
                <tr
                  key={t.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-5 py-4 whitespace-nowrap">
                    <p className="text-sm text-gray-900">
                      {format(new Date(t.date), "MMM dd, yyyy")}
                    </p>
                    <p className="text-xs text-gray-400">
                      {t.createdAt?.toDate
                        ? format(t.createdAt.toDate(), "hh:mm a")
                        : t.date
                        ? format(new Date(t.date), "hh:mm a")
                        : "—"}
                    </p>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span
                      className={`px-2.5 py-1 text-xs rounded-full font-medium ${
                        t.type === "income"
                          ? "bg-green-100 text-green-800"
                          : t.type === "expense"
                          ? "bg-red-100 text-red-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {t.type.charAt(0).toUpperCase() + t.type.slice(1)}
                    </span>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-700">
                    {t.category || "—"}
                  </td>
                  <td
                    className={`px-5 py-4 whitespace-nowrap text-sm font-semibold ${
                      t.type === "income"
                        ? "text-green-600"
                        : t.type === "expense"
                        ? "text-red-600"
                        : "text-blue-600"
                    }`}
                  >
                    {t.type === "income" ? "+" : t.type === "expense" ? "−" : ""}
                    {currencySymbol}
                    {t.amount.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-700">
                    {getAccountName(t.fromAccountId)}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-700">
                    {t.toAccountId ? getAccountName(t.toAccountId) : "—"}
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600 max-w-xs truncate">
                    {t.description || "—"}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-center">
                    <button
                      onClick={() => setPendingDeleteId(t.id)}
                      title="Delete transaction"
                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-gray-100">
            {filteredTransactions.map((t) => (
              <div key={t.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${
                      t.type === "income" ? "bg-green-100 text-green-600" :
                      t.type === "expense" ? "bg-red-100 text-red-600" :
                      "bg-blue-100 text-blue-600"
                    }`}>
                      {t.type === "income" ? <ArrowUpRight className="w-5 h-5" /> : 
                       t.type === "expense" ? <ArrowDownRight className="w-5 h-5" /> : 
                       <RefreshCw className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{t.category || "Transfer"}</p>
                      <p className="text-xs text-gray-500 line-clamp-1">{t.description || (t.type === 'transfer' ? `To ${getAccountName(t.toAccountId)}` : "No description")}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${
                      t.type === "income" ? "text-green-600" :
                      t.type === "expense" ? "text-red-600" :
                      "text-blue-600"
                    }`}>
                      {t.type === "income" ? "+" : t.type === "expense" ? "−" : ""}
                      {currencySymbol}
                      {t.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-gray-400 font-medium">{getAccountName(t.fromAccountId)}</p>
                  </div>
                </div>
                
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-50">
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {format(new Date(t.date), "MMM dd, yyyy")}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {t.createdAt?.toDate ? format(t.createdAt.toDate(), "hh:mm a") : t.date ? format(new Date(t.date), "hh:mm a") : "—"}
                    </div>
                  </div>
                  <button
                    onClick={() => setPendingDeleteId(t.id)}
                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filteredTransactions.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <Search className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No transactions found</p>
              {hasActiveFilters && (
                <p className="text-sm mt-1">
                  Try adjusting your filters or{" "}
                  <button
                    onClick={clearFilters}
                    className="text-indigo-600 underline"
                  >
                    clear all
                  </button>
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Custom delete confirmation modal */}
      <ConfirmModal
        isOpen={!!pendingDeleteId}
        onCancel={() => setPendingDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Transaction?"
        message="This will permanently delete the transaction and restore the affected account balance(s). This action cannot be undone."
        confirmLabel="Yes, Delete"
      />
    </div>
  );
};

export default Transactions;
