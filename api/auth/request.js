const crypto = require("crypto");
const {
  getSupabaseAdmin,
  isValidSolanaWallet,
  parseBody,
  sendJson
} = require("./_shared");

const DOMAIN = "saintfamily.org";
const NONCE_LIFETIME_MS = 5 * 60 * 1000;

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, {
      ok: false,
      error: "Method not allowed"
    });
  }

  const { wallet } = parseBody(req);

  if (!isValidSolanaWallet(wallet)) {
    return sendJson(res, 400, {
      ok: false,
      error: "Invalid Solana wallet address"
    });
  }

  try {
    const supabase = getSupabaseAdmin();
    const nonce = crypto.randomBytes(24).toString("hex");
    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt.getTime() + NONCE_LIFETIME_MS);

    const message = [
      "The SAINT Sanctuary",
      "",
      "Sign this message to verify ownership of your wallet.",
      "",
      `Domain: ${DOMAIN}`,
      `Wallet: ${wallet}`,
      `Nonce: ${nonce}`,
      `Issued At: ${issuedAt.toISOString()}`,
      `Expiration Time: ${expiresAt.toISOString()}`,
      "",
      "This request is free.",
      "No transaction.",
      "No gas fee.",
      "No token approval."
    ].join("\n");

    // Invalidate any still-unused previous nonce for this wallet.
    await supabase
      .from("sanctuary_auth_nonces")
      .update({ used_at: new Date().toISOString() })
      .eq("wallet", wallet)
      .is("used_at", null);

    const { error } = await supabase
      .from("sanctuary_auth_nonces")
      .insert({
        wallet,
        nonce,
        message,
        expires_at: expiresAt.toISOString()
      });

    if (error) {
      console.error("Nonce insert failed:", error);
      return sendJson(res, 500, {
        ok: false,
        error: error.message || "Unable to create authentication request",
        details: error
      });
    }

    return sendJson(res, 200, {
      ok: true,
      wallet,
      nonce,
      message,
      expiresAt: expiresAt.toISOString()
    });
  } catch (error) {
    console.error("Auth request error:", error);
    return sendJson(res, 500, {
      ok: false,
      error: error?.message || "Authentication service is not configured",
      stack: error?.stack || null
    });
  }
};
