import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit as firestoreLimit,
  startAfter,
  Timestamp,
  writeBatch,
  getDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  checkTransactionRate,
  recordTransaction,
  formatCooldown,
} from "../utils/rateLimiter";
import {
  sanitizeString,
  validateAmount,
  validateTransactionType,
} from "../utils/sanitizer";

// ─── USER PROFILE ──────────────────────────────────────────────
export const getUserProfile = async (userId) => {
  if (!userId) return null;

  try {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      return { id: userDoc.id, ...userDoc.data() };
    }
    return null;
  } catch (error) {
    console.error("Error getting user profile:", error);
    return null;
  }
};

export const updateUserProfile = async (userId, profileData) => {
  if (!userId) throw new Error("User ID is required");

  // Sanitize text fields
  const sanitized = { ...profileData };
  if (sanitized.displayName)
    sanitized.displayName = sanitizeString(sanitized.displayName);

  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, {
    ...sanitized,
    updatedAt: Timestamp.now(),
  });
};

// ─── ACCOUNTS ──────────────────────────────────────────────────
export const createAccount = async (userId, accountData) => {
  if (!userId) throw new Error("User ID is required");

  const accountsRef = collection(db, "users", userId, "accounts");
  const docRef = await addDoc(accountsRef, {
    name: sanitizeString(accountData.name),
    type: accountData.type,
    balance: Number(accountData.balance) || 0,
    currency: accountData.currency || "INR",
    createdAt: Timestamp.now(),
  });

  return { id: docRef.id, ...accountData };
};

export const getUserAccounts = async (userId) => {
  if (!userId) return [];

  try {
    const accountsRef = collection(db, "users", userId, "accounts");
    const q = query(accountsRef, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      balance: doc.data().balance || 0,
    }));
  } catch (error) {
    console.error("Error getting accounts:", error);
    return [];
  }
};

export const getAccountById = async (userId, accountId) => {
  if (!userId || !accountId) return null;

  try {
    const accountRef = doc(db, "users", userId, "accounts", accountId);
    const accountDoc = await getDoc(accountRef);

    if (accountDoc.exists()) {
      return { id: accountDoc.id, ...accountDoc.data() };
    }
    return null;
  } catch (error) {
    console.error("Error getting account:", error);
    return null;
  }
};

export const updateAccount = async (userId, accountId, updates) => {
  if (!userId || !accountId)
    throw new Error("User ID and Account ID are required");

  // Sanitize any text updates
  const sanitized = { ...updates };
  if (sanitized.name) sanitized.name = sanitizeString(sanitized.name);

  const accountRef = doc(db, "users", userId, "accounts", accountId);
  await updateDoc(accountRef, sanitized);
};

export const deleteAccount = async (userId, accountId) => {
  if (!userId || !accountId)
    throw new Error("User ID and Account ID are required");

  const accountRef = doc(db, "users", userId, "accounts", accountId);
  await deleteDoc(accountRef);
};

