const {
  getSupabaseAdmin,
  sendJson
} = require("./_shared");

const {
  getSessionToken,
  hashSessionToken,
  buildExpiredSessionCookie
} = require("./_session");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, {
      ok: false,
      error: "Method not allowed"
    });
  }

  const token = getSessionToken(req);

  try {
    if (token) {
      const supabase = getSupabaseAdmin();

      await supabase
        .from("sanctuary_auth_sessions")
        .update({ revoked_at: new Date().toISOString() })
        .eq("token_hash", hashSessionToken(token))
        .is("revoked_at", null);
    }
  } catch (error) {
    console.error("Session revoke warning:", error);
  }

  res.setHeader("Set-Cookie", buildExpiredSessionCookie());

  return sendJson(res, 200, {
    ok: true,
    loggedOut: true
  });
};
