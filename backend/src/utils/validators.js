function isEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isNonEmptyString(val, minLen = 1, maxLen = 255) {
  if (typeof val !== "string") return false;
  const trimmed = val.trim();
  return trimmed.length >= minLen && trimmed.length <= maxLen;
}

function sanitizeString(val) {
  if (typeof val !== "string") return "";
  return val.trim();
}

module.exports = { isEmail, isNonEmptyString, sanitizeString };
