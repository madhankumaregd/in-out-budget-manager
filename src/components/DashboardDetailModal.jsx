import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import {
  X,
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowRight,
  ChevronLeft,
  Building,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

/* ─────────────────────────────────────────────────────────────
   Single transaction row used inside the lists
────────────────────────────────────────────────────────────── */
const TxRow = ({ t, getAccountName, currencySymbol }) => {
  const isIncome = t.type === "income";
  const isExpense = t.type === "expense";

  const TypeIcon = isIncome
    ? ArrowUpRight
    : isExpense
    ? ArrowDownRight
    : ArrowLeftRight;

  const colorClass = isIncome
    ? "text-green-600"
    : isExpense
    ? "text-red-600"
    : "text-blue-600";

  const bgClass = isIncome
    ? "bg-green-50"
    : isExpense
    ? "bg-red-50"
    : "bg-blue-50";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-9 h-9 rounded-full ${bgClass} flex items-center justify-center shrink-0`}
        >
          <TypeIcon className={`w-4 h-4 ${colorClass}`} />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-800">
            {t.description || t.category || "—"}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {t.category && t.description ? t.category + " · " : ""}
            {getAccountName(t.fromAccountId)}
            {t.toAccountId ? ` → ${getAccountName(t.toAccountId)}` : ""}
          </p>
        </div>
      </div>
      <div className="text-right shrink-0 ml-4">
        <p className={`text-sm font-bold ${colorClass}`}>
          {isIncome ? "+" : isExpense ? "−" : ""}
          {currencySymbol}
          {t.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {t.date ? format(new Date(t.date), "MMM dd, yyyy") : "—"}
          {t.createdAt?.toDate
            ? " · " + format(t.createdAt.toDate(), "hh:mm a")
            : ""}
        </p>
      </div>
    </motion.div>
  );
};

/* ─────────────────────────────────────────────────────────────
   Account card used inside blue (Total Balance) view
────────────────────────────────────────────────────────────── */
const AccountCard = ({ account, onClick }) => {
  const { currencySymbol } = useAuth();

  const getIcon = (type) => {
    if (type === "bank") return Building;
    if (type === "credit_card") return CreditCard;
    return Wallet;
  };
  const Icon = getIcon(account.type);

  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick(account)}
      className="w-full text-left p-5 bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition-all flex items-center justify-between group"
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl flex items-center justify-center shrink-0">
          <Icon className="w-6 h-6 text-indigo-600" />
        </div>
        <div>
          <p className="font-bold text-gray-800">{account.name}</p>
          <p className="text-sm text-gray-500 capitalize mt-0.5">
            {account.type.replace("_", " ")}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <p className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          {currencySymbol}
          {account.balance?.toLocaleString("en-IN")}
        </p>
        <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 transition-colors" />
      </div>
    </motion.button>
  );
};

/* ─────────────────────────────────────────────────────────────
   Main DashboardDetailModal
   
   mode: "income" | "expense" | "accounts"
────────────────────────────────────────────────────────────── */
const DashboardDetailModal = ({
  isOpen,
  onClose,
  mode,
  transactions,
  accounts,
}) => {
  const { currencySymbol } = useAuth();
  // When inside "accounts" mode, user can drill into a specific account
  const [selectedAccount, setSelectedAccount] = useState(null);

  const getAccountName = (accountId) => {
    const acc = accounts.find((a) => a.id === accountId);
    return acc ? acc.name : "N/A";
  };

  // Compute what to display
  const filteredTx =
    mode === "accounts"
      ? selectedAccount
        ? transactions.filter(
            (t) =>
              t.fromAccountId === selectedAccount.id ||
              t.toAccountId === selectedAccount.id,
          )
        : []
      : transactions.filter((t) => t.type === mode);

  const totalAmount = filteredTx.reduce((sum, t) => sum + (t.amount || 0), 0);

  // Header config per mode
  const config = {
    income: {
      title: "Income History",
      subtitle: `${filteredTx.length} income transactions`,
      gradient: "from-green-500 to-emerald-600",
      icon: TrendingUp,
      label: "Total Income",
    },
    expense: {
      title: "Expense History",
      subtitle: `${filteredTx.length} expense transactions`,
      gradient: "from-red-500 to-rose-600",
      icon: TrendingDown,
      label: "Total Spent",
    },
    accounts: {
      title: selectedAccount ? selectedAccount.name : "All Accounts",
      subtitle: selectedAccount
        ? `${filteredTx.length} transactions`
        : `${accounts.length} accounts`,
      gradient: "from-blue-500 to-indigo-600",
      icon: Wallet,
      label: selectedAccount ? "Account Balance" : "Total Balance",
    },
  };

  const cfg = config[mode] || config.income;
  const HeaderIcon = cfg.icon;

  const handleClose = () => {
    setSelectedAccount(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="bd"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          />

          {/* Full-screen slide-up panel */}
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", stiffness: 280, damping: 32 }}
            className="fixed inset-x-0 bottom-0 top-16 z-50 flex flex-col bg-gray-50 rounded-t-3xl overflow-hidden shadow-2xl"
          >
            {/* Gradient header */}
            <div
              className={`bg-gradient-to-r ${cfg.gradient} px-6 pt-6 pb-8 text-white shrink-0`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {selectedAccount && mode === "accounts" ? (
                    <button
                      onClick={() => setSelectedAccount(null)}
                      className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                      <HeaderIcon className="w-5 h-5" />
                    </div>
                  )}
                  <div>
                    <h2 className="text-xl font-bold">{cfg.title}</h2>
                    <p className="text-sm opacity-80">{cfg.subtitle}</p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Summary stat */}
              <div className="bg-white/15 rounded-2xl px-5 py-4">
                <p className="text-sm opacity-80">{cfg.label}</p>
                {mode === "accounts" && !selectedAccount ? (
                  <p className="text-3xl font-bold mt-1">
                    {currencySymbol}
                    {accounts
                      .reduce((s, a) => s + (a.balance || 0), 0)
                      .toLocaleString("en-IN")}
                  </p>
                ) : mode === "accounts" && selectedAccount ? (
                  <p className="text-3xl font-bold mt-1">
                    {currencySymbol}
                    {selectedAccount.balance?.toLocaleString("en-IN")}
                  </p>
                ) : (
                  <p className="text-3xl font-bold mt-1">
                    {currencySymbol}
                    {totalAmount.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                )}
              </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {/* ACCOUNTS MODE — account list */}
              {mode === "accounts" && !selectedAccount && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                    Tap an account to see its transaction history
                  </p>
                  {accounts.map((acc) => (
                    <AccountCard
                      key={acc.id}
                      account={acc}
                      onClick={setSelectedAccount}
                    />
                  ))}
                  {accounts.length === 0 && (
                    <div className="text-center py-16 text-gray-400">
                      <Wallet className="w-10 h-10 mx-auto mb-3 opacity-50" />
                      <p>No accounts yet</p>
                    </div>
                  )}
                </div>
              )}

              {/* TRANSACTION LIST — income / expense / account-specific */}
              {(mode !== "accounts" || selectedAccount) && (
                <div className="space-y-3">
                  {filteredTx.length === 0 && (
                    <div className="text-center py-20 text-gray-400">
                      <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-40" />
                      <p className="font-medium">No transactions found</p>
                    </div>
                  )}
                  {filteredTx.map((t) => (
                    <TxRow
                      key={t.id}
                      t={t}
                      getAccountName={getAccountName}
                      currencySymbol={currencySymbol}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default DashboardDetailModal;
