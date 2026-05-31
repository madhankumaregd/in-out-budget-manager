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
    const docRef = await addDoc(transactionsRef, {
      type: "transfer",
      amount: Number(transactionData.amount),
      fromAccountId: transactionData.fromAccountId,
      toAccountId: transactionData.toAccountId,
      date: Timestamp.fromDate(new Date(transactionData.date)),
      description: transactionData.description || "",
      category: "Transfer",
      createdAt: Timestamp.now(),
    });

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

    const batch = writeBatch(db);
    batch.update(fromAccountRef, {
      balance:
        (fromAccount.data().balance || 0) - Number(transactionData.amount),
    });
    batch.update(toAccountRef, {
      balance: (toAccount.data().balance || 0) + Number(transactionData.amount),
    });
    await batch.commit();

    return { id: docRef.id, ...transactionData };
  } else {
    const docRef = await addDoc(transactionsRef, {
      type: transactionData.type,
      amount: Number(transactionData.amount),
      category: transactionData.category,
      fromAccountId: transactionData.fromAccountId,
      date: Timestamp.fromDate(new Date(transactionData.date)),
      description: transactionData.description || "",
      createdAt: Timestamp.now(),
    });

    const accountRef = doc(
      db,
      "users",
      userId,
      "accounts",
      transactionData.fromAccountId,
    );
    const account = await getDoc(accountRef);
    const currentBalance = account.data().balance || 0;

    const newBalance =
      transactionData.type === "income"
        ? currentBalance + Number(transactionData.amount)
        : currentBalance - Number(transactionData.amount);

    await updateDoc(accountRef, { balance: newBalance });

    return { id: docRef.id, ...transactionData };
  }
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
