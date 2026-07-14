const SAINT_MINT = "GUdYAzh14TQcwUSBw79rnFJHZCv64fugTEsq1etDpump";

const RPC_ENDPOINTS = [
  "https://api.mainnet-beta.solana.com",
  "https://rpc.ankr.com/solana"
];

function isValidWallet(address) {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}

async function queryRpc(rpcUrl, wallet) {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
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

  const balance = accounts.reduce((total, account) => {
    const uiAmountString =
      account?.account?.data?.parsed?.info?.tokenAmount?.uiAmountString;

    return total + Number(uiAmountString || 0);
  }, 0);

  return balance;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      ok: false,
      error: "Method not allowed"
    });
  }

  const wallet =
    typeof req.body === "string"
      ? JSON.parse(req.body || "{}")?.wallet
      : req.body?.wallet;

  if (!wallet || !isValidWallet(wallet)) {
    return res.status(400).json({
      ok: false,
      error: "Invalid Solana wallet address"
    });
  }

  let lastError = null;

  for (const rpcUrl of RPC_ENDPOINTS) {
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
    error: "Unable to query the Solana blockchain right now",
    details: lastError?.message || "Unknown RPC error"
  });
};
