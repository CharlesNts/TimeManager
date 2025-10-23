/**
 * Date utilities for Europe/Paris timezone
 * Ensures consistent date handling across the application
 */

/**
 * Convert any date to Paris timezone
 * @param {Date} date - Date to convert
 * @returns {Date} Date in Paris timezone
 */
export const toParis = (date) => {
  return new Date(date.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
};

/**
 * Pad a number to 2 digits
 * @param {number} n - Number to pad
 * @returns {string} Padded string
 */
export const pad = (n) => String(n).padStart(2, '0');

/**
 * Convert date to ISO string with time (LocalDateTime format)
 * Format: YYYY-MM-DDTHH:mm:ss
 * Used for API calls that expect LocalDateTime
 * @param {Date} d - Date to convert
 * @returns {string} ISO string with time
 */
export const toISO = (d) => {
  const p = toParis(d);
  return `${p.getFullYear()}-${pad(p.getMonth() + 1)}-${pad(p.getDate())}T${pad(p.getHours())}:${pad(p.getMinutes())}:${pad(p.getSeconds())}`;
};

/**
 * Convert date to ISO date string only (no time)
 * Format: YYYY-MM-DD
 * Used for internal date comparisons
 * @param {Date} d - Date to convert
 * @returns {string} ISO date string
 */
export const dateToISO = (d) => {
  const p = toParis(d);
  return `${p.getFullYear()}-${pad(p.getMonth() + 1)}-${pad(p.getDate())}`;
};

/**
 * Get start of day (00:00:00)
 * @param {Date} d - Date to use
 * @returns {Date} Date at start of day
 */
export const startOfDay = (d) => {
  const x = toParis(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

/**
 * Get end of day (23:59:59)
 * @param {Date} d - Date to use
 * @returns {Date} Date at end of day
 */
export const endOfDay = (d) => {
  const x = toParis(d);
  x.setHours(23, 59, 59, 999);
  return x;
};

/**
 * Get start of week (Monday 00:00:00)
 * @param {Date} d - Date to use
 * @returns {Date} Date at start of week
 */
export const startOfWeekMon = (d) => {
  const x = startOfDay(d);
  const day = x.getDay(); // 0=sun,1=mon,...6=sat
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return startOfDay(x);
};

/**
 * Get end of week (Sunday 23:59:59)
 * @param {Date} d - Date to use
 * @returns {Date} Date at end of week
 */
export const endOfWeekSun = (d) => {
  const start = startOfWeekMon(d);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return endOfDay(end);
};

/**
 * Get first day of month
 * @param {Date} d - Date to use
 * @returns {Date} First day of month at 00:00:00
 */
export const firstDayOfMonth = (d) => {
  const x = toParis(d);
  x.setDate(1);
  return startOfDay(x);
};

/**
 * Get last day of month
 * @param {Date} d - Date to use
 * @returns {Date} Last day of month at 23:59:59
 */
export const lastDayOfMonth = (d) => {
  const x = toParis(d);
  x.setMonth(x.getMonth() + 1, 0);
  return endOfDay(x);
};

/**
 * Add days to a date
 * @param {Date} d - Base date
 * @param {number} n - Number of days to add
 * @returns {Date} New date
 */
export const addDays = (d, n) => {
  const x = new Date(toParis(d));
  x.setDate(x.getDate() + n);
  return x;
};

/**
 * Calculate minutes between two dates
 * @param {Date} a - Start date
 * @param {Date} b - End date
 * @returns {number} Minutes between (max 0)
 */
export const minutesBetween = (a, b) => {
  return Math.max(0, Math.round((b - a) / 60000));
};

/**
 * Get minutes since midnight (Paris time)
 * @param {Date} d - Date to use
 * @returns {number} Minutes since midnight
 */
export const minutesSinceMidnightParis = (d) => {
  const p = toParis(d);
  return p.getHours() * 60 + p.getMinutes();
};
