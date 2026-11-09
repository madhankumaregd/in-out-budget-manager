import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  writeBatch,
  serverTimestamp,
  Timestamp,
  onSnapshot,
} from "firebase/firestore";
import { db } from "./firebase";

/**
 * Request browser desktop notification permission
 */
export const requestBrowserNotificationPermission = async () => {
  if (typeof window !== "undefined" && "Notification" in window) {
    try {
      if (Notification.permission === "default") {
        const permission = await Notification.requestPermission();
        return permission === "granted";
      }
      return Notification.permission === "granted";
    } catch (e) {
      console.warn("Notification permission error:", e);
      return false;
    }
  }
  return false;
};

/**
 * Show native browser desktop notification if permitted
 */
export const showBrowserNotification = (title, body, tag) => {
  if (
    typeof window !== "undefined" &&
    "Notification" in window &&
    Notification.permission === "granted"
  ) {
    try {
      new Notification(title, {
        body,
        icon: "/favicon.ico",
        tag: tag || "in-and-out-notification",
      });
    } catch (e) {
      console.warn("Error firing desktop notification:", e);
    }
  }
};

/**
 * Stream real-time notifications for a user, newest first
 */
export const streamNotifications = (userId, onUpdate, onError) => {
  if (!userId) return () => {};

  const notifsRef = collection(db, "users", userId, "notifications");
  const q = query(notifsRef, orderBy("createdAt", "desc"), limit(50));

  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => {
        const data = d.data();
        let parsedDate = new Date();
        if (data.createdAt instanceof Timestamp) {
          parsedDate = data.createdAt.toDate();
        } else if (data.createdAt?.seconds) {
          parsedDate = new Date(data.createdAt.seconds * 1000);
        } else if (typeof data.createdAt === "string") {
          parsedDate = new Date(data.createdAt);
        }

        return {
          id: d.id,
          ...data,
          createdAt: parsedDate,
        };
      });
      onUpdate(items);
    },
    (err) => {
      console.warn("Notifications listener error:", err);
      if (onError) onError(err);
    }
  );
};

/**
 * Mark a single notification as read
 */
export const markNotificationAsRead = async (userId, notificationId) => {
  if (!userId || !notificationId) return;
  try {
    const docRef = doc(db, "users", userId, "notifications", notificationId);
    await updateDoc(docRef, { read: true });
  } catch (e) {
    console.error("Error marking notification read:", e);
  }
};

/**
 * Mark all user notifications as read
 */
export const markAllNotificationsAsRead = async (userId) => {
  if (!userId) return;
  try {
    const notifsRef = collection(db, "users", userId, "notifications");
    const snap = await getDocs(notifsRef);
    const unreadDocs = snap.docs.filter((d) => !d.data().read);
    if (unreadDocs.length === 0) return;

    const batch = writeBatch(db);
    unreadDocs.forEach((d) => {
      batch.update(d.ref, { read: true });
    });
    await batch.commit();
  } catch (e) {
    console.error("Error marking all read:", e);
  }
};

/**
 * Delete a single notification
 */
export const deleteNotification = async (userId, notificationId) => {
  if (!userId || !notificationId) return;
  try {
    const docRef = doc(db, "users", userId, "notifications", notificationId);
    await deleteDoc(docRef);
  } catch (e) {
    console.error("Error deleting notification:", e);
  }
};

/**
 * Clear all notifications
 */
export const clearAllNotifications = async (userId) => {
  if (!userId) return;
  try {
    const notifsRef = collection(db, "users", userId, "notifications");
    const snap = await getDocs(query(notifsRef, limit(100)));
    if (snap.empty) return;

    const batch = writeBatch(db);
    snap.docs.forEach((d) => {
      batch.delete(d.ref);
    });
    await batch.commit();
  } catch (e) {
    console.error("Error clearing notifications:", e);
  }
};

/**
 * Evaluate user accounts & transactions to generate intelligent alerts
 */
let lastEvaluationTime = 0;

