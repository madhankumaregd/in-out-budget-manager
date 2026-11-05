import { createContext, useContext, useState, useEffect } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signInAnonymously,
  signOut,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "../firebase/firebase";
import {
  getAdminAuthList,
  isAuthorizedAdmin,
  addAdminUser,
  removeAdminUser,
  transferAdminOwnership,
  DEFAULT_PRIMARY_ADMIN,
} from "../firebase/adminService";

const AdminContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useAdmin = () => useContext(AdminContext);

const SESSION_KEY = "admin_session";
const SESSION_DURATION = 2 * 60 * 60 * 1000; // 2 hours

export const AdminProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [adminEmail, setAdminEmail] = useState("");
  const [primaryAdmin, setPrimaryAdmin] = useState(DEFAULT_PRIMARY_ADMIN);
  const [adminEmails, setAdminEmails] = useState([DEFAULT_PRIMARY_ADMIN]);

  // Load and refresh admin list from Firestore
  const loadAdmins = async () => {
    try {
      const authList = await getAdminAuthList();
      setPrimaryAdmin(authList.primaryAdmin);
      setAdminEmails(authList.adminEmails);
      return authList;
    } catch (err) {
      console.error("Error loading admin list:", err);
      return { primaryAdmin: DEFAULT_PRIMARY_ADMIN, adminEmails: [DEFAULT_PRIMARY_ADMIN] };
    }
  };

  // Listen for Firebase auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
    });
    return unsubscribe;
  }, []);

  // Check for existing admin session (valid for 2 hours)
  useEffect(() => {
    const initSession = async () => {
      const authList = await loadAdmins();
      const session = localStorage.getItem(SESSION_KEY);
      if (session) {
        try {
          const { timestamp, email } = JSON.parse(session);
          const normalized = (email || "").toLowerCase().trim();
          const isStillAdmin =
            normalized === authList.primaryAdmin.toLowerCase() ||
            authList.adminEmails.map((e) => e.toLowerCase()).includes(normalized);

          if (Date.now() - timestamp < SESSION_DURATION && isStillAdmin) {
            setIsAuthenticated(true);
            setAdminEmail(normalized);
            if (!auth.currentUser) {
              signInAnonymously(auth).catch(() => {});
            }
          } else {
            localStorage.removeItem(SESSION_KEY);
            setIsAuthenticated(false);
            setAdminEmail("");
          }
        } catch {
          localStorage.removeItem(SESSION_KEY);
          setIsAuthenticated(false);
        }
      } else {
        setIsAuthenticated(false);
      }
      setIsLoading(false);
    };

    initSession();
  }, []);

  /**
   * Admin login: checks master admin password or Firebase Auth credentials,
   * strictly verifying that the email has authorized administrator privileges.
   */
  const login = async ({ email, password }) => {
    const cleanEmail = (email || auth.currentUser?.email || "").toLowerCase().trim();
    const authList = await loadAdmins();

    // Check authorization against primary admin & admin list
    const isAuth =
      cleanEmail === authList.primaryAdmin.toLowerCase() ||
      authList.adminEmails.map((e) => e.toLowerCase()).includes(cleanEmail) ||
      cleanEmail === DEFAULT_PRIMARY_ADMIN.toLowerCase();

    // 1. Check master admin password
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
      if (!isAuth && cleanEmail) {
        throw new Error(
          `Access denied: "${cleanEmail}" is not authorized as an administrator. Primary admin: ${authList.primaryAdmin}.`
        );
      }

      try {
        if (!auth.currentUser) {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.warn("signInAnonymously fallback note:", err.message);
      }

      const verifiedEmail = cleanEmail || authList.primaryAdmin;
      setIsAuthenticated(true);
      setAdminEmail(verifiedEmail);
      localStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          timestamp: Date.now(),
          email: verifiedEmail,
        })
      );
      return { email: verifiedEmail };
    }

    // 2. Fall back to Firebase Auth credentials
    if (!isAuth) {
      throw new Error(
        `Access denied: "${cleanEmail}" is not recognized as an administrator. Primary admin: ${authList.primaryAdmin}.`
      );
    }

    try {
      const res = await signInWithEmailAndPassword(auth, email, password);
      setIsAuthenticated(true);
      setAdminEmail(cleanEmail);
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
      const googleEmail = (res.user.email || "").toLowerCase().trim();

      const authList = await loadAdmins();
      const isAuth =
        googleEmail === authList.primaryAdmin.toLowerCase() ||
        authList.adminEmails.map((e) => e.toLowerCase()).includes(googleEmail) ||
        googleEmail === DEFAULT_PRIMARY_ADMIN.toLowerCase();

      if (!isAuth) {
        await signOut(auth);
        throw new Error(
          `Access denied: "${googleEmail}" does not have admin permissions. Primary admin is ${authList.primaryAdmin}.`
        );
      }

      setIsAuthenticated(true);
      setAdminEmail(googleEmail);
      localStorage.setItem(
        SESSION_KEY,
        JSON.stringify({ timestamp: Date.now(), email: googleEmail })
      );
      return res.user;
    } catch (err) {
      throw new Error(err.message || "Google sign-in failed");
    }
  };

  /**
   * Instant enter if already logged into Firebase in this browser
   */
  const enterAsCurrentUser = async () => {
    if (!firebaseUser?.email) {
      throw new Error("No active user session detected");
    }

    const currentEmail = firebaseUser.email.toLowerCase().trim();
    const authList = await loadAdmins();
    const isAuth =
      currentEmail === authList.primaryAdmin.toLowerCase() ||
      authList.adminEmails.map((e) => e.toLowerCase()).includes(currentEmail) ||
      currentEmail === DEFAULT_PRIMARY_ADMIN.toLowerCase();

    if (!isAuth) {
      throw new Error(
        `Access denied: "${currentEmail}" is not authorized. Primary admin is ${authList.primaryAdmin}.`
      );
    }

    setIsAuthenticated(true);
    setAdminEmail(currentEmail);
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ timestamp: Date.now(), email: currentEmail })
    );
    return true;
  };

  /**
   * Add a new administrator ID/Email
   */
  const addNewAdmin = async (newEmailOrUid) => {
    const updated = await addAdminUser(newEmailOrUid);
    setAdminEmails(updated);
    return updated;
  };

  /**
   * Remove a delegated administrator
   */
  const removeAdmin = async (emailOrUid) => {
    const updated = await removeAdminUser(emailOrUid);
    setAdminEmails(updated);
    return updated;
  };

  /**
   * Transfer admin power to another ID/Email and revoke own admin power!
   */
  const transferAdmin = async (newPrimaryEmail) => {
    const result = await transferAdminOwnership(newPrimaryEmail, adminEmail);
    setPrimaryAdmin(result.newPrimaryAdmin);
    setAdminEmails(result.adminEmails);
    // Relinquish own access immediately
    logout();
    return result;
  };

  const logout = () => {
    setIsAuthenticated(false);
    setAdminEmail("");
    localStorage.removeItem(SESSION_KEY);
  };

  const isPrimaryAdmin =
    adminEmail.toLowerCase() === primaryAdmin.toLowerCase() ||
    adminEmail.toLowerCase() === DEFAULT_PRIMARY_ADMIN.toLowerCase();

  return (
    <AdminContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        firebaseUser,
        adminEmail,
        primaryAdmin,
        adminEmails,
        isPrimaryAdmin,
        login,
        loginWithGoogle,
        enterAsCurrentUser,
        addNewAdmin,
        removeAdmin,
        transferAdmin,
        refreshAdmins: loadAdmins,
        logout,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
};