// ─── TRANSACTIONS (Rate-Limited + Sanitized) ───────────────────
export const createTransaction = async (userId, transactionData) => {
  if (!userId) throw new Error("User ID is required");

  // ── Rate Limit Check ──
  const rateCheck = checkTransactionRate(userId);
  if (!rateCheck.allowed) {
    throw new Error(
      `Too many transactions. Please wait ${formatCooldown(rateCheck.retryAfterMs)} before adding more.`
    );
  }

  // ── Input Validation ──
  const amountCheck = validateAmount(transactionData.amount);
  if (!amountCheck.valid) throw new Error(amountCheck.error);

  if (!validateTransactionType(transactionData.type)) {
    throw new Error("Invalid transaction type");
  }

  // ── Sanitize text fields ──
  const description = sanitizeString(transactionData.description || "");
  const category = sanitizeString(transactionData.category || "");

  const transactionsRef = collection(db, "users", userId, "transactions");

  if (transactionData.type === "transfer") {
    const fromAccountRef = doc(
      db,
      "users",
      userId,
      "accounts",
      transactionData.fromAccountId
    );
    const toAccountRef = doc(
      db,
      "users",
      userId,
      "accounts",
      transactionData.toAccountId
    );

    // Fetch both accounts concurrently
    const [fromAccount, toAccount] = await Promise.all([
      getDoc(fromAccountRef),
      getDoc(toAccountRef),
    ]);

    const fromBalance = fromAccount.data().balance || 0;
    const transferAmount = amountCheck.value;

    if (fromBalance < transferAmount) {
      throw new Error(
        `Insufficient balance! Account has ${fromBalance.toFixed(2)} but you tried to transfer ${transferAmount.toFixed(2)}.`
      );
    }

    const docRef = await addDoc(transactionsRef, {
      type: "transfer",
      amount: transferAmount,
      fromAccountId: transactionData.fromAccountId,
      toAccountId: transactionData.toAccountId,
      date: Timestamp.fromDate(new Date(transactionData.date)),
      description,
      category: "Transfer",
      createdAt: Timestamp.now(),
    });

    const batch = writeBatch(db);
    batch.update(fromAccountRef, {
      balance: fromBalance - transferAmount,
    });
    batch.update(toAccountRef, {
      balance: (toAccount.data().balance || 0) + transferAmount,
    });
    await batch.commit();

    // Record rate limit hit
    recordTransaction(userId);

    return { id: docRef.id, ...transactionData };
  } else {
    const accountRef = doc(
      db,
      "users",
      userId,
      "accounts",
      transactionData.fromAccountId
    );
    const account = await getDoc(accountRef);
    const currentBalance = account.data().balance || 0;
    const txAmount = amountCheck.value;

    if (transactionData.type === "expense" && currentBalance < txAmount) {
      throw new Error(
        `Insufficient balance! Account has ${currentBalance.toFixed(2)} but you tried to spend ${txAmount.toFixed(2)}.`
      );
    }

    const newBalance =
      transactionData.type === "income"
        ? currentBalance + txAmount
        : currentBalance - txAmount;

    const docRef = await addDoc(transactionsRef, {
      type: transactionData.type,
      amount: txAmount,
      category,
      fromAccountId: transactionData.fromAccountId,
      date: Timestamp.fromDate(new Date(transactionData.date)),
      description,
      createdAt: Timestamp.now(),
    });

    await updateDoc(accountRef, { balance: newBalance });

    // Record rate limit hit
    recordTransaction(userId);

    return { id: docRef.id, ...transactionData };
  }
};

// Multi-account split transfer
export const createSplitTransfer = async (userId, splitData) => {
  if (!userId) throw new Error("User ID is required");

  // Rate limit check
  const rateCheck = checkTransactionRate(userId);
  if (!rateCheck.allowed) {
    throw new Error(
      `Too many transactions. Please wait ${formatCooldown(rateCheck.retryAfterMs)} before adding more.`
    );
  }

  const transactionsRef = collection(db, "users", userId, "transactions");

  // Validate all amounts
  for (const split of splitData.splits) {
    const check = validateAmount(split.amount);
    if (!check.valid) throw new Error(check.error);
  }

  // Fetch ALL accounts concurrently instead of sequential loop
  const accountFetches = splitData.splits.map((split) =>
    getDoc(doc(db, "users", userId, "accounts", split.fromAccountId))
  );
  const toAccountRef = doc(
    db,
    "users",
    userId,
    "accounts",
    splitData.toAccountId
  );
  accountFetches.push(getDoc(toAccountRef));

  const accountDocs = await Promise.all(accountFetches);
  const toAccountDoc = accountDocs.pop();

  // Validate all source balances
  for (let i = 0; i < splitData.splits.length; i++) {
    const split = splitData.splits[i];
    const accountDoc = accountDocs[i];
    const balance = accountDoc.data().balance || 0;
    const splitAmount = Number(split.amount);
    if (balance < splitAmount) {
      const accountName = accountDoc.data().name || split.fromAccountId;
      throw new Error(
        `Insufficient balance in "${accountName}"! Has ${balance.toFixed(2)} but needs ${splitAmount.toFixed(2)}.`
      );
    }
  }

  // All checks passed — apply in a batch
  const batch = writeBatch(db);
  const docIds = [];
  let toBalance = toAccountDoc.data().balance || 0;
  const sanitizedDesc = sanitizeString(splitData.description || "");

  for (let i = 0; i < splitData.splits.length; i++) {
    const split = splitData.splits[i];
    const splitAmount = Number(split.amount);
    const fromAccountRef = doc(
      db,
      "users",
      userId,
      "accounts",
      split.fromAccountId
    );
    const fromBalance = accountDocs[i].data().balance || 0;

    batch.update(fromAccountRef, { balance: fromBalance - splitAmount });
    toBalance += splitAmount;

    const docRef = doc(transactionsRef);
    docIds.push(docRef.id);
    batch.set(docRef, {
      type: "transfer",
      amount: splitAmount,
      fromAccountId: split.fromAccountId,
      toAccountId: splitData.toAccountId,
      date: Timestamp.fromDate(new Date(splitData.date)),
      description: sanitizedDesc,
      category: "Transfer (Split)",
      createdAt: Timestamp.now(),
    });
  }

  batch.update(toAccountRef, { balance: toBalance });
  await batch.commit();

  // Record one rate limit event for the whole split
  recordTransaction(userId);

  return docIds;
};

