// ─── RE-AUTHENTICATION GUARD ─────────────────────────────────────
// Forces password re-entry before high-impact destructive actions
// like "Delete All Users", password changes, etc.

import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  GoogleAuthProvider,
  reauthenticateWithPopup,
} from "firebase/auth";
import { auth } from "../firebase/firebase";

/**
 * Re-authenticate the current user with their password.
 * @param {string} password - The user's current password
 * @returns {Promise<boolean>} true if re-authentication succeeded
 * @throws {Error} if re-authentication fails
 */
export const reauthenticateWithPassword = async (password) => {
  const user = auth.currentUser;
  if (!user) throw new Error("No authenticated user. Please log in again.");
  if (!user.email) throw new Error("No email on current user.");

  const credential = EmailAuthProvider.credential(user.email, password);
  await reauthenticateWithCredential(user, credential);
  return true;
};

/**
 * Re-authenticate with Google popup.
 * Use for users who signed in with Google.
 * @returns {Promise<boolean>}
 */
export const reauthenticateWithGoogle = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error("No authenticated user. Please log in again.");

  const provider = new GoogleAuthProvider();
  await reauthenticateWithPopup(user, provider);
  return true;
};

/**
 * Check how long ago the user last authenticated.
 * Firebase tokens last ~1 hour, but for destructive ops we
 * require fresh re-auth within the last 5 minutes.
 * @returns {boolean} true if recent enough
 */
export const isRecentlyAuthenticated = () => {
  const user = auth.currentUser;
  if (!user?.metadata?.lastSignInTime) return false;

  const lastAuth = new Date(user.metadata.lastSignInTime).getTime();
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  return lastAuth > fiveMinutesAgo;
};
