import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  addDoc,
  updateDoc,
  Timestamp,
  orderBy,
  limit,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyBvoQmmzWwjGqfhIVKBiE8ridGEOdjAnoo",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "in-out-budget-manager.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "in-out-budget-manager",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "in-out-budget-manager.firebasestorage.app",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "261710938232",
  appId: process.env.VITE_FIREBASE_APP_ID || "1:261710938232:web:256cfd1a4588756e21ad8d",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

// Helper for CORS headers
const setCors = (res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-api-key");
};

// Validate and authenticate API Key
const authenticateKey = async (req) => {
  const headerKey = req.headers["x-api-key"] || 
    (req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.slice(7) : null);

  if (!headerKey) {
    return { error: "Missing API key in 'x-api-key' or 'Authorization: Bearer <key>' header", status: 401 };
  }

  const q = query(collection(db, "apiKeys"), where("key", "==", headerKey.trim()));
  const snap = await getDocs(q);

  if (snap.empty) {
    return { error: "Invalid API key", status: 401 };
  }

  const keyDoc = snap.docs[0];
  const keyData = keyDoc.data();

  if (!keyData.isActive) {
    return { error: "API key has been deactivated or revoked", status: 403 };
  }

  // Record usage count and lastUsed timestamp asynchronously
  try {
    await updateDoc(keyDoc.ref, {
      usageCount: (keyData.usageCount || 0) + 1,
      lastUsed: Timestamp.now(),
    });
  } catch (_) {}

  return { key: keyData, id: keyDoc.id };
};

