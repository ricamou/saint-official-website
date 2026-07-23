const { createClient } = require("@supabase/supabase-js");

function normalizeSupabaseUrl(rawValue) {
  if (!rawValue || typeof rawValue !== "string") {
    throw new Error("SUPABASE_URL is missing.");
  }

  let value = rawValue.trim().replace(/^["']|["']$/g, "");

  // Accept a Supabase dashboard project URL if it was pasted by mistake.
  // Example:
  // https://supabase.com/dashboard/project/abcdefghijk
  const dashboardMatch = value.match(
    /^https?:\/\/(?:www\.)?supabase\.com\/dashboard\/project\/([a-z0-9]+)(?:\/.*)?$/i
  );

  if (dashboardMatch) {
    value = `https://${dashboardMatch[1]}.supabase.co`;
  }

  // Remove accidental API paths such as /rest/v1 or trailing slashes.
  value = value
    .replace(/\/(?:rest|auth|storage|functions)\/v\d+\/?$/i, "")
    .replace(/\/+$/, "");

  let parsed;

  try {
    parsed = new URL(value);
  } catch {
    throw new Error(
      "SUPABASE_URL is invalid. Use https://YOUR_PROJECT_REF.supabase.co"
    );
  }

  if (!/^https?:$/.test(parsed.protocol)) {
    throw new Error("SUPABASE_URL must begin with https://");
  }

  if (!parsed.hostname.endsWith(".supabase.co")) {
    throw new Error(
      "SUPABASE_URL must be the project URL: https://YOUR_PROJECT_REF.supabase.co"
    );
  }

  // Supabase project URL must not contain a path.
  return `${parsed.protocol}//${parsed.hostname}`;
}

function normalizeServiceRoleKey(rawValue) {
  if (!rawValue || typeof rawValue !== "string") {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing.");
  }

  const value = rawValue.trim().replace(/^["']|["']$/g, "");

  if (value.length < 40) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY appears to be invalid.");
  }

  return value;
}

function getSupabaseAdmin() {
  const url = normalizeSupabaseUrl(process.env.SUPABASE_URL);
  const serviceRoleKey = normalizeServiceRoleKey(
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    },
    global: {
      headers: {
        "X-Client-Info": "saint-sanctuary"
      }
    }
  });
}

function isValidSolanaWallet(wallet) {
  return typeof wallet === "string" &&
    /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(wallet);
}

function parseBody(req) {
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body || "{}");
    } catch {
      return {};
    }
  }

  return req.body || {};
}

function sendJson(res, status, payload) {
  res.setHeader("Cache-Control", "no-store");
  return res.status(status).json(payload);
}

module.exports = {
  getSupabaseAdmin,
  isValidSolanaWallet,
  parseBody,
  sendJson
};
