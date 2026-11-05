import { useRef } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";
import {
  X,
  Edit2,
  Trash2,
  Building,
  CreditCard,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  TrendingUp,
  Clock,
} from "lucide-react";

/**
 * Calculates chronological account balance history.
 * Past is on the LEFT edge; current balance is on the RIGHT edge.
 */
export const getAccountBalanceHistory = (accountId, currentBalance, transactions = []) => {
  const accountTransactions = transactions.filter(
    (t) => t.fromAccountId === accountId || t.toAccountId === accountId
  );

  if (!accountTransactions || accountTransactions.length === 0) {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 30);
    return [
      { date: pastDate, balance: currentBalance },
      { date: new Date(), balance: currentBalance },
    ];
  }

  // Sort descending (newest first) to step backward in time from currentBalance
  const sortedDesc = [...accountTransactions].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  const points = [{ date: new Date(), balance: currentBalance }];
  let runningBalance = currentBalance;

  sortedDesc.forEach((t) => {
    // Stepping backward:
    // If transaction added money (income or transfer into account),
    // balance before transaction was lower.
    if (t.type === "income" || t.toAccountId === accountId) {
      runningBalance -= t.amount;
    }
    // If transaction removed money (expense or transfer out of account),
    // balance before transaction was higher.
    else if (t.type === "expense" || t.fromAccountId === accountId) {
      runningBalance += t.amount;
    }
    points.push({ date: new Date(t.date), balance: runningBalance });
  });

  // Reverse so points are chronological:
  // points[0] = OLDEST past point (left edge)
  // points[last] = TODAY / CURRENT value (right edge)
  const chronological = points.reverse();

  if (chronological.length === 1) {
    const pastDate = new Date(chronological[0].date);
    pastDate.setDate(pastDate.getDate() - 7);
    return [
      { date: pastDate, balance: chronological[0].balance },
      chronological[0],
    ];
  }

  return chronological.slice(-30);
};

const AccountDetailModal = ({
  account,
  isOpen,
  onClose,
  transactions = [],
  currencySymbol = "₹",
  onEdit,
  onDelete,
}) => {
  const touchStartY = useRef(null);

  if (!isOpen || !account) return null;

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

  const Icon = getAccountIcon(account.type);

  const accountTransactions = transactions.filter(
    (t) => t.fromAccountId === account.id || t.toAccountId === account.id
  );

  const formatYAxis = (value) => {
    const locale = currencySymbol === "₹" ? "en-IN" : "en-US";
    return new Intl.NumberFormat(locale, {
      notation: "compact",
      compactDisplay: "short",
      maximumFractionDigits: 1,
    }).format(value);
  };

  const balanceHistory = getAccountBalanceHistory(
    account.id,
    account.balance || 0,
    transactions
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="bg-white rounded-t-3xl sm:rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-2xl border border-gray-100 flex flex-col"
      >
        {/* Swipe down handle (touch gesture indicator) */}
        <div className="w-full flex justify-center pb-2 cursor-grab active:cursor-grabbing">
          <div className="w-12 h-1.5 bg-gray-300 hover:bg-gray-400 rounded-full transition" />
        </div>

        {/* Modal Header */}
        <div className="flex items-start justify-between pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center shrink-0">
              <Icon className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
                {account.name}
              </h2>
              <p className="text-xs text-gray-500 capitalize">
                {account.type?.replace("_", " ")} Account
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Account Value & Action Buttons */}
        <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-gray-50 via-indigo-50/20 to-gray-50 -mx-5 sm:-mx-6 px-5 sm:px-6 border-b border-gray-100">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Current Account Balance
            </span>
            <p className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              {currencySymbol}
              {account.balance?.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
              })}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                if (onEdit) onEdit(account.id);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition border border-indigo-200"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Edit Account
            </button>
            <button
              onClick={() => {
                onClose();
                if (onDelete) onDelete(account.id);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition border border-red-200"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Account
            </button>
          </div>
        </div>

        {/* Balance Trend Graph (Past on Left, Current Value on Right Edge) */}
        <div className="py-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-600" />
              Balance Trend (Past → Current)
            </h4>
            <span className="text-[11px] text-gray-400 font-medium">
              Current at right edge
            </span>
          </div>

          <div className="w-full h-52 bg-white rounded-xl pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={balanceHistory}>
                <XAxis
                  dataKey="date"
                  tickFormatter={(date) => format(new Date(date), "MM/dd")}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  axisLine={{ stroke: "#e2e8f0" }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={formatYAxis}
                  width={60}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  axisLine={{ stroke: "#e2e8f0" }}
                  tickLine={false}
                />
                <Tooltip
                  labelFormatter={(date) =>
                    format(new Date(date), "MMM dd, yyyy")
                  }
                  formatter={(value) => [
                    `${currencySymbol}${value.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}`,
                    "Balance",
                  ]}
                  contentStyle={{
                    backgroundColor: "#1e1b4b",
                    borderRadius: "10px",
                    border: "none",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="balance"
                  stroke="#8B5CF6"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#8B5CF6" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Transactions Section */}
        <div className="pt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              Recent Transactions ({accountTransactions.length})
            </h4>
            <span className="text-xs text-gray-400">Latest 10</span>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {accountTransactions.slice(0, 10).map((t) => {
              const isIncome = t.type === "income";
              const isTransferIn = t.type === "transfer" && t.toAccountId === account.id;
              const isPositive = isIncome || isTransferIn;

              return (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg shrink-0 ${
                        isPositive
                          ? "bg-green-100 text-green-600"
                          : "bg-red-100 text-red-600"
                      }`}
                    >
                      {t.type === "transfer" ? (
                        <ArrowLeftRight className="w-4 h-4" />
                      ) : isPositive ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        {t.description || t.category || "Transaction"}
                      </p>
                      <p className="text-xs text-gray-400">
                        {format(new Date(t.date), "MMM dd, yyyy")}
                        {t.type === "transfer"
                          ? isTransferIn
                            ? " · Transfer In"
                            : " · Transfer Out"
                          : ` · ${t.category || ""}`}
                      </p>
                    </div>
                  </div>

                  <p
                    className={`text-sm font-bold whitespace-nowrap ${
                      isPositive ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {isPositive ? "+" : "−"}
                    {currencySymbol}
                    {t.amount.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                </div>
              );
            })}

            {accountTransactions.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-xs">
                No recent transactions for this account yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountDetailModal;