// ─── PAGINATED TRANSACTIONS ────────────────────────────────────
const DEFAULT_PAGE_SIZE = 25;

export const getUserTransactionsPaginated = async (
  userId,
  filters = {},
  pageSize = DEFAULT_PAGE_SIZE,
  lastDoc = null
) => {
  if (!userId) return { transactions: [], lastDoc: null, hasMore: false };

  try {
    const transactionsRef = collection(db, "users", userId, "transactions");

    // Build query with pagination
    const constraints = [orderBy("date", "desc"), firestoreLimit(pageSize + 1)];
    if (lastDoc) {
      constraints.push(startAfter(lastDoc));
    }

    const q = query(transactionsRef, ...constraints);
    const querySnapshot = await getDocs(q);

    let transactions = querySnapshot.docs.slice(0, pageSize).map((doc) => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate() || new Date(),
      amount: doc.data().amount || 0,
    }));

    const hasMore = querySnapshot.docs.length > pageSize;
    const newLastDoc = querySnapshot.docs[pageSize - 1] || null;

    // Client-side filters (for filters not supported by Firestore composite indexes)
    if (filters.type && filters.type !== "all") {
      transactions = transactions.filter((t) => t.type === filters.type);
    }

    if (filters.accountId) {
      transactions = transactions.filter(
        (t) =>
          t.fromAccountId === filters.accountId ||
          t.toAccountId === filters.accountId
      );
    }

    return { transactions, lastDoc: newLastDoc, hasMore };
  } catch (error) {
    console.error("Error getting transactions:", error);
    return { transactions: [], lastDoc: null, hasMore: false };
  }
};

// Backward-compatible: returns flat array (used by Dashboard, Transactions, Accounts)
export const getUserTransactions = async (userId, filters = {}) => {
  const result = await getUserTransactionsPaginated(userId, filters, 500);
  return result.transactions;
};

export const updateTransaction = async (userId, transactionId, updates) => {
  if (!userId || !transactionId)
    throw new Error("User ID and Transaction ID are required");

  // Sanitize text updates
  const sanitized = { ...updates };
  if (sanitized.description)
    sanitized.description = sanitizeString(sanitized.description);
  if (sanitized.category)
    sanitized.category = sanitizeString(sanitized.category);

  const transactionRef = doc(
    db,
    "users",
    userId,
    "transactions",
    transactionId
  );
  await updateDoc(transactionRef, sanitized);
};

export const deleteTransaction = async (userId, transactionId) => {
  if (!userId || !transactionId)
    throw new Error("User ID and Transaction ID are required");

  const transactionRef = doc(
    db,
    "users",
    userId,
    "transactions",
    transactionId
  );
  const transactionDoc = await getDoc(transactionRef);

  if (!transactionDoc.exists()) {
    throw new Error("Transaction not found");
  }

  const transaction = transactionDoc.data();

  if (transaction.type === "transfer") {
    const fromAccountRef = doc(
      db,
      "users",
      userId,
      "accounts",
      transaction.fromAccountId
    );
    const toAccountRef = doc(
      db,
      "users",
      userId,
      "accounts",
      transaction.toAccountId
    );

    // Fetch both accounts concurrently
    const [fromAccount, toAccount] = await Promise.all([
      getDoc(fromAccountRef),
      getDoc(toAccountRef),
    ]);

    const batch = writeBatch(db);
    batch.update(fromAccountRef, {
      balance: (fromAccount.data().balance || 0) + transaction.amount,
    });
    batch.update(toAccountRef, {
      balance: (toAccount.data().balance || 0) - transaction.amount,
    });
    await batch.commit();
  } else {
    const accountRef = doc(
      db,
      "users",
      userId,
      "accounts",
      transaction.fromAccountId
    );
    const account = await getDoc(accountRef);

    const adjustment =
      transaction.type === "income" ? -transaction.amount : transaction.amount;
    await updateDoc(accountRef, {
      balance: (account.data().balance || 0) + adjustment,
    });
  }

  await deleteDoc(transactionRef);
};

export const batchUpdateBalances = async (userId, operations) => {
  if (!userId) throw new Error("User ID is required");

  const batch = writeBatch(db);

  for (const op of operations) {
    const accountRef = doc(db, "users", userId, "accounts", op.accountId);
    batch.update(accountRef, { balance: op.newBalance });
  }

  await batch.commit();
};
