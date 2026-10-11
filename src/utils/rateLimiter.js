// ─── TRANSACTION RATE LIMITER ──────────────────────────────────
// Sliding-window token bucket: max 10 transactions per 60 seconds.

const WINDOW_MS = 60 * 1000;  // 60 seconds
const MAX_ACTIONS = 10;

/** @type {Map<string, number[]>} userId → array of timestamps */
const windows = new Map();

/**
 * Check if a user can perform a transaction right now.
 * @param {string} userId
 * @returns {{ allowed: boolean, retryAfterMs: number, remaining: number }}
 */
export const checkTransactionRate = (userId) => {
  const now = Date.now();
  const cutoff = now - WINDOW_MS;

  // Get or create window
  let timestamps = windows.get(userId) || [];

  // Evict expired entries
  timestamps = timestamps.filter((t) => t > cutoff);
  windows.set(userId, timestamps);

  if (timestamps.length >= MAX_ACTIONS) {
    // Cooldown = time until the oldest entry expires
    const oldestInWindow = timestamps[0];
    const retryAfterMs = oldestInWindow + WINDOW_MS - now;
    return {
      allowed: false,
      retryAfterMs: Math.max(retryAfterMs, 0),
      remaining: 0,
    };
  }

  return {
    allowed: true,
    retryAfterMs: 0,
    remaining: MAX_ACTIONS - timestamps.length,
  };
};

/**
 * Record that a transaction just happened.
 * Call this AFTER the transaction succeeds.
 * @param {string} userId
 */
export const recordTransaction = (userId) => {
  const now = Date.now();
  const cutoff = now - WINDOW_MS;

  let timestamps = windows.get(userId) || [];
  timestamps = timestamps.filter((t) => t > cutoff);
  timestamps.push(now);
  windows.set(userId, timestamps);
};

/**
 * Format the retry cooldown into a human-friendly string.
 * @param {number} ms
 * @returns {string}
 */
export const formatCooldown = (ms) => {
  const seconds = Math.ceil(ms / 1000);
  return seconds <= 60 ? `${seconds}s` : `${Math.ceil(seconds / 60)}m`;
};
