// ─── DEVICE FINGERPRINT & REGISTRATION THROTTLE ─────────────────
// Generates a lightweight client fingerprint and tracks daily
// registration counts in Firestore to block mass account creation.
// Max 3 registrations per device per day.

import { doc, getDoc, setDoc, increment, Timestamp } from "firebase/firestore";
import { db } from "../firebase/firebase";

const MAX_DAILY_REGISTRATIONS = 3;

/**
 * Generate a lightweight device fingerprint by hashing browser
 * characteristics. This is NOT cryptographic — it's a cheap
 * abuse-deterrent, not a biometric identifier.
 * @returns {string} hex hash
 */
export const generateDeviceFingerprint = async () => {
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width + "x" + screen.height,
    screen.colorDepth,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.hardwareConcurrency || "unknown",
    navigator.maxTouchPoints || 0,
    navigator.platform || "unknown",
  ];

  // Canvas fingerprint (fast, no visible element)
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext("2d");
    ctx.textBaseline = "top";
    ctx.font = "14px Arial";
    ctx.fillStyle = "#f60";
    ctx.fillRect(0, 0, 200, 50);
    ctx.fillStyle = "#069";
    ctx.fillText("fp:budget-mgr", 2, 15);
    components.push(canvas.toDataURL().slice(-50));
  } catch {
    components.push("canvas-unavailable");
  }

  // Hash the concatenated string
  const raw = components.join("|");
  const encoder = new TextEncoder();
  const data = encoder.encode(raw);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
};

/**
 * Check if this device can register a new account today.
 * @returns {{ allowed: boolean, remaining: number, error?: string }}
 */
export const checkRegistrationLimit = async () => {
  try {
    const fingerprint = await generateDeviceFingerprint();
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const docId = `reg_${fingerprint.slice(0, 16)}_${today}`;
    const ref = doc(db, "rateLimits", docId);
    const snap = await getDoc(ref);

    const currentCount = snap.exists() ? snap.data().count || 0 : 0;

    if (currentCount >= MAX_DAILY_REGISTRATIONS) {
      return {
        allowed: false,
        remaining: 0,
        error:
          "Account creation limit reached for this device today (Max 3 accounts per day). Please try again tomorrow.",
      };
    }

    return {
      allowed: true,
      remaining: MAX_DAILY_REGISTRATIONS - currentCount,
    };
  } catch (error) {
    // If fingerprinting or Firestore fails, allow registration
    // but log the error. Don't block legitimate users.
    console.warn("Registration limit check failed:", error);
    return { allowed: true, remaining: MAX_DAILY_REGISTRATIONS };
  }
};

/**
 * Record a successful registration for this device.
 * Call AFTER createUserWithEmailAndPassword succeeds.
 */
export const recordRegistration = async () => {
  try {
    const fingerprint = await generateDeviceFingerprint();
    const today = new Date().toISOString().split("T")[0];
    const docId = `reg_${fingerprint.slice(0, 16)}_${today}`;
    const ref = doc(db, "rateLimits", docId);

    const snap = await getDoc(ref);
    if (snap.exists()) {
      await setDoc(ref, { count: increment(1) }, { merge: true });
    } else {
      await setDoc(ref, {
        count: 1,
        fingerprint: fingerprint.slice(0, 16),
        date: today,
        createdAt: Timestamp.now(),
      });
    }
  } catch (error) {
    console.warn("Failed to record registration:", error);
  }
};
