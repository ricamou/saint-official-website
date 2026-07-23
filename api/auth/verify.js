const nacl = require("tweetnacl");
const bs58Module = require("bs58");
const bs58 = bs58Module.default || bs58Module;

const {
  getSupabaseAdmin,
  isValidSolanaWallet,
  parseBody,
  sendJson
} = require("./_shared");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, {
      ok: false,
      error: "Method not allowed"
    });
  }

  const { wallet, nonce, signature } = parseBody(req);

  if (
    !isValidSolanaWallet(wallet) ||
    typeof nonce !== "string" ||
    typeof signature !== "string"
  ) {
    return sendJson(res, 400, {
      ok: false,
      error: "Invalid verification request"
    });
  }

  try {
    const supabase = getSupabaseAdmin();

    const { data: nonceRecord, error: nonceError } = await supabase
      .from("sanctuary_auth_nonces")
      .select("id,wallet,nonce,message,expires_at,used_at")
      .eq("wallet", wallet)
      .eq("nonce", nonce)
      .maybeSingle();

    if (nonceError || !nonceRecord) {
      return sendJson(res, 401, {
        ok: false,
        error: "Authentication request was not found"
      });
    }

    if (nonceRecord.used_at) {
      return sendJson(res, 401, {
        ok: false,
        error: "This authentication request was already used"
      });
    }

    if (new Date(nonceRecord.expires_at).getTime() <= Date.now()) {
      return sendJson(res, 401, {
        ok: false,
        error: "This authentication request has expired"
      });
    }

    let publicKeyBytes;
    let signatureBytes;

    try {
      publicKeyBytes = bs58.decode(wallet);
      signatureBytes = bs58.decode(signature);
    } catch {
      return sendJson(res, 400, {
        ok: false,
        error: "Invalid wallet or signature encoding"
      });
    }

    const messageBytes = new TextEncoder().encode(nonceRecord.message);

    const verified = nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKeyBytes
    );

    if (!verified) {
      return sendJson(res, 401, {
        ok: false,
        error: "Signature verification failed"
      });
    }

    const verifiedAt = new Date().toISOString();

    const { error: nonceUpdateError } = await supabase
      .from("sanctuary_auth_nonces")
      .update({ used_at: verifiedAt })
      .eq("id", nonceRecord.id)
      .is("used_at", null);

    if (nonceUpdateError) {
      console.error("Nonce consumption failed:", nonceUpdateError);
      return sendJson(res, 409, {
        ok: false,
        error: "Authentication request could not be finalized"
      });
    }

    const { error: holderError } = await supabase
      .from("sanctuary_holders")
      .upsert(
        {
          wallet,
          ownership_verified: true,
          first_verified_at: verifiedAt,
          last_verified_at: verifiedAt,
          holder_level: "pending",
          sanctuary_access: false
        },
        {
          onConflict: "wallet",
          ignoreDuplicates: false
        }
      );

    if (holderError) {
      console.error("Holder upsert failed:", holderError);
      return sendJson(res, 500, {
        ok: false,
        error: "Wallet verified but database update failed"
      });
    }

    return sendJson(res, 200, {
      ok: true,
      wallet,
      ownershipVerified: true,
      verifiedAt,
      nextStep: "balance-check"
    });
  } catch (error) {
    console.error("Auth verification error:", error);
    return sendJson(res, 500, {
      ok: false,
      error: "Signature verification service is not configured"
    });
  }
};
