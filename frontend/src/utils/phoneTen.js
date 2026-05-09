/** Farmer profile: exactly 10 digits (no spaces or punctuation stored). */

const LEN = 10;

/** @param {string} value */
export function formatPhoneTenDigits(value = "") {
  return String(value).replace(/\D/g, "").slice(0, LEN);
}

/** True only when exactly 10 digits. */
/** @param {string} value */
export function isValidPhoneTenDigits(value = "") {
  return /^\d{10}$/.test(String(formatPhoneTenDigits(value)));
}
