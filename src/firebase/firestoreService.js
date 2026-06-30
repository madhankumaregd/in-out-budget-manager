import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
  writeBatch,
  getDoc,
} from "firebase/firestore";
import { db } from "./firebase";

// USER PROFILE
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

  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, {
    ...profileData,
    updatedAt: Timestamp.now(),
  });
};

// ACCOUNTS
export const createAccount = async (userId, accountData) => {
  if (!userId) throw new Error("User ID is required");

  const accountsRef = collection(db, "users", userId, "accounts");
  const docRef = await addDoc(accountsRef, {
    name: accountData.name,
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

  const accountRef = doc(db, "users", userId, "accounts", accountId);
  await updateDoc(accountRef, updates);
};

export const deleteAccount = async (userId, accountId) => {
  if (!userId || !accountId)
    throw new Error("User ID and Account ID are required");

  const accountRef = doc(db, "users", userId, "accounts", accountId);
  await deleteDoc(accountRef);
};

// TRANSACTIONS
export const createTransaction = async (userId, transactionData) => {
  if (!userId) throw new Error("User ID is required");

  const transactionsRef = collection(db, "users", userId, "transactions");

  if (transactionData.type === "transfer") {
    const fromAccountRef = doc(
      db,
      "users",
      userId,
      "accounts",
      transactionData.fromAccountId,
    );
    const toAccountRef = doc(
      db,
      "users",
      userId,
      "accounts",
      transactionData.toAccountId,
    );

    const fromAccount = await getDoc(fromAccountRef);
    const toAccount = await getDoc(toAccountRef);

    const fromBalance = fromAccount.data().balance || 0;
    const transferAmount = Number(transactionData.amount);

    // Balance guard for transfer
    if (fromBalance < transferAmount) {
      throw new Error(
        `Insufficient balance! Account has ${fromBalance.toFixed(2)} but you tried to transfer ${transferAmount.toFixed(2)}.`,
      );
    }

    const docRef = await addDoc(transactionsRef, {
      type: "transfer",
      amount: transferAmount,
      fromAccountId: transactionData.fromAccountId,
      toAccountId: transactionData.toAccountId,
      date: Timestamp.fromDate(new Date(transactionData.date)),
      description: transactionData.description || "",
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

    return { id: docRef.id, ...transactionData };
  } else {
    const accountRef = doc(
      db,
      "users",
      userId,
      "accounts",
      transactionData.fromAccountId,
    );
    const account = await getDoc(accountRef);
    const currentBalance = account.data().balance || 0;
    const txAmount = Number(transactionData.amount);

    // Balance guard for expenses
    if (transactionData.type === "expense" && currentBalance < txAmount) {
      throw new Error(
        `Insufficient balance! Account has ${currentBalance.toFixed(2)} but you tried to spend ${txAmount.toFixed(2)}.`,
      );
    }

    const newBalance =
      transactionData.type === "income"
        ? currentBalance + txAmount
        : currentBalance - txAmount;

    const docRef = await addDoc(transactionsRef, {
      type: transactionData.type,
      amount: txAmount,
      category: transactionData.category,
      fromAccountId: transactionData.fromAccountId,
      date: Timestamp.fromDate(new Date(transactionData.date)),
      description: transactionData.description || "",
      createdAt: Timestamp.now(),
    });

    await updateDoc(accountRef, { balance: newBalance });

    return { id: docRef.id, ...transactionData };
  }
};

// Multi-account split transfer: splits a total amount across multiple source accounts
export const createSplitTransfer = async (userId, splitData) => {
  if (!userId) throw new Error("User ID is required");
  // splitData: { splits: [{fromAccountId, amount}], toAccountId, totalAmount, date, description }

  const transactionsRef = collection(db, "users", userId, "transactions");

  // Validate all source accounts have sufficient balance first
  for (const split of splitData.splits) {
    const accountRef = doc(db, "users", userId, "accounts", split.fromAccountId);
    const accountDoc = await getDoc(accountRef);
    const balance = accountDoc.data().balance || 0;
    const splitAmount = Number(split.amount);
    if (balance < splitAmount) {
      const accountName = accountDoc.data().name || split.fromAccountId;
      throw new Error(
        `Insufficient balance in "${accountName}"! Has ${balance.toFixed(2)} but needs ${splitAmount.toFixed(2)}.`,
      );
    }
  }

  // All checks passed — apply in a batch
  const batch = writeBatch(db);
  const docIds = [];

  const toAccountRef = doc(db, "users", userId, "accounts", splitData.toAccountId);
  const toAccountDoc = await getDoc(toAccountRef);
  let toBalance = toAccountDoc.data().balance || 0;

  for (const split of splitData.splits) {
    const splitAmount = Number(split.amount);
    const fromAccountRef = doc(db, "users", userId, "accounts", split.fromAccountId);
    const fromAccountDoc = await getDoc(fromAccountRef);
    const fromBalance = fromAccountDoc.data().balance || 0;

    batch.update(fromAccountRef, { balance: fromBalance - splitAmount });
    toBalance += splitAmount;

    // Create individual transaction record for each split
    const docRef = doc(transactionsRef);
    docIds.push(docRef.id);
    batch.set(docRef, {
      type: "transfer",
      amount: splitAmount,
      fromAccountId: split.fromAccountId,
      toAccountId: splitData.toAccountId,
      date: Timestamp.fromDate(new Date(splitData.date)),
      description: splitData.description || "",
      category: "Transfer (Split)",
      createdAt: Timestamp.now(),
    });
  }

  batch.update(toAccountRef, { balance: toBalance });
  await batch.commit();

  return docIds;
};

export const getUserTransactions = async (userId, filters = {}) => {
  if (!userId) return [];

  try {
    let transactionsRef = collection(db, "users", userId, "transactions");
    let q = query(transactionsRef, orderBy("date", "desc"));

    const querySnapshot = await getDocs(q);
    let transactions = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate() || new Date(),
      amount: doc.data().amount || 0,
    }));

    if (filters.type && filters.type !== "all") {
      transactions = transactions.filter((t) => t.type === filters.type);
    }

    if (filters.accountId) {
      transactions = transactions.filter(
        (t) =>
          t.fromAccountId === filters.accountId ||
          t.toAccountId === filters.accountId,
      );
    }

    return transactions;
  } catch (error) {
    console.error("Error getting transactions:", error);
    return [];
  }
};

export const updateTransaction = async (userId, transactionId, updates) => {
  if (!userId || !transactionId)
    throw new Error("User ID and Transaction ID are required");

  const transactionRef = doc(
    db,
    "users",
    userId,
    "transactions",
    transactionId,
  );
  await updateDoc(transactionRef, updates);
};

export const deleteTransaction = async (userId, transactionId) => {
  if (!userId || !transactionId)
    throw new Error("User ID and Transaction ID are required");

  const transactionRef = doc(
    db,
    "users",
    userId,
    "transactions",
    transactionId,
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
      transaction.fromAccountId,
    );
    const toAccountRef = doc(
      db,
      "users",
      userId,
      "accounts",
      transaction.toAccountId,
    );

    const fromAccount = await getDoc(fromAccountRef);
    const toAccount = await getDoc(toAccountRef);

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
      transaction.fromAccountId,
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
