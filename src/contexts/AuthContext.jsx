import { createContext, useContext, useState, useEffect } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase/firebase";

const AuthContext = createContext();

export const getCurrencySymbol = (currency) => {
  const symbols = { INR: "₹", USD: "$", EUR: "€", GBP: "£" };
  return symbols[currency] || currency || "₹";
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const signup = async (email, password, displayName = "") => {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password,
    );

    // Update display name in auth
    if (displayName) {
      await updateProfile(userCredential.user, { displayName });
    }

    // Create user document in Firestore
    await setDoc(doc(db, "users", userCredential.user.uid), {
      email: email,
      displayName: displayName || email.split("@")[0],
      createdAt: new Date(),
      currency: "INR",
      currencySymbol: "₹",
    });

    return userCredential;
  };

  const login = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const logout = () => signOut(auth);

  const resetPassword = (email) => sendPasswordResetEmail(auth, email);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        // Fetch user profile from Firestore
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setUserProfile(userDoc.data());
        } else {
          setUserProfile({
            displayName: user.email?.split("@")[0],
            email: user.email,
          });
        }
      } else {
        setUserProfile(null);
      }

      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const currencySymbol = getCurrencySymbol(userProfile?.currency);

  const value = {
    currentUser,
    userProfile,
    setUserProfile,
    currencySymbol,
    signup,
    login,
    logout,
    resetPassword,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