export default async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const auth = await authenticateKey(req);
    if (auth.error) {
      return res.status(auth.status).json({ success: false, error: auth.error });
    }

    const { url, method } = req;
    const permissions = auth.key.permissions || ["read"];
    const hasRead = permissions.includes("read") || permissions.includes("admin");
    const hasWrite = permissions.includes("write") || permissions.includes("admin");

    // Parse URL params or query
    const parsedUrl = new URL(url, "http://localhost");
    const endpoint = parsedUrl.pathname.replace(/^\/api\/?/, "");
    const userId = parsedUrl.searchParams.get("userId") || req.body?.userId;

    // ── Health/Verify Endpoint ──
    if (endpoint === "verify" || endpoint === "") {
      return res.status(200).json({
        success: true,
        message: "API Key authenticated successfully",
        keyName: auth.key.name,
        permissions: auth.key.permissions,
        rateLimit: auth.key.rateLimit,
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameter 'userId'. Pass it as query param ?userId=... or in JSON body.",
      });
    }

    // ── Transactions Endpoints ──
    if (endpoint === "transactions") {
      if (method === "GET") {
        if (!hasRead) {
          return res.status(403).json({ success: false, error: "API key does not have 'read' permission" });
        }

        const maxResults = Math.min(Number(parsedUrl.searchParams.get("limit") || 50), 100);
        const txSnap = await getDocs(
          query(collection(db, "users", userId, "transactions"), orderBy("date", "desc"), limit(maxResults))
        );

        const transactions = txSnap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            date: data.date?.toDate?.()?.toISOString() || null,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
          };
        });

        return res.status(200).json({ success: true, count: transactions.length, transactions });
      }

      if (method === "POST") {
        if (!hasWrite) {
          return res.status(403).json({ success: false, error: "API key does not have 'write' permission" });
        }

        const { type, amount, category, fromAccountId, toAccountId, description, date } = req.body || {};

        if (!type || !["income", "expense", "transfer"].includes(type)) {
          return res.status(400).json({ success: false, error: "Invalid type. Must be 'income', 'expense', or 'transfer'" });
        }

        const parsedAmount = Number(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0 || parsedAmount > 10000000) {
          return res.status(400).json({ success: false, error: "Amount must be between 0 and 10,000,000" });
        }

        if (!fromAccountId) {
          return res.status(400).json({ success: false, error: "fromAccountId is required" });
        }

        // Verify account existence and balance
        const fromAccRef = doc(db, "users", userId, "accounts", fromAccountId);
        const fromAccSnap = await getDoc(fromAccRef);
        if (!fromAccSnap.exists()) {
          return res.status(404).json({ success: false, error: `Account '${fromAccountId}' not found` });
        }

        const fromBalance = Number(fromAccSnap.data()?.balance) || 0;
        if ((type === "expense" || type === "transfer") && fromBalance < parsedAmount) {
          return res.status(400).json({
            success: false,
            error: `Insufficient balance in account. Current: ${fromBalance}, Required: ${parsedAmount}`,
          });
        }

        // Create transaction document
        const txDoc = await addDoc(collection(db, "users", userId, "transactions"), {
          type,
          amount: parsedAmount,
          category: String(category || "API Transaction").trim().replace(/<[^>]*>/g, ""),
          fromAccountId,
          toAccountId: type === "transfer" ? toAccountId : null,
          description: String(description || "External API").trim().replace(/<[^>]*>/g, ""),
          date: date ? Timestamp.fromDate(new Date(date)) : Timestamp.now(),
          createdAt: Timestamp.now(),
        });

        // Update account balances
        if (type === "income") {
          await updateDoc(fromAccRef, { balance: fromBalance + parsedAmount });
        } else if (type === "expense") {
          await updateDoc(fromAccRef, { balance: fromBalance - parsedAmount });
        } else if (type === "transfer" && toAccountId) {
          const toAccRef = doc(db, "users", userId, "accounts", toAccountId);
          const toAccSnap = await getDoc(toAccRef);
          if (toAccSnap.exists()) {
            const toBalance = Number(toAccSnap.data()?.balance) || 0;
            await updateDoc(fromAccRef, { balance: fromBalance - parsedAmount });
            await updateDoc(toAccRef, { balance: toBalance + parsedAmount });
          }
        }

        return res.status(201).json({
          success: true,
          message: "Transaction created successfully via API",
          transactionId: txDoc.id,
        });
      }
    }

    // ── Accounts Endpoints ──
    if (endpoint === "accounts") {
      if (method === "GET") {
        if (!hasRead) {
          return res.status(403).json({ success: false, error: "API key does not have 'read' permission" });
        }

        const accSnap = await getDocs(collection(db, "users", userId, "accounts"));
        const accounts = accSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        return res.status(200).json({ success: true, count: accounts.length, accounts });
      }

      if (method === "POST") {
        if (!hasWrite) {
          return res.status(403).json({ success: false, error: "API key does not have 'write' permission" });
        }

        const { name, type = "bank", initialBalance = 0, currency = "INR" } = req.body || {};
        if (!name) {
          return res.status(400).json({ success: false, error: "Account name is required" });
        }

        const accDoc = await addDoc(collection(db, "users", userId, "accounts"), {
          name: String(name).trim().replace(/<[^>]*>/g, ""),
          type,
          balance: Number(initialBalance) || 0,
          currency,
          createdAt: Timestamp.now(),
        });

        return res.status(201).json({
          success: true,
          message: "Account created successfully via API",
          accountId: accDoc.id,
        });
      }
    }

    // ── Summary Endpoint ──
    if (endpoint === "summary") {
      if (!hasRead) {
        return res.status(403).json({ success: false, error: "API key does not have 'read' permission" });
      }

      const [accSnap, txSnap] = await Promise.all([
        getDocs(collection(db, "users", userId, "accounts")),
        getDocs(query(collection(db, "users", userId, "transactions"), orderBy("date", "desc"), limit(100))),
      ]);

      const totalBalance = accSnap.docs.reduce((sum, d) => sum + (Number(d.data()?.balance) || 0), 0);
      let totalIncome = 0;
      let totalExpense = 0;

      txSnap.docs.forEach((d) => {
        const data = d.data();
        if (data.type === "income") totalIncome += Number(data.amount) || 0;
        if (data.type === "expense") totalExpense += Number(data.amount) || 0;
      });

      return res.status(200).json({
        success: true,
        summary: {
          totalBalance,
          recentIncome: totalIncome,
          recentExpense: totalExpense,
          accountCount: accSnap.size,
          transactionCount: txSnap.size,
        },
      });
    }

    return res.status(404).json({
      success: false,
      error: `Endpoint '${endpoint}' not found. Available endpoints: /api/verify, /api/transactions, /api/accounts, /api/summary`,
    });
  } catch (error) {
    console.error("API Handler Error:", error);
    return res.status(500).json({ success: false, error: error.message || "Internal server error" });
  }
}