export const evaluateAndSyncNotifications = async (
  userId,
  accounts = [],
  transactions = [],
  currencySymbol = "₹"
) => {
  if (!userId) return;

  // Rate-limit evaluation in browser session to at most once every 15s
  const nowMs = Date.now();
  if (nowMs - lastEvaluationTime < 15000) return;
  lastEvaluationTime = nowMs;

  const now = new Date();
  const todayStr = now.toISOString().split("T")[0]; // YYYY-MM-DD
  const batch = writeBatch(db);
  let hasWrites = false;

  // 1. SECURITY ALERT: Low bank balance (< 1k, i.e. < 1000)
  // Only fires once per day per account to prevent spam
  for (const acc of accounts) {
    const isBankOrWallet = acc.type === "bank" || acc.type === "wallet";
    if (isBankOrWallet && acc.balance < 1000 && acc.balance >= 0) {
      const docId = `low_bal_${acc.id}_${todayStr}`;
      const docRef = doc(db, "users", userId, "notifications", docId);
      const snap = await getDoc(docRef);

      if (!snap.exists()) {
        const title = "Security Alert: Low Bank Balance";
        const message = `Account "${acc.name}" balance has dropped to ${currencySymbol}${acc.balance.toFixed(2)}, which is below the safe threshold of ${currencySymbol}1,000.`;
        batch.set(docRef, {
          title,
          message,
          type: "security_low_balance",
          severity: "warning",
          read: false,
          createdAt: serverTimestamp(),
          metadata: {
            accountId: acc.id,
            accountName: acc.name,
            balance: acc.balance,
            threshold: 1000,
          },
        });
        hasWrites = true;
        showBrowserNotification(title, message, docId);
      }
    } else if (acc.balance < 0) {
      const docId = `overdrawn_${acc.id}_${todayStr}`;
      const docRef = doc(db, "users", userId, "notifications", docId);
      const snap = await getDoc(docRef);

      if (!snap.exists()) {
        const title = "Critical: Overdrawn Account";
        const message = `Account "${acc.name}" has an overdraft balance of -${currencySymbol}${Math.abs(acc.balance).toFixed(2)}. Immediate action required.`;
        batch.set(docRef, {
          title,
          message,
          type: "overdraft",
          severity: "danger",
          read: false,
          createdAt: serverTimestamp(),
          metadata: {
            accountId: acc.id,
            accountName: acc.name,
            balance: acc.balance,
          },
        });
        hasWrites = true;
        showBrowserNotification(title, message, docId);
      }
    }
  }

  // 2. DAILY FINANCIAL SUMMARY: One notification for today's transactions/income/expense
  const todayTxs = transactions.filter((t) => {
    const d = new Date(t.date);
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  });

  if (todayTxs.length > 0) {
    const todayExpense = todayTxs
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const todayIncome = todayTxs
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const txCount = todayTxs.length;

    const summaryDocId = `daily_summary_${todayStr}`;
    const summaryDocRef = doc(db, "users", userId, "notifications", summaryDocId);
    const snap = await getDoc(summaryDocRef);

    let summaryMsg = `Today: ${txCount} transaction${txCount > 1 ? "s" : ""}. `;
    if (todayExpense > 0) {
      summaryMsg += `Spent ${currencySymbol}${todayExpense.toFixed(2)}`;
    } else {
      summaryMsg += "No expenses yet";
    }
    if (todayIncome > 0) {
      summaryMsg += ` · Earned +${currencySymbol}${todayIncome.toFixed(2)}`;
    }

    if (!snap.exists()) {
      const title = "Daily Financial Summary";
      batch.set(summaryDocRef, {
        title,
        message: summaryMsg,
        type: "daily_summary",
        severity: "info",
        read: false,
        createdAt: serverTimestamp(),
        metadata: {
          date: todayStr,
          txCount,
          expense: todayExpense,
          income: todayIncome,
        },
      });
      hasWrites = true;
      showBrowserNotification(title, summaryMsg, summaryDocId);
    } else {
      const existingData = snap.data();
      const prevCount = existingData?.metadata?.txCount || 0;
      if (prevCount !== txCount) {
        batch.update(summaryDocRef, {
          message: summaryMsg,
          "metadata.txCount": txCount,
          "metadata.expense": todayExpense,
          "metadata.income": todayIncome,
        });
        hasWrites = true;
      }
    }
  }

  // 3. HIGH EXPENSE NOTIFICATION (Single expense >= 10,000)
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
  const highExpenses = transactions
    .filter(
      (t) =>
        t.type === "expense" &&
        Number(t.amount) >= 10000 &&
        new Date(t.date) > sevenDaysAgo
    )
    .slice(0, 5);

  for (const tx of highExpenses) {
    const docId = `high_exp_${tx.id}`;
    const docRef = doc(db, "users", userId, "notifications", docId);
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
      const categoryOrDesc = tx.description || tx.category || "Expense";
      const title = "High Expense Recorded";
      const message = `A high expense of ${currencySymbol}${Number(tx.amount).toFixed(2)} was recorded for "${categoryOrDesc}".`;
      batch.set(docRef, {
        title,
        message,
        type: "high_expense",
        severity: "warning",
        read: false,
        createdAt: Timestamp.fromDate(new Date(tx.date)),
        metadata: {
          transactionId: tx.id,
          amount: tx.amount,
          category: tx.category,
        },
      });
      hasWrites = true;
    }
  }

  if (hasWrites) {
    try {
      await batch.commit();
    } catch (e) {
      console.warn("Failed to commit notification batch:", e);
    }
  }
};

