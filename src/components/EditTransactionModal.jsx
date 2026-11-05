import { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { format } from "date-fns";
import { X, ArrowUpRight, ArrowDownRight, RefreshCw, AlertCircle } from "lucide-react";

const EditTransactionModal = ({ transaction, accounts, isOpen, onClose, onSave }) => {
  const { currencySymbol } = useAuth();
  const touchStartY = useRef(null);

  const [type, setType] = useState("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const categories = {
    income: ["Salary", "Freelance", "Investment", "Gift", "Other"],
    expense: [
      "Food",
      "Transport",
      "Entertainment",
      "Shopping",
      "Bills",
      "Healthcare",
      "Education",
      "Other",
    ],
  };

  useEffect(() => {
    if (transaction) {
      setType(transaction.type || "expense");
      setAmount(transaction.amount !== undefined ? String(transaction.amount) : "");
      setCategory(transaction.category || "");
      setFromAccountId(transaction.fromAccountId || "");
      setToAccountId(transaction.toAccountId || "");
      setDescription(transaction.description || "");
      setError("");

      if (transaction.date) {
        try {
          const d = transaction.date instanceof Date 
            ? transaction.date 
            : transaction.date?.toDate 
            ? transaction.date.toDate() 
            : new Date(transaction.date);
          setDate(format(d, "yyyy-MM-dd"));
        } catch {
          setDate(new Date().toISOString().split("T")[0]);
        }
      } else {
        setDate(new Date().toISOString().split("T")[0]);
      }
    }
  }, [transaction]);

  if (!isOpen || !transaction) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid amount greater than 0");
      return;
    }

    if (!fromAccountId) {
      setError(type === "transfer" ? "Please select a source account" : "Please select an account");
      return;
    }

    if (type === "transfer") {
      if (!toAccountId) {
        setError("Please select a destination account");
        return;
      }
      if (fromAccountId === toAccountId) {
        setError("Source and destination accounts must be different");
        return;
      }
    } else {
      if (!category) {
        setError("Please select or enter a category");
        return;
      }
    }

    setLoading(true);
    try {
      await onSave({
        type,
        amount: parsedAmount,
        category: type === "transfer" ? "Transfer" : category,
        fromAccountId,
        toAccountId: type === "transfer" ? toAccountId : null,
        date,
        description,
      });
      onClose();
    } catch (err) {
      setError(err.message || "Failed to update transaction");
    } finally {
      setLoading(false);
    }
  };

  // Helper to get account balance
  const getAccount = (id) => accounts.find((a) => a.id === id);

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => {
          touchStartY.current = e.touches[0].clientY;
        }}
        onTouchEnd={(e) => {
          if (touchStartY.current === null) return;
          const deltaY = e.changedTouches[0].clientY - touchStartY.current;
          if (deltaY > 60) {
            onClose();
          }
          touchStartY.current = null;
        }}
      >
        {/* Swipe down handle */}
        <div className="w-full flex justify-center pb-2 cursor-grab">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>

        <div className="flex justify-between items-center pb-4 mb-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-xl ${
              type === "income" ? "bg-green-100 text-green-700" :
              type === "expense" ? "bg-red-100 text-red-700" :
              "bg-blue-100 text-blue-700"
            }`}>
              {type === "income" ? <ArrowUpRight className="w-5 h-5" /> :
               type === "expense" ? <ArrowDownRight className="w-5 h-5" /> :
               <RefreshCw className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Edit Transaction</h2>
              <p className="text-xs text-gray-500">Update transaction details and balances</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Transaction Type Segmented Control */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
              Transaction Type
            </label>
            <div className="grid grid-cols-3 gap-2 p-1 bg-gray-100 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setType("income");
                  if (category === "Transfer" || !categories.income.includes(category)) {
                    setCategory("Salary");
                  }
                }}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition ${
                  type === "income"
                    ? "bg-white text-green-700 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                Income
              </button>
              <button
                type="button"
                onClick={() => {
                  setType("expense");
                  if (category === "Transfer" || !categories.expense.includes(category)) {
                    setCategory("Food");
                  }
                }}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition ${
                  type === "expense"
                    ? "bg-white text-red-700 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <ArrowDownRight className="w-3.5 h-3.5" />
                Expense
              </button>
              <button
                type="button"
                onClick={() => {
                  setType("transfer");
                  setCategory("Transfer");
                }}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition ${
                  type === "transfer"
                    ? "bg-white text-blue-700 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Transfer
              </button>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
              Amount ({currencySymbol})
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 font-bold">
                {currencySymbol}
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-base"
                required
              />
            </div>
          </div>

          {/* If Transfer: From and To Account dropdowns */}
          {type === "transfer" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                  Transfer From
                </label>
                <select
                  value={fromAccountId}
                  onChange={(e) => setFromAccountId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  required
                >
                  <option value="">Select source</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({currencySymbol}{acc.balance?.toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                  Transfer To
                </label>
                <select
                  value={toAccountId}
                  onChange={(e) => setToAccountId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  required
                >
                  <option value="">Select destination</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id} disabled={acc.id === fromAccountId}>
                      {acc.name} ({currencySymbol}{acc.balance?.toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            /* Income or Expense: Category and Account */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  required
                >
                  <option value="">Select Category</option>
                  {categories[type]?.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                  {/* Preserve custom category if it exists and not in default list */}
                  {category && !categories[type]?.includes(category) && category !== "Transfer" && (
                    <option value={category}>{category}</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                  Account
                </label>
                <select
                  value={fromAccountId}
                  onChange={(e) => setFromAccountId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  required
                >
                  <option value="">Select Account</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({currencySymbol}{acc.balance?.toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Date Picker */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
              Description (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Grocery shopping, Salary bonus..."
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-md shadow-indigo-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditTransactionModal;

