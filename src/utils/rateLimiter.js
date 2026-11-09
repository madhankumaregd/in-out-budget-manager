// ─── TRANSACTION RATE LIMITER (Web) ──────────────────────────────────
// Security rule: If more than 20 transactions are added within 30 minutes,
// temporarily restrict the user from adding transactions for the next 1 hour.

const WINDOW_MS = 30 * 60 * 1000;       // 30 minutes
const MAX_ACTIONS = 20;                 // Max 20 transactions
const LOCKOUT_MS = 60 * 60 * 1000;       // 1 hour lockout

/**
 * Helper to get user's stored rate limit state from localStorage
 * @param {string} userId
 * @returns {{ timestamps: number[], restrictedUntil: number }}
 */
const getStoredState = (userId) => {
  if (typeof window === "undefined" || !window.localStorage) {
    return { timestamps: [], restrictedUntil: 0 };
  }
  try {
    const raw = window.localStorage.getItem(`tx_rate_limit_${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        timestamps: Array.isArray(parsed.timestamps) ? parsed.timestamps : [],
        restrictedUntil: typeof parsed.restrictedUntil === "number" ? parsed.restrictedUntil : 0,
      };
    }
  } catch (_) {}
  return { timestamps: [], restrictedUntil: 0 };
};

/**
 * Helper to persist user's rate limit state
 * @param {string} userId
 * @param {{ timestamps: number[], restrictedUntil: number }} state
 */
const saveState = (userId, state) => {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(`tx_rate_limit_${userId}`, JSON.stringify(state));
  } catch (_) {}
};

/**
 * Format remaining milliseconds into a human-friendly duration.
 * @param {number} ms
 * @returns {string}
 */
export const formatCooldown = (ms) => {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
};

/**
 * Check if a user can add a transaction right now.
 * @param {string} userId
 * @returns {{ allowed: boolean, retryAfterMs: number, remaining: number, error?: string }}
 */
export const checkTransactionRate = (userId) => {
  if (!userId) return { allowed: true, retryAfterMs: 0, remaining: MAX_ACTIONS };

  const now = Date.now();
  const state = getStoredState(userId);

  // 1. Check if user is actively in lockout
  if (state.restrictedUntil > now) {
    const remainingMs = state.restrictedUntil - now;
    return {
      allowed: false,
      retryAfterMs: remainingMs,
      remaining: 0,
      error: `Security Restriction: You exceeded 20 transactions within 30 minutes. Adding transactions is restricted for the next 1 hour. Please retry in ${formatCooldown(remainingMs)}.`,
    };
  }

  // 2. Filter timestamps strictly within the 30-minute sliding window
  const cutoff = now - WINDOW_MS;
  const recentTimestamps = state.timestamps.filter((t) => t > cutoff);

  // Update storage with cleaned timestamps if expired ones were dropped
  if (recentTimestamps.length !== state.timestamps.length || state.restrictedUntil > 0) {
    saveState(userId, { timestamps: recentTimestamps, restrictedUntil: 0 });
  }

  // 3. Check if current transaction would exceed the threshold
  if (recentTimestamps.length >= MAX_ACTIONS) {
    const restrictedUntil = now + LOCKOUT_MS;
    saveState(userId, { timestamps: recentTimestamps, restrictedUntil });
    return {
      allowed: false,
      retryAfterMs: LOCKOUT_MS,
      remaining: 0,
      error: `Security Restriction: You have added more than 20 transactions within 30 minutes. Adding transactions is restricted for the next 1 hour. Please retry in ${formatCooldown(LOCKOUT_MS)}.`,
    };
  }

  return {
    allowed: true,
    retryAfterMs: 0,
    remaining: MAX_ACTIONS - recentTimestamps.length,
  };
};

/**
 * Record a successful transaction for rate limiting.
 * @param {string} userId
 */
export const recordTransaction = (userId) => {
  if (!userId) return;

  const now = Date.now();
  const cutoff = now - WINDOW_MS;
  const state = getStoredState(userId);

  const updatedTimestamps = state.timestamps.filter((t) => t > cutoff);
  updatedTimestamps.push(now);

  let restrictedUntil = state.restrictedUntil;
  if (updatedTimestamps.length > MAX_ACTIONS) {
    restrictedUntil = now + LOCKOUT_MS;
  }

  saveState(userId, { timestamps: updatedTimestamps, restrictedUntil });
};
