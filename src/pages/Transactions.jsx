import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  getUserTransactions,
  getUserAccounts,
  deleteTransaction,
  updateTransaction,
} from "../firebase/firestoreService";
import { format, subMonths, addMonths, isSameMonth } from "date-fns";
import {
  Trash2,
  Edit2,
  Search,
  Filter,
  X,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Layers,
} from "lucide-react";
import toast from "react-hot-toast";
import ConfirmModal from "../components/ConfirmModal";
import EditTransactionModal from "../components/EditTransactionModal";

const Transactions = () => {
  const { currentUser, currencySymbol } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filter, setFilter] = useState({ type: "all", accountId: "" });
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Month-by-month state (default to current month)
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  // Modal states
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [editingTransaction, setEditingTransaction] = useState(null);

  // Swipe navigation touch tracking
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const minSwipeDistance = 50;

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
      await fetchData();
    } catch (err) {
      console.error("Error deleting transaction:", err);
      toast.error(err.message || "Failed to delete transaction");
      setPendingDeleteId(null);
    }
  };

  const handleSaveEdit = async (updatedData) => {
    if (!editingTransaction) return;
    try {
      await updateTransaction(currentUser.uid, editingTransaction.id, updatedData);
      toast.success("Transaction updated successfully!");
      setEditingTransaction(null);
      await fetchData();
    } catch (err) {
      console.error("Error updating transaction:", err);
      toast.error(err.message || "Failed to update transaction");
    }
  };

  const clearFilters = () => {
    setFilter({ type: "all", accountId: "" });
    setDateRange({ start: "", end: "" });
    setSearchQuery("");
  };

  const clearDateRangeOnly = () => {
    setDateRange({ start: "", end: "" });
  };

  const handlePrevMonth = () => {
    setSelectedMonth((prev) => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setSelectedMonth((prev) => addMonths(prev, 1));
  };

  const handleToday = () => {
    setSelectedMonth(new Date());
  };

  // Touch swipe handling
  // User specification:
  // "if i swipe left then it has to go to previous month and i can go by click by arrow vice versa on right for future"
  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      handlePrevMonth();
    } else if (isRightSwipe) {
      handleNextMonth();
    }
  };

  const isCustomDateFilterActive = Boolean(dateRange.start || dateRange.end);

  const hasActiveFilters =
    filter.type !== "all" ||
    filter.accountId !== "" ||
    dateRange.start !== "" ||
    dateRange.end !== "" ||
    searchQuery !== "";

  // Filter transactions by type, account, search, and custom date range (if set)
  const baseFilteredTransactions = transactions.filter((t) => {
    let match = true;
    if (filter.type !== "all" && t.type !== filter.type) match = false;
    if (
      filter.accountId &&
      t.fromAccountId !== filter.accountId &&
      t.toAccountId !== filter.accountId
    )
      match = false;
    if (
      searchQuery &&
      !(t.description || "").toLowerCase().includes(searchQuery.toLowerCase()) &&
      !(t.category || "").toLowerCase().includes(searchQuery.toLowerCase())
    )
      match = false;

    if (dateRange.start) {
      const start = new Date(dateRange.start);
      start.setHours(0, 0, 0, 0);
      if (new Date(t.date) < start) match = false;
    }
    if (dateRange.end) {
      const end = new Date(dateRange.end);
      end.setHours(23, 59, 59, 999);
      if (new Date(t.date) > end) match = false;
    }
    return match;
  });

  // Calculate monthly stats for month navigation bar
  const getMonthStats = (txList) => {
    let income = 0;
    let expense = 0;
    txList.forEach((t) => {
      if (t.type === "income") income += t.amount;
      if (t.type === "expense") expense += t.amount;
    });
    return { income, expense, count: txList.length };
  };

  // When custom date filter is active: Group transactions by month
  const monthGroups = {};
  if (isCustomDateFilterActive) {
    baseFilteredTransactions.forEach((t) => {
      const d = new Date(t.date);
      const key = format(d, "yyyy-MM");
      const label = format(d, "MMMM yyyy");
      if (!monthGroups[key]) {
        monthGroups[key] = {
          key,
          label,
          date: d,
          transactions: [],
        };
      }
      monthGroups[key].transactions.push(t);
    });
  }

  const sortedMonthGroups = Object.values(monthGroups).sort((a, b) =>
    b.key.localeCompare(a.key)
  );

  // When default month view: Filter for the currently selected month
  const currentMonthTransactions = isCustomDateFilterActive
    ? []
    : baseFilteredTransactions.filter((t) =>
        isSameMonth(new Date(t.date), selectedMonth)
      );

  const currentMonthStats = getMonthStats(currentMonthTransactions);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  // Render Table Component for a list of transactions
  const renderTransactionsTable = (txList) => (
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
          {txList.map((t) => (
            <tr key={t.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-5 py-4 whitespace-nowrap">
                <p className="text-sm font-medium text-gray-900">
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
                <div className="flex items-center justify-center gap-1">
                  <button
                    onClick={() => setEditingTransaction(t)}
                    title="Edit transaction"
                    className="p-1.5 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPendingDeleteId(t.id)}
                    title="Delete transaction"
                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // Render Mobile Cards for a list of transactions
  const renderTransactionsMobile = (txList) => (
    <div className="md:hidden divide-y divide-gray-100">
      {txList.map((t) => (
        <div key={t.id} className="p-4 hover:bg-gray-50 transition-colors">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-xl ${
                  t.type === "income"
                    ? "bg-green-100 text-green-600"
                    : t.type === "expense"
                    ? "bg-red-100 text-red-600"
                    : "bg-blue-100 text-blue-600"
                }`}
              >
                {t.type === "income" ? (
                  <ArrowUpRight className="w-5 h-5" />
                ) : t.type === "expense" ? (
                  <ArrowDownRight className="w-5 h-5" />
                ) : (
                  <RefreshCw className="w-5 h-5" />
                )}
              </div>
              <div>
                <p className="font-semibold text-gray-800">
                  {t.category || "Transfer"}
                </p>
                <p className="text-xs text-gray-500 line-clamp-1">
                  {t.description ||
                    (t.type === "transfer"
                      ? `To ${getAccountName(t.toAccountId)}`
                      : "No description")}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p
                className={`font-bold ${
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
              </p>
              <p className="text-xs text-gray-400 font-medium">
                {getAccountName(t.fromAccountId)}
              </p>
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
                {t.createdAt?.toDate
                  ? format(t.createdAt.toDate(), "hh:mm a")
                  : t.date
                  ? format(new Date(t.date), "hh:mm a")
                  : "—"}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setEditingTransaction(t)}
                title="Edit transaction"
                className="p-1.5 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPendingDeleteId(t.id)}
                title="Delete transaction"
                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
              Transaction History
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {isCustomDateFilterActive
                ? `Showing ${baseFilteredTransactions.length} transaction${
                    baseFilteredTransactions.length === 1 ? "" : "s"
                  } across ${sortedMonthGroups.length} month${
                    sortedMonthGroups.length === 1 ? "" : "s"
                  }`
                : `${currentMonthTransactions.length} of ${transactions.length} total transactions`}
            </p>
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition shadow-xs"
            >
              <X className="w-4 h-4" />
              Clear all filters
            </button>
          )}
        </div>

        {/* Search and Filters Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
          <div className="p-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            {/* Search */}
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search transactions by description or category..."
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
              />
            </div>

            {/* Filter Toggle Button */}
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border transition whitespace-nowrap ${
                isFilterOpen || hasActiveFilters
                  ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                  : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-indigo-600" />
              )}
              {isFilterOpen ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Expandable Filters Panel */}
          {isFilterOpen && (
            <div className="p-4 border-t border-gray-100 bg-gray-50/70">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Type filter */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                    Transaction Type
                  </label>
                  <select
                    value={filter.type}
                    onChange={(e) =>
                      setFilter({ ...filter, type: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">All Types</option>
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                    <option value="transfer">Transfer</option>
                  </select>
                </div>

                {/* Account filter */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                    Account
                  </label>
                  <select
                    value={filter.accountId}
                    onChange={(e) =>
                      setFilter({ ...filter, accountId: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                    Start Date (From)
                  </label>
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) =>
                      setDateRange({ ...dateRange, start: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* End date */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                    End Date (To)
                  </label>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) =>
                      setDateRange({ ...dateRange, end: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {isCustomDateFilterActive && (
                <div className="mt-3 pt-3 border-t border-gray-200/60 flex items-center justify-between text-xs text-indigo-700">
                  <span>
                    ℹ️ Date filter active: Transactions will be grouped and
                    displayed on this page by month.
                  </span>
                  <button
                    onClick={clearDateRangeOnly}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline"
                  >
                    Clear date range
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─── CASE 1: CUSTOM DATE RANGE FILTER APPLIED ─── */}
        {/* Displays all transactions across matching months on the SAME page, with month name at the top of each month group */}
        {isCustomDateFilterActive ? (
          <div className="space-y-8">
            {/* Range info banner */}
            <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-indigo-50 border border-indigo-100 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800">
                    Custom Date Range Filter Active
                  </p>
                  <p className="text-xs text-gray-600">
                    Showing all matching transactions grouped by month (
                    {dateRange.start ? format(new Date(dateRange.start), "MMM dd, yyyy") : "Any"}
                    {" to "}
                    {dateRange.end ? format(new Date(dateRange.end), "MMM dd, yyyy") : "Any"}
                    )
                  </p>
                </div>
              </div>
              <button
                onClick={clearDateRangeOnly}
                className="px-3.5 py-1.5 text-xs font-semibold text-indigo-700 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50 transition shadow-xs"
              >
                Switch Back to Monthly Navigator
              </button>
            </div>

            {/* List of Month Groups */}
            {sortedMonthGroups.length > 0 ? (
              sortedMonthGroups.map((group) => {
                const groupStats = getMonthStats(group.transactions);
                return (
                  <div
                    key={group.key}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
                  >
                    {/* Month Name Header at the top of all transactions in that month */}
                    <div className="p-4 sm:p-5 bg-gradient-to-r from-gray-50 via-indigo-50/30 to-gray-50 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <Calendar className="w-5 h-5 text-indigo-600" />
                        <h2 className="text-lg sm:text-xl font-bold text-gray-800 tracking-tight">
                          {group.label}
                        </h2>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-semibold">
                          {group.transactions.length} transaction
                          {group.transactions.length === 1 ? "" : "s"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-green-600 font-semibold">
                          +{currencySymbol}
                          {groupStats.income.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                        <span className="text-gray-300">•</span>
                        <span className="text-red-600 font-semibold">
                          −{currencySymbol}
                          {groupStats.expense.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Table View */}
                    {renderTransactionsTable(group.transactions)}

                    {/* Mobile Card View */}
                    {renderTransactionsMobile(group.transactions)}
                  </div>
                );
              })
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center text-gray-400">
                <Search className="w-10 h-10 mx-auto mb-3 opacity-40 text-gray-400" />
                <p className="font-semibold text-gray-700 text-base">
                  No transactions found in this date range
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Try widening the date range or{" "}
                  <button
                    onClick={clearDateRangeOnly}
                    className="text-indigo-600 font-semibold underline"
                  >
                    reset date filter
                  </button>
                </p>
              </div>
            )}
          </div>
        ) : (
          /* ─── CASE 2: DEFAULT MONTHLY NAVIGATOR VIEW ─── */
          /* Shows the current month's transactions by default with Month Name at the top, swipe left/right and arrows */
          <div
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            className="space-y-4"
          >
            {/* Month Name & Navigation Header at the TOP of all transactions */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                {/* Left Arrow Button -> Goes to Previous Month */}
                <button
                  onClick={handlePrevMonth}
                  className="flex items-center gap-1 sm:gap-2 px-3 py-2 text-xs sm:text-sm font-semibold text-gray-700 bg-gray-50 border border-gray-200 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition shadow-xs group"
                  title="Previous Month (Swipe Left)"
                >
                  <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                  <span className="hidden sm:inline">Prev Month</span>
                </button>

                {/* Month Name Prominently Mentioned */}
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Calendar className="w-5 h-5 text-indigo-600" />
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-800 tracking-tight">
                      {format(selectedMonth, "MMMM yyyy")}
                    </h2>
                  </div>
                  {/* Quick stats for this month */}
                  <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mt-1.5 text-xs text-gray-500">
                    <span className="font-medium text-gray-700">
                      {currentMonthTransactions.length} transaction
                      {currentMonthTransactions.length === 1 ? "" : "s"}
                    </span>
                    <span className="hidden sm:inline text-gray-300">•</span>
                    <span className="text-green-600 font-semibold">
                      +{currencySymbol}
                      {currentMonthStats.income.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                    <span className="hidden sm:inline text-gray-300">•</span>
                    <span className="text-red-600 font-semibold">
                      −{currencySymbol}
                      {currentMonthStats.expense.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>

                {/* Right Arrow Button -> Goes to Future / Next Month */}
                <button
                  onClick={handleNextMonth}
                  className="flex items-center gap-1 sm:gap-2 px-3 py-2 text-xs sm:text-sm font-semibold text-gray-700 bg-gray-50 border border-gray-200 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition shadow-xs group"
                  title="Next Month (Swipe Right)"
                >
                  <span className="hidden sm:inline">Next Month</span>
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>

              {/* Quick Jump to Today if not on current month, and swipe gesture guide */}
              <div className="mt-3 pt-3 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-400">
                <span className="hidden sm:inline">
                  👆 Tip: Swipe left for previous month, swipe right for next month
                </span>
                {!isSameMonth(selectedMonth, new Date()) ? (
                  <button
                    onClick={handleToday}
                    className="font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-full border border-indigo-200 transition"
                  >
                    Jump to Current Month ({format(new Date(), "MMMM yyyy")})
                  </button>
                ) : (
                  <span className="text-emerald-600 font-medium px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100">
                    ● Current Month
                  </span>
                )}
              </div>
            </div>

            {/* Transactions Card/Table Container */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {currentMonthTransactions.length > 0 ? (
                <>
                  {renderTransactionsTable(currentMonthTransactions)}
                  {renderTransactionsMobile(currentMonthTransactions)}
                </>
              ) : (
                <div className="text-center py-16 px-4 text-gray-400">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30 text-indigo-400" />
                  <p className="font-bold text-gray-700 text-lg">
                    No transactions in {format(selectedMonth, "MMMM yyyy")}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                    Use the arrows or swipe to navigate to other months, or record
                    new income/expenses from the Dashboard.
                  </p>
                  {!isSameMonth(selectedMonth, new Date()) && (
                    <button
                      onClick={handleToday}
                      className="mt-4 px-4 py-2 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition"
                    >
                      Return to {format(new Date(), "MMMM yyyy")}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Edit Transaction Modal */}
      <EditTransactionModal
        isOpen={Boolean(editingTransaction)}
        transaction={editingTransaction}
        accounts={accounts}
        onClose={() => setEditingTransaction(null)}
        onSave={handleSaveEdit}
      />

      {/* Custom Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(pendingDeleteId)}
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
