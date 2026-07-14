const SAINT_MINT = "GUdYAzh14TQcwUSBw79rnFJHZCv64fugTEsq1etDpump";

const DEFAULT_RPC_ENDPOINTS = [
  "https://api.mainnet-beta.solana.com",
  "https://rpc.ankr.com/solana"
];

function isValidWallet(address) {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}

function getRpcEndpoints() {
  const configured = process.env.SOLANA_RPC_URL
    ? [process.env.SOLANA_RPC_URL]
    : [];

  return [...configured, ...DEFAULT_RPC_ENDPOINTS];
}

async function queryRpc(rpcUrl, wallet) {
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
          { encoding: "jsonParsed", commitment: "confirmed" }
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
      const uiAmountString =
        account?.account?.data?.parsed?.info?.tokenAmount?.uiAmountString;

      return total + Number(uiAmountString || 0);
    }, 0);
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  let body = req.body;

  if (typeof body === "string") {
    try {
      body = JSON.parse(body || "{}");
    } catch {
      return res.status(400).json({ ok: false, error: "Invalid request body" });
    }
  }

  const wallet = body?.wallet;

  if (!wallet || !isValidWallet(wallet)) {
    return res.status(400).json({
      ok: false,
      error: "Invalid Solana wallet address"
    });
  }

  let lastError = null;

  for (const rpcUrl of getRpcEndpoints()) {
    try {
      const balance = await queryRpc(rpcUrl, wallet);

      return res.status(200).json({
        ok: true,
        wallet,
        mint: SAINT_MINT,
        balance,
        holder: balance > 0
      });
    } catch (error) {
      lastError = error;
      console.error("RPC failed:", rpcUrl, error.message);
    }
  }

  return res.status(502).json({
    ok: false,
    error: "Unable to query Solana right now",
    details: lastError?.message || "Unknown RPC error"
  });
};
