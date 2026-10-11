// ─── FIRESTORE TELEMETRY & OPERATION TRACKER ────────────────────
// Tracks client-side Firestore reads, writes, and deletes by date & hour.
// Enables real-time database usage telemetry without requiring cloud billing APIs.

const STORAGE_KEY = "firestore_db_telemetry_v1";

/**
 * Get or initialize telemetry storage
 */
const getStorage = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const saveStorage = (data) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn("Failed to persist DB telemetry:", err);
  }
};

/**
 * Record a database operation (read, write, delete)
 * @param {'reads' | 'writes' | 'deletes'} type 
 * @param {number} count 
 */
export const recordDbOp = (type, count = 1) => {
  if (!count || count <= 0) return;
  const now = new Date();
  const dateKey = now.toISOString().split("T")[0]; // YYYY-MM-DD
  const hourKey = String(now.getHours()).padStart(2, "0");

  const data = getStorage();
  if (!data[dateKey]) {
    data[dateKey] = {
      reads: 0,
      writes: 0,
      deletes: 0,
      hours: {},
    };
  }
  if (!data[dateKey].hours[hourKey]) {
    data[dateKey].hours[hourKey] = { reads: 0, writes: 0, deletes: 0 };
  }

  data[dateKey][type] = (data[dateKey][type] || 0) + count;
  data[dateKey].hours[hourKey][type] =
    (data[dateKey].hours[hourKey][type] || 0) + count;

  saveStorage(data);
};

export const recordDbRead = (count = 1) => recordDbOp("reads", count);
export const recordDbWrite = (count = 1) => recordDbOp("writes", count);
export const recordDbDelete = (count = 1) => recordDbOp("deletes", count);

/**
 * Retrieve aggregated telemetry for a specific date range.
 * @param {Date} startDate 
 * @param {Date} endDate 
 */
export const getTelemetryData = (startDate, endDate) => {
  const data = getStorage();
  let totalReads = 0;
  let totalWrites = 0;
  let totalDeletes = 0;
  const dayBuckets = {};

  const current = new Date(startDate);
  while (current <= endDate) {
    const key = current.toISOString().split("T")[0];
    const dayData = data[key] || { reads: 0, writes: 0, deletes: 0, hours: {} };
    totalReads += dayData.reads || 0;
    totalWrites += dayData.writes || 0;
    totalDeletes += dayData.deletes || 0;
    dayBuckets[key] = dayData;
    current.setDate(current.getDate() + 1);
  }

  return {
    totalReads,
    totalWrites,
    totalDeletes,
    dayBuckets,
  };
};
