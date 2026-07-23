const crypto = require("crypto");

const COOKIE_NAME = "saint_sanctuary_session";
const SESSION_LIFETIME_MS = 60 * 60 * 1000;

function createSessionToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function hashSessionToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function parseCookies(req) {
  const header = req.headers.cookie || "";

  return header.split(";").reduce((cookies, item) => {
    const separator = item.indexOf("=");

    if (separator === -1) return cookies;

    const key = item.slice(0, separator).trim();
    const value = item.slice(separator + 1).trim();

    if (key) cookies[key] = decodeURIComponent(value);

    return cookies;
  }, {});
}

function getSessionToken(req) {
  return parseCookies(req)[COOKIE_NAME] || null;
}

function buildSessionCookie(token, maxAgeSeconds) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";

  return [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds}`,
    secure
  ].filter(Boolean).join("; ");
}

function buildExpiredSessionCookie() {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";

  return [
    `${COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
    secure
  ].filter(Boolean).join("; ");
}

module.exports = {
  COOKIE_NAME,
  SESSION_LIFETIME_MS,
  createSessionToken,
  hashSessionToken,
  getSessionToken,
  buildSessionCookie,
  buildExpiredSessionCookie
};
