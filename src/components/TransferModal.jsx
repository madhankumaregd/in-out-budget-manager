import { useState, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { createSplitTransfer } from "../firebase/firestoreService";
import toast from "react-hot-toast";
import { Plus, Trash2, X } from "lucide-react";

const TransferModal = ({ accounts, onClose, onSave }) => {
  const { currentUser, currencySymbol } = useAuth();
  const [toAccountId, setToAccountId] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  // Split mode: each entry is { fromAccountId, amount }
  const [splits, setSplits] = useState([{ fromAccountId: "", amount: "" }]);
  const [isSplitMode, setIsSplitMode] = useState(false);

  // Single transfer mode
  const [singleFromAccountId, setSingleFromAccountId] = useState("");
  const [singleAmount, setSingleAmount] = useState("");

  const totalSplitAmount = splits.reduce(
    (sum, s) => sum + (parseFloat(s.amount) || 0),
    0,
  );

  const addSplit = () => {
    setSplits([...splits, { fromAccountId: "", amount: "" }]);
  };

  const removeSplit = (index) => {
    setSplits(splits.filter((_, i) => i !== index));
  };

  const updateSplit = (index, field, value) => {
    const updated = splits.map((s, i) =>
      i === index ? { ...s, [field]: value } : s,
    );
    setSplits(updated);
  };

  const getAccountBalance = (accountId) => {
    const acc = accounts.find((a) => a.id === accountId);
    return acc ? acc.balance || 0 : 0;
  };

  const getAccountName = (accountId) => {
    const acc = accounts.find((a) => a.id === accountId);
    return acc ? acc.name : "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSplitMode) {
        // Validate splits
        if (splits.some((s) => !s.fromAccountId || !s.amount)) {
          toast.error("Please fill in all split entries.");
          setLoading(false);
          return;
        }
        if (splits.some((s) => s.fromAccountId === toAccountId)) {
          toast.error("Source account cannot be the same as destination.");
          setLoading(false);
          return;
        }
        // Check each split balance client-side for instant feedback
        for (const s of splits) {
          const bal = getAccountBalance(s.fromAccountId);
          const amt = parseFloat(s.amount);
          if (bal < amt) {
            toast.error(
              `Insufficient balance in "${getAccountName(s.fromAccountId)}"! Has ${currencySymbol}${bal.toFixed(2)} but needs ${currencySymbol}${amt.toFixed(2)}.`,
            );
            setLoading(false);
            return;
          }
        }
        await createSplitTransfer(currentUser.uid, {
          splits,
          toAccountId,
          date,
          description,
        });
        toast.success("Split transfer completed!");
        onClose();
      } else {
        // Single-account transfer
        const amount = parseFloat(singleAmount);
        if (!singleFromAccountId || !amount) {
          toast.error("Please fill in all fields.");
          setLoading(false);
          return;
        }
        if (singleFromAccountId === toAccountId) {
          toast.error("Source and destination accounts must be different.");
          setLoading(false);
          return;
        }
        const bal = getAccountBalance(singleFromAccountId);
        if (bal < amount) {
          toast.error(
            `Insufficient balance! "${getAccountName(singleFromAccountId)}" has ${currencySymbol}${bal.toFixed(2)} but you tried to transfer ${currencySymbol}${amount.toFixed(2)}.`,
          );
          setLoading(false);
          return;
        }
        await onSave({
          type: "transfer",
          amount,
          fromAccountId: singleFromAccountId,
          toAccountId,
          date,
          description,
          category: "Transfer",
        });
        toast.success("Transfer completed!");
        onClose();
      }
    } catch (err) {
      toast.error(err.message || "Transfer failed");
    } finally {
      setLoading(false);
    }
  };

  const touchStartY = useRef(null);

  const handleTouchStart = (e) => {
    touchStartY.current = e.targetTouches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    if (touchStartY.current === null) return;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    if (deltaY > 60) {
      onClose();
    }
    touchStartY.current = null;
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-lg w-full p-6 my-4 shadow-2xl border border-gray-100"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Swipe down handle */}
        <div className="w-full flex justify-center pb-2 cursor-grab active:cursor-grabbing">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>

        {/* Header with X */}
        <div className="flex justify-between items-start mb-2">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-1">
              Transfer Between Accounts
            </h2>
            <p className="text-xs text-gray-500">
              Move money from one or multiple accounts to a destination account.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition shrink-0"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-2 my-4">
          <button
            type="button"
            onClick={() => setIsSplitMode(false)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
              !isSplitMode
                ? "bg-violet-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Single Account
          </button>
          <button
            type="button"
            onClick={() => setIsSplitMode(true)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
              isSplitMode
                ? "bg-violet-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Split (Multiple Accounts)
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Destination account */}
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              To Account (Destination)
            </label>
            <select
              value={toAccountId}
              onChange={(e) => setToAccountId(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              required
            >
              <option value="">Select destination account</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({currencySymbol}{acc.balance?.toFixed(2)})
                </option>
              ))}
            </select>
          </div>

          {/* Single mode */}
          {!isSplitMode && (
            <>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  From Account (Source)
                </label>
                <select
                  value={singleFromAccountId}
                  onChange={(e) => setSingleFromAccountId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                  required
                >
                  <option value="">Select source account</option>
                  {accounts
                    .filter((a) => a.id !== toAccountId)
                    .map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({currencySymbol}{acc.balance?.toFixed(2)})
                      </option>
                    ))}
                </select>
                {singleFromAccountId && singleAmount && (() => {
                  const bal = getAccountBalance(singleFromAccountId);
                  if (bal < parseFloat(singleAmount || 0)) {
                    return (
                      <p className="mt-1 text-xs text-red-600 font-medium">
                        ⚠️ Insufficient balance ({currencySymbol}{bal.toFixed(2)} available)
                      </p>
                    );
                  }
                })()}
              </div>
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
                    value={singleAmount}
                    onChange={(e) => setSingleAmount(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                    required
                  />
                </div>
              </div>
            </>
          )}

          {/* Split mode */}
          {isSplitMode && (
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-3">
                From Accounts (Sources)
              </label>
              <div className="space-y-3">
                {splits.map((split, index) => (
                  <div
                    key={index}
                    className="flex gap-2 items-start p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <select
                        value={split.fromAccountId}
                        onChange={(e) =>
                          updateSplit(index, "fromAccountId", e.target.value)
                        }
                        className="w-full px-2 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                        required
                      >
                        <option value="">Select account</option>
                        {accounts
                          .filter((a) => a.id !== toAccountId)
                          .map((acc) => (
                            <option key={acc.id} value={acc.id}>
                              {acc.name} ({currencySymbol}{acc.balance?.toFixed(2)})
                            </option>
                          ))}
                      </select>
                      {split.fromAccountId && split.amount && (() => {
                        const bal = getAccountBalance(split.fromAccountId);
                        if (bal < parseFloat(split.amount || 0)) {
                          return (
                            <p className="mt-1 text-xs text-red-600">
                              ⚠️ Insufficient ({currencySymbol}{bal.toFixed(2)} available)
                            </p>
                          );
                        }
                      })()}
                    </div>
                    <div className="w-32">
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                          {currencySymbol}
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="Amount"
                          value={split.amount}
                          onChange={(e) =>
                            updateSplit(index, "amount", e.target.value)
                          }
                          className="w-full pl-6 pr-2 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                          required
                        />
                      </div>
                    </div>
                    {splits.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSplit(index)}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addSplit}
                className="mt-3 flex items-center gap-2 text-violet-600 text-sm font-medium hover:text-violet-800"
              >
                <Plus className="w-4 h-4" />
                Add another account
              </button>
              {totalSplitAmount > 0 && (
                <div className="mt-3 p-3 bg-violet-50 rounded-lg">
                  <p className="text-sm font-semibold text-violet-700">
                    Total transfer: {currencySymbol}{totalSplitAmount.toFixed(2)}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Date */}
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              required
            />
          </div>

          {/* Description */}
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Description (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="e.g. Monthly savings transfer"
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
              className="flex-1 bg-violet-600 text-white py-2 rounded hover:bg-violet-700 disabled:opacity-50"
            >
              {loading ? "Processing..." : "Transfer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransferModal;
