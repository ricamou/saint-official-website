const { createClient } = require("@supabase/supabase-js");

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variable."
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
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
