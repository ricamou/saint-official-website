const {
  getSupabaseAdmin,
  sendJson
} = require("./_shared");

const {
  getSessionToken,
  hashSessionToken
} = require("./_session");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendJson(res, 405, {
      ok: false,
      error: "Method not allowed"
    });
  }

  const token = getSessionToken(req);

  if (!token) {
    return sendJson(res, 401, {
      ok: false,
      authenticated: false
    });
  }

  try {
    const supabase = getSupabaseAdmin();
    const tokenHash = hashSessionToken(token);
    const now = new Date();

    const { data: session, error } = await supabase
      .from("sanctuary_auth_sessions")
      .select("id,wallet,expires_at,revoked_at")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (
      error ||
      !session ||
      session.revoked_at ||
      new Date(session.expires_at).getTime() <= now.getTime()
    ) {
      return sendJson(res, 401, {
        ok: false,
        authenticated: false
      });
    }

    await supabase
      .from("sanctuary_auth_sessions")
      .update({ last_seen_at: now.toISOString() })
      .eq("id", session.id);

    return sendJson(res, 200, {
      ok: true,
      authenticated: true,
      wallet: session.wallet,
      expiresAt: session.expires_at,
      nextStep: "balance-check"
    });
  } catch (error) {
    console.error("Session lookup error:", error);
    return sendJson(res, 500, {
      ok: false,
      authenticated: false,
      error: "Session service is not configured"
    });
  }
};
