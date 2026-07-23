const walletState = { provider: null, walletName: null, publicKey: null };

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("connectWalletButton")?.addEventListener("click", openWalletSelector);
  document.getElementById("disconnectWalletButton")?.addEventListener("click", disconnectWallet);

  document.querySelectorAll("[data-close-wallet-selector]").forEach((el) => {
    el.addEventListener("click", closeWalletSelector);
  });

  document.querySelectorAll("[data-wallet]").forEach((button) => {
    button.addEventListener("click", () => connectWallet(button.dataset.wallet));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeWalletSelector();
  });

  updateWalletAvailability();
  setTimeout(updateWalletAvailability, 900);
  setTimeout(updateWalletAvailability, 2200);
});

function getWalletProvider(name) {
  if (name === "phantom") {
    const provider = window.phantom?.solana || (window.solana?.isPhantom ? window.solana : null);
    return provider?.isPhantom ? provider : null;
  }

  if (name === "solflare") {
    const provider = window.solflare || (window.solana?.isSolflare ? window.solana : null);
    return provider?.isSolflare ? provider : null;
  }

  if (name === "backpack") {
    const provider = window.backpack?.solana || window.backpack || (window.solana?.isBackpack ? window.solana : null);
    return provider?.connect ? provider : null;
  }

  return null;
}

function updateWalletAvailability() {
  ["phantom", "solflare", "backpack"].forEach((name) => {
    const installed = Boolean(getWalletProvider(name));
    const status = document.getElementById(name + "Status");
    const button = document.querySelector(`[data-wallet="${name}"]`);
    if (status) status.textContent = installed ? "Installed" : "Not detected";
    button?.classList.toggle("wallet-installed", installed);
  });
}

function openWalletSelector() {
  updateWalletAvailability();
  const modal = document.getElementById("walletSelector");
  modal?.classList.add("open");
  modal?.setAttribute("aria-hidden", "false");
  document.body.classList.add("wallet-selector-open");
}

function closeWalletSelector() {
  const modal = document.getElementById("walletSelector");
  modal?.classList.remove("open");
  modal?.setAttribute("aria-hidden", "true");
  document.body.classList.remove("wallet-selector-open");
}

async function connectWallet(name) {
  const provider = getWalletProvider(name);

  if (!provider) {
    setStatus("Wallet not detected. Install it or open this site inside the wallet browser.", "warning");
    return;
  }

  setStatus("Waiting for wallet approval...", "scanning");
  setGuardianMessage("Please approve the connection inside your wallet.");

  try {
    const response = await provider.connect();
    const publicKey =
      response?.publicKey?.toString?.() ||
      provider.publicKey?.toString?.() ||
      response?.accounts?.[0]?.address;

    if (!publicKey) throw new Error("No public key returned");

    walletState.provider = provider;
    walletState.walletName = name;
    walletState.publicKey = publicKey;

    renderConnected(publicKey, name);
    closeWalletSelector();
  } catch (error) {
    const cancelled = error?.code === 4001 || /reject|cancel|declin/i.test(error?.message || "");
    setStatus(cancelled ? "Connection cancelled. You can try again." : "Wallet connection failed. Please try again.", "error");
    setGuardianMessage("The connection was not completed. I will wait for you.");
  }
}

async function disconnectWallet() {
  try {
    await walletState.provider?.disconnect?.();
  } catch (_) {}

  walletState.provider = null;
  walletState.walletName = null;
  walletState.publicKey = null;

  document.getElementById("walletConnectedSummary")?.setAttribute("hidden", "");
  document.getElementById("connectWalletButton")?.removeAttribute("hidden");
  setText("resultWallet", "Not connected");
  setText("resultBalance", "Pending signature");
  setText("resultRank", "Pending signature");
  setText("resultStatus", "Disconnected");
  setText("resultTitle", "Connect your wallet");
  setText("resultSubtitle", "After connecting, Sprint 2 will add the secure message signature.");
  setText("rankCurrent", "Connection progress");
  setText("rankNext", "Connect wallet to continue");
  document.getElementById("holderProgressBar").style.width = "0%";
  setStatus("The Guardian is waiting for you to connect a wallet.");
  setGuardianMessage("Welcome... I have been waiting for you.");
}

function renderConnected(publicKey, name) {
  const walletName = name.charAt(0).toUpperCase() + name.slice(1);

  document.getElementById("connectWalletButton")?.setAttribute("hidden", "");
  document.getElementById("walletConnectedSummary")?.removeAttribute("hidden");

  setText("connectedWalletAddress", abbreviate(publicKey));
  setText("resultWallet", abbreviate(publicKey));
  setText("resultBalance", "Pending signature");
  setText("resultRank", "Pending signature");
  setText("resultStatus", "Connected");
  setText("resultTitle", "Wallet Connected");
  setText("resultSubtitle", `${walletName} is connected. Sprint 2 will add the secure signature.`);
  setText("rankCurrent", "Sprint 1 complete");
  setText("rankNext", "Next: Sign Message");
  document.getElementById("holderProgressBar").style.width = "33%";
  setStatus(`${walletName} connected successfully.`, "success");
  setGuardianMessage("Your wallet is connected. The next gate will be the secure signature.");
  document.getElementById("sanctuaryResult")?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function setStatus(message, state = "") {
  const box = document.getElementById("sanctuaryStatus");
  box?.classList.remove("scanning", "success", "warning", "error");
  if (state) box?.classList.add(state);
  setText("statusText", message);
}

function setGuardianMessage(message) { setText("guardianMessage", message); }
function setText(id, value) { const el = document.getElementById(id); if (el) el.textContent = value; }
function abbreviate(address) { return address.slice(0, 6) + "..." + address.slice(-6); }
