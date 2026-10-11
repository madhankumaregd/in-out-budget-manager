// ─── INPUT SANITIZER (XSS Prevention) ──────────────────────────
// Strips HTML tags, script injections, and dangerous characters
// from user text inputs before writing to Firestore.

const DANGEROUS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<\/?\w+[^>]*>/g,               // HTML tags
  /javascript\s*:/gi,             // javascript: protocol
  /on\w+\s*=\s*["'][^"']*["']/gi, // inline event handlers
  /data\s*:\s*text\/html/gi,      // data: URIs
  /expression\s*\(/gi,            // CSS expression()
  /url\s*\(/gi,                   // CSS url()
  /&\s*{/g,                       // LESS/SCSS injection
];

/**
 * Sanitize a single string value.
 * Strips HTML tags and dangerous patterns, trims whitespace.
 * @param {string} input
 * @returns {string}
 */
export const sanitizeString = (input) => {
  if (typeof input !== "string") return input;

  let clean = input;

  // Strip all dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    clean = clean.replace(pattern, "");
  }

  // Encode remaining special HTML entities
  clean = clean
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");

  return clean.trim();
};

/**
 * Sanitize all string values in an object (shallow).
 * Non-string values are passed through unchanged.
 * @param {Object} obj
 * @returns {Object}
 */
export const sanitizeObject = (obj) => {
  if (!obj || typeof obj !== "object") return obj;

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    sanitized[key] = typeof value === "string" ? sanitizeString(value) : value;
  }
  return sanitized;
};

/**
 * Validate a transaction amount.
 * Must be a positive finite number.
 * @param {*} amount
 * @returns {{ valid: boolean, value: number, error?: string }}
 */
export const validateAmount = (amount) => {
  const num = Number(amount);
  if (isNaN(num) || !isFinite(num)) {
    return { valid: false, value: 0, error: "Amount must be a valid number" };
  }
  if (num <= 0) {
    return { valid: false, value: 0, error: "Amount must be greater than zero" };
  }
  if (num > 999_999_999) {
    return { valid: false, value: 0, error: "Amount exceeds maximum limit" };
  }
  return { valid: true, value: num };
};

/**
 * Validate transaction type.
 * @param {string} type
 * @returns {boolean}
 */
export const validateTransactionType = (type) => {
  return ["income", "expense", "transfer"].includes(type);
};
