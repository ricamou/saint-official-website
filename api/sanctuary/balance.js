const {
  getSupabaseAdmin,
  sendJson
} = require("../auth/_shared");

const {
  getSessionToken,
  hashSessionToken
} = require("../auth/_session");

const SAINT_MINT = "GUdYAzh14TQcwUSBw79rnFJHZCv64fugTEsq1etDpump";
const MINIMUM_BALANCE = 1000000;
const CACHE_LIFETIME_MS = 5 * 60 * 1000;

const DEFAULT_RPC_ENDPOINTS = [
  "https://api.mainnet-beta.solana.com",
  "https://rpc.ankr.com/solana"
];

function getRpcEndpoints() {
  const configured = process.env.SOLANA_RPC_URL
    ? [process.env.SOLANA_RPC_URL]
    : [];

  return [...configured, ...DEFAULT_RPC_ENDPOINTS];
}

async function querySaintBalance(rpcUrl, wallet) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);

  try {
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getTokenAccountsByOwner",
        params: [
          wallet,
          { mint: SAINT_MINT },
          {
            encoding: "jsonParsed",
            commitment: "confirmed"
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`RPC HTTP ${response.status}`);
    }

    const payload = await response.json();

    if (payload.error) {
      throw new Error(payload.error.message || "RPC query failed");
    }

    const accounts = payload?.result?.value || [];

    return accounts.reduce((total, account) => {
      const amount =
        account?.account?.data?.parsed?.info?.tokenAmount?.uiAmountString;

      return total + Number(amount || 0);
    }, 0);
  } finally {
    clearTimeout(timeout);
  }
}

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

module.exports = async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
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
        authenticated: false,
        error: "A valid Sanctuary session is required"
      });
    }

    const now = new Date();

    const { data: cachedHolder, error: cachedError } = await supabase
      .from("sanctuary_holders")
      .select(
        "wallet,saint_balance,holder_level,sanctuary_access,last_balance_check_at,cache_expires_at"
      )
      .eq("wallet", wallet)
      .maybeSingle();

    if (
      !cachedError &&
      cachedHolder?.cache_expires_at &&
      new Date(cachedHolder.cache_expires_at).getTime() > now.getTime()
    ) {
      const balance = Number(cachedHolder.saint_balance || 0);
      const remaining = Math.max(0, MINIMUM_BALANCE - balance);
      const progress = Math.min(100, (balance / MINIMUM_BALANCE) * 100);

      return sendJson(res, 200, {
        ok: true,
        wallet,
        balance,
        minimumRequired: MINIMUM_BALANCE,
        remaining,
        progress,
        eligible: balance >= MINIMUM_BALANCE,
        holderLevel: cachedHolder.holder_level,
        source: "cache",
        checkedAt: cachedHolder.last_balance_check_at,
        cacheExpiresAt: cachedHolder.cache_expires_at
      });
    }

    let balance = null;
    let lastError = null;
    let successfulRpc = null;

    for (const rpcUrl of getRpcEndpoints()) {
      try {
        balance = await querySaintBalance(rpcUrl, wallet);
        successfulRpc = rpcUrl;
        break;
      } catch (error) {
        lastError = error;
        console.error("SAINT balance RPC failed:", rpcUrl, error.message);
      }
    }

    if (balance === null) {
      return sendJson(res, 502, {
        ok: false,
        error: "Unable to check the SAINT balance right now",
        details: lastError?.message || "All RPC providers failed"
      });
    }

    const eligible = balance >= MINIMUM_BALANCE;
    const holderLevel = eligible ? "sanctuary_member" : "almost_there";
    const checkedAt = now.toISOString();
    const cacheExpiresAt = new Date(
      now.getTime() + CACHE_LIFETIME_MS
    ).toISOString();

    const { error: updateError } = await supabase
      .from("sanctuary_holders")
      .upsert(
        {
          wallet,
          saint_balance: balance,
          minimum_required: MINIMUM_BALANCE,
          holder_level: holderLevel,
          sanctuary_access: eligible,
          ownership_verified: true,
          last_balance_check_at: checkedAt,
          cache_expires_at: cacheExpiresAt,
          balance_source: successfulRpc
        },
        {
          onConflict: "wallet",
          ignoreDuplicates: false
        }
      );

    if (updateError) {
      console.error("Holder balance update failed:", updateError);
      return sendJson(res, 500, {
        ok: false,
        error: "Balance checked but the holder record could not be updated"
      });
    }

    const remaining = Math.max(0, MINIMUM_BALANCE - balance);
    const progress = Math.min(100, (balance / MINIMUM_BALANCE) * 100);

    return sendJson(res, 200, {
      ok: true,
      wallet,
      balance,
      minimumRequired: MINIMUM_BALANCE,
      remaining,
      progress,
      eligible,
      holderLevel,
      source: "blockchain",
      checkedAt,
      cacheExpiresAt
    });
  } catch (error) {
    console.error("Holder verification error:", error);

    return sendJson(res, 500, {
      ok: false,
      error: "Holder verification service is not configured"
    });
  }
};
