import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  getUserTransactions,
  getUserAccounts,
} from "../firebase/firestoreService";
import { format } from "date-fns";

const Transactions = () => {
  const { currentUser } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ type: "all", accountId: "" });
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  useEffect(() => {
    if (!currentUser) return;

    let isMounted = true;

    const fetchData = async () => {
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
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  const getAccountName = (accountId) => {
    const account = accounts.find((acc) => acc.id === accountId);
    return account ? account.name : "N/A";
  };

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
    return match;
  });

  let runningBalance = 0;
  const transactionsWithBalance = filteredTransactions.map((t) => {
    // eslint-disable-next-line react-hooks/immutability
    if (t.type === "income") runningBalance += t.amount;
    else if (t.type === "expense") runningBalance -= t.amount;
    return { ...t, runningBalance: runningBalance };
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">
          Transaction History
        </h1>

        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <select
              value={filter.type}
              onChange={(e) => setFilter({ ...filter, type: e.target.value })}
              className="px-3 py-2 border rounded-lg"
            >
              <option value="all">All Types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
              <option value="transfer">Transfer</option>
            </select>

            <select
              value={filter.accountId}
              onChange={(e) =>
                setFilter({ ...filter, accountId: e.target.value })
              }
              className="px-3 py-2 border rounded-lg"
            >
              <option value="">All Accounts</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={dateRange.start}
              onChange={(e) =>
                setDateRange({ ...dateRange, start: e.target.value })
              }
              className="px-3 py-2 border rounded-lg"
              placeholder="Start Date"
            />

            <input
              type="date"
              value={dateRange.end}
              onChange={(e) =>
                setDateRange({ ...dateRange, end: e.target.value })
              }
              className="px-3 py-2 border rounded-lg"
              placeholder="End Date"
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  From
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  To
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Balance
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {transactionsWithBalance.map((t) => (
                <tr key={t.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {format(new Date(t.date), "MMM dd, yyyy")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        t.type === "income"
                          ? "bg-green-100 text-green-800"
                          : t.type === "expense"
                            ? "bg-red-100 text-red-800"
                            : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {t.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {t.category}
                  </td>
                  <td
                    className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                      t.type === "income"
                        ? "text-green-600"
                        : t.type === "expense"
                          ? "text-red-600"
                          : "text-blue-600"
                    }`}
                  >
                    {t.type === "income"
                      ? "+"
                      : t.type === "expense"
                        ? "-"
                        : ""}
                    ${t.amount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {getAccountName(t.fromAccountId)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {t.toAccountId ? getAccountName(t.toAccountId) : "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {t.description || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${t.runningBalance.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {transactionsWithBalance.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No transactions found
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Transactions;
