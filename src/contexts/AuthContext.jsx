import { createContext, useContext, useState, useEffect } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  sendEmailVerification,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  linkWithPhoneNumber,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase/firebase";
import {
  checkRegistrationLimit,
  recordRegistration,
} from "../utils/deviceFingerprint";

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
    // ── Device Registration Throttle ──
    // Max 3 accounts per device per day
    const regCheck = await checkRegistrationLimit();
    if (!regCheck.allowed) {
      throw new Error(regCheck.error);
    }

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

    // Send email verification
    await sendEmailVerification(userCredential.user);

    // Record successful registration for device throttling
    await recordRegistration();

    return userCredential;
  };

  const login = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const googleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    
    // Check if user document exists, if not create it
    const userDocRef = doc(db, "users", result.user.uid);
    const userDocSnap = await getDoc(userDocRef);
    
    if (!userDocSnap.exists()) {
      // Google sign-in also counts toward device registration limit
      const regCheck = await checkRegistrationLimit();
      if (!regCheck.allowed) {
        // Sign out the newly-created Google user
        await signOut(auth);
        throw new Error(regCheck.error);
      }

      await setDoc(userDocRef, {
        email: result.user.email,
        displayName: result.user.displayName,
        createdAt: new Date(),
        currency: "INR",
        currencySymbol: "₹",
      });

      await recordRegistration();
    }
    return result;
  };

  const setupRecaptcha = (containerId) => {
    // Clear old recaptcha if it exists
    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
      window.recaptchaVerifier = null;
    }
    window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: "invisible",
    });
    return window.recaptchaVerifier;
  };

  const linkPhone = (phone, recaptchaVerifier) => {
    return linkWithPhoneNumber(auth.currentUser, phone, recaptchaVerifier);
  };

  const sendPhoneOtp = (phone, recaptchaVerifier) => {
    return signInWithPhoneNumber(auth, phone, recaptchaVerifier);
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
    googleSignIn,
    setupRecaptcha,
    linkPhone,
    sendPhoneOtp,
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
