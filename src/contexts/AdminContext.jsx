import { createContext, useContext, useState, useEffect } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signInAnonymously,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "../firebase/firebase";

const AdminContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useAdmin = () => useContext(AdminContext);

const SESSION_KEY = "admin_session";
const SESSION_DURATION = 2 * 60 * 60 * 1000; // 2 hours

export const AdminProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [firebaseUser, setFirebaseUser] = useState(null);

  // Listen for Firebase auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
    });
    return unsubscribe;
  }, []);

  // Check for existing admin session (valid for 2 hours)
  useEffect(() => {
    const session = localStorage.getItem(SESSION_KEY);
    if (session) {
      try {
        const { timestamp } = JSON.parse(session);
        if (Date.now() - timestamp < SESSION_DURATION) {
          setIsAuthenticated(true);
          if (!auth.currentUser) {
            signInAnonymously(auth).catch(() => {});
          }
        } else {
          localStorage.removeItem(SESSION_KEY);
          setIsAuthenticated(false);
        }
      } catch {
        localStorage.removeItem(SESSION_KEY);
        setIsAuthenticated(false);
      }
    } else {
      setIsAuthenticated(false);
    }
    setIsLoading(false);
  }, []);

  /**
   * Admin login: checks master admin password or Firebase Auth credentials
   */
  const login = async ({ email, password }) => {
    // 1. Check master admin password (default: admin123 or configured in adminConfig)
    let isMasterPass = password === "admin123";
    try {
      const settingsSnap = await getDoc(doc(db, "adminConfig", "settings"));
      if (settingsSnap.exists() && settingsSnap.data()?.adminPassword) {
        if (password === settingsSnap.data().adminPassword) {
          isMasterPass = true;
        }
      }
    } catch {
      // Ignore read error
    }

    if (isMasterPass) {
      try {
        if (!auth.currentUser) {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.warn("signInAnonymously fallback note:", err.message);
      }
      setIsAuthenticated(true);
      localStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          timestamp: Date.now(),
          email: email || auth.currentUser?.email || "admin@system.local",
        })
      );
      return { email: email || "admin@system.local" };
    }

    // 2. Fall back to Firebase Auth credentials
    try {
      const res = await signInWithEmailAndPassword(auth, email, password);
      setIsAuthenticated(true);
      localStorage.setItem(
        SESSION_KEY,
        JSON.stringify({ timestamp: Date.now(), email: res.user.email })
      );
      return res.user;
    } catch (err) {
      if (
        err.code === "auth/user-not-found" ||
        err.code === "auth/wrong-password" ||
        err.code === "auth/invalid-credential"
      ) {
        throw new Error("Invalid email or password");
      }
      throw new Error("Authentication failed: " + err.message);
    }
  };

  /**
   * Google Sign-in for admin
   */
  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const res = await signInWithPopup(auth, provider);
      setIsAuthenticated(true);
      localStorage.setItem(
        SESSION_KEY,
        JSON.stringify({ timestamp: Date.now(), email: res.user.email })
      );
      return res.user;
    } catch (err) {
      throw new Error(err.message || "Google sign-in failed");
    }
  };

  /**
   * Instant enter if already logged into Firebase in this browser
   */
  const enterAsCurrentUser = () => {
    if (firebaseUser) {
      setIsAuthenticated(true);
      localStorage.setItem(
        SESSION_KEY,
        JSON.stringify({ timestamp: Date.now(), email: firebaseUser.email })
      );
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem(SESSION_KEY);
  };

  return (
    <AdminContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        firebaseUser,
        login,
        loginWithGoogle,
        enterAsCurrentUser,
        logout,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
};
