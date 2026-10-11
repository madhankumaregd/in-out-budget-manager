import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// ─── Firestore with Persistent Local Cache ─────────────────────
// Data loads instantly (0ms) from IndexedDB on revisits, then
// syncs with server in background. Multi-tab safe.
// Safely handled for Vite HMR re-evaluations.
let firestoreDb;
try {
  firestoreDb = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });
} catch {
  firestoreDb = getFirestore(app);
}

export const db = firestoreDb;

// ─── Firebase Auth ──────────────────────────────────────────────
export const auth = getAuth(app);

// ─── Firebase App Check (reCAPTCHA v3) ──────────────────────────
// Verifies requests come from your real app, blocks bots & scripts.
// Set VITE_RECAPTCHA_SITE_KEY in your .env file.
// In development, set self.FIREBASE_APPCHECK_DEBUG_TOKEN = true
// in your browser console to bypass.
const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
if (recaptchaSiteKey) {
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(recaptchaSiteKey),
    isTokenAutoRefreshEnabled: true,
  });
}

export default app;
