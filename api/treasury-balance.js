const TREASURY_ADDRESS = "6wiJb8mdQSc4dArLByC6c3jZS8MkAtUaMwnvMk2Wh2ES";
const SOLANA_RPC = "https://api.mainnet-beta.solana.com";

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const rpcResponse = await fetch(SOLANA_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getBalance",
        params: [TREASURY_ADDRESS, { commitment: "confirmed" }]
      })
    });

    if (!rpcResponse.ok) throw new Error(`Solana RPC returned ${rpcResponse.status}`);

    const payload = await rpcResponse.json();
    if (payload.error || typeof payload?.result?.value !== "number") {
      throw new Error(payload?.error?.message || "Invalid balance response");
    }

    const lamports = payload.result.value;
    return res.status(200).json({
      address: TREASURY_ADDRESS,
      lamports,
      sol: lamports / 1_000_000_000,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Treasury balance error:", error);
    return res.status(502).json({ error: "Unable to consult the Solana blockchain" });
  }
};
