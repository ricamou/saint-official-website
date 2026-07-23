const {
  getSupabaseAdmin,
  sendJson
} = require("../auth/_shared");

const {
  getSessionToken,
  hashSessionToken
} = require("../auth/_session");

async function getAuthenticatedWallet(req, supabase) {
  const token = getSessionToken(req);

  if (!token) return null;

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
    return null;
  }

  return session.wallet;
}

function normalizeTelegramUrl(rawValue) {
  if (!rawValue || typeof rawValue !== "string") {
    throw new Error("TELEGRAM_SANCTUARY_URL is missing.");
  }

  const value = rawValue.trim().replace(/^["']|["']$/g, "");

  if (
    !value.startsWith("https://t.me/") &&
    !value.startsWith("https://telegram.me/")
  ) {
    throw new Error("TELEGRAM_SANCTUARY_URL is invalid.");
  }

  return value;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, {
      ok: false,
      error: "Method not allowed"
    });
  }

  try {
    const supabase = getSupabaseAdmin();
    const wallet = await getAuthenticatedWallet(req, supabase);

    if (!wallet) {
      return sendJson(res, 401, {
        ok: false,
        error: "A valid Sanctuary session is required"
      });
    }

    const { data: holder, error: holderError } = await supabase
      .from("sanctuary_holders")
      .select(
        "wallet,ownership_verified,sanctuary_access,saint_balance,minimum_required"
      )
      .eq("wallet", wallet)
      .maybeSingle();

    if (holderError || !holder) {
      return sendJson(res, 403, {
        ok: false,
        error: "Holder verification was not found"
      });
    }

    const balance = Number(holder.saint_balance || 0);
    const minimum = Number(holder.minimum_required || 1000000);

    const balanceEligible = balance >= minimum;

    // If the stored balance meets the rule, synchronize stale access flags.
    if (
      holder.ownership_verified &&
      balanceEligible &&
      !holder.sanctuary_access
    ) {
      const { error: syncError } = await supabase
        .from("sanctuary_holders")
        .update({
          sanctuary_access: true,
          holder_level: "sanctuary_member"
        })
        .eq("wallet", wallet);

      if (syncError) {
        console.error("Sanctuary access sync failed:", syncError);
      } else {
        holder.sanctuary_access = true;
      }
    }

    if (
      !holder.ownership_verified ||
      !holder.sanctuary_access ||
      !balanceEligible
    ) {
      return sendJson(res, 403, {
        ok: false,
        error: "This wallet does not meet the Sanctuary requirement",
        details: {
          ownershipVerified: Boolean(holder.ownership_verified),
          sanctuaryAccess: Boolean(holder.sanctuary_access),
          balance,
          minimum
        }
      });
    }

    const telegramUrl = normalizeTelegramUrl(
      process.env.TELEGRAM_SANCTUARY_URL
    );

    return sendJson(res, 200, {
      ok: true,
      accessGranted: true,
      telegramUrl
    });
  } catch (error) {
    console.error("Sanctuary access error:", error);

    return sendJson(res, 500, {
      ok: false,
      error: error?.message || "Unable to open the Sanctuary"
    });
  }
};
