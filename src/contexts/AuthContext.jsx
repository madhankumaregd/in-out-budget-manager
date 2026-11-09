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
import { doc, setDoc, getDoc, onSnapshot, collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../firebase/firebase";
import {
  checkRegistrationLimit,
  recordRegistration,
} from "../utils/deviceFingerprint";
import toast from "react-hot-toast";

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
  const [authorizedAdmins, setAuthorizedAdmins] = useState(["egdmadhankumar@gmail.com"]);

  // Real-time synchronization of authorized admins list
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "adminConfig", "settings"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const primary = (data.primaryAdmin || "egdmadhankumar@gmail.com").toLowerCase().trim();
        const list = Array.isArray(data.adminEmails)
          ? data.adminEmails.map((e) => e.toLowerCase().trim())
          : [primary];
        if (!list.includes(primary)) list.push(primary);
        setAuthorizedAdmins(list);
      }
    }, () => {});
    return unsub;
  }, []);

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

  const resetPassword = async (email) => {
    if (!email) throw new Error("Please enter your email address");
    const cleanEmail = email.toLowerCase().trim();

    // Check if user is disabled/restricted in Firestore
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", cleanEmail));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const uDoc = snap.docs[0];
        const data = uDoc.data();
        if (data.status === "disabled" || data.disabled === true) {
          throw new Error("Your ID is restricted");
        }
      }
    } catch (err) {
      if (err.message === "Your ID is restricted") {
        throw err;
      }
    }

    return sendPasswordResetEmail(auth, cleanEmail);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        // Fetch user profile from Firestore
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const profileData = userDoc.data();
          // Check if administrator has disabled this user
          if (profileData.status === "disabled" || profileData.disabled === true) {
            await signOut(auth);
            setCurrentUser(null);
            setUserProfile(null);
            setLoading(false);
            toast.error(
              "Your account has been disabled by administrator (egdmadhankumar@gmail.com). Access is restricted.",
              { duration: 6000 }
            );
            return;
          }
          setUserProfile(profileData);
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

  const cleanEmail = (currentUser?.email || userProfile?.email || "").toLowerCase().trim();
  const isAdmin =
    cleanEmail === "egdmadhankumar@gmail.com" ||
    userProfile?.role === "admin" ||
    authorizedAdmins.includes(cleanEmail);

  const value = {
    currentUser,
    userProfile,
    setUserProfile,
    currencySymbol,
    isAdmin,
    authorizedAdmins,
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
