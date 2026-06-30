import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";

const AddTransactionModal = ({ type, accounts, onClose, onSave }) => {
  const { currencySymbol } = useAuth();
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [accountId, setAccountId] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);

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

  const handleSubmit = async (e) => {
    e.preventDefault();

    const parsedAmount = parseFloat(amount);

    // Balance guard for expenses
    if (type === "expense" && accountId) {
      const selectedAccount = accounts.find((a) => a.id === accountId);
      if (selectedAccount && selectedAccount.balance < parsedAmount) {
        toast.error(
          `Insufficient balance! "${selectedAccount.name}" has ${currencySymbol}${selectedAccount.balance.toFixed(2)} but you tried to spend ${currencySymbol}${parsedAmount.toFixed(2)}.`,
        );
        return;
      }
    }

    setLoading(true);
    try {
      await onSave({
        type,
        amount: parsedAmount,
        category,
        fromAccountId: accountId,
        date,
        description,
      });
      onClose();
    } catch (err) {
      toast.error(err.message || "Failed to add transaction");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-2xl font-bold mb-4">
          Add {type === "income" ? "Income" : "Expense"}
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                {currencySymbol}
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-8 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select category</option>
              {categories[type].map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Account
            </label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select account</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({currencySymbol}{acc.balance?.toFixed(2)})
                </option>
              ))}
            </select>
            {/* Show live balance warning */}
            {accountId && amount && type === "expense" && (() => {
              const sel = accounts.find((a) => a.id === accountId);
              if (sel && sel.balance < parseFloat(amount || 0)) {
                return (
                  <p className="mt-1 text-xs text-red-600 font-medium">
                    ⚠️ Insufficient balance ({currencySymbol}{sel.balance.toFixed(2)} available)
                  </p>
                );
              }
              return null;
            })()}
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Description (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading
                ? "Adding..."
                : `Add ${type === "income" ? "Income" : "Expense"}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTransactionModal;
