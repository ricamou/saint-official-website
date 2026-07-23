
function isMobileDevice() {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
    window.matchMedia("(max-width: 820px)").matches;
}

function buildPhantomBrowseUrl() {
  const destination = encodeURIComponent(window.location.href);
  const referrer = encodeURIComponent(window.location.origin);
  return `https://phantom.app/ul/browse/${destination}?ref=${referrer}`;
}

function updateMobilePhantomAction() {
  const action = document.getElementById("openPhantomMobile");
  if (!action) return;

  const shouldShow =
    isMobileDevice() &&
    !getWalletProvider("phantom");

  action.hidden = !shouldShow;

  if (shouldShow) {
    action.href = buildPhantomBrowseUrl();
  }
}

const walletState = {
  provider: null,
  walletName: null,
  publicKey: null,
  ownershipVerified: false
};

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("connectWalletButton")?.addEventListener("click", openWalletSelector);
  document.getElementById("disconnectWalletButton")?.addEventListener("click", disconnectWallet);
  document.getElementById("signMessageButton")?.addEventListener("click", signOwnershipMessage);

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
  updateMobilePhantomAction();
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
  const phantomInstalled = Boolean(getWalletProvider("phantom"));
  const mainLabel = document.getElementById("connectWalletLabel");

  if (mainLabel) {
    mainLabel.textContent = phantomInstalled ? "Connect Phantom" : "Connect Wallet";
  }

  ["phantom", "solflare", "backpack"].forEach((name) => {
    const installed = Boolean(getWalletProvider(name));
    const status = document.getElementById(name + "Status");
    const button = document.querySelector(`[data-wallet="${name}"]`);

    if (status) status.textContent = installed ? "Installed" : "Not detected";
    button?.classList.toggle("wallet-installed", installed);
  });

  updateMobilePhantomAction();
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
  const feedback = document.getElementById("walletSelectorFeedback");

  if (feedback) {
    feedback.textContent = "";
    feedback.className = "wallet-selector-feedback";
  }

  if (!provider) {
    if (name === "phantom" && isMobileDevice()) {
      const action = document.getElementById("openPhantomMobile");
      const message =
        "Phantom cannot connect inside Telegram or this browser. Tap Open in Phantom below.";

      if (action) {
        action.hidden = false;
        action.href = buildPhantomBrowseUrl();
      }

      if (feedback) {
        feedback.textContent = message;
        feedback.classList.add("warning");
      }

      setStatus(message, "warning");
      return;
    }

    const message =
      "Wallet not detected. Install it or open this site inside the wallet browser.";

    if (feedback) {
      feedback.textContent = message;
      feedback.classList.add("error");
    }

    setStatus(message, "warning");
    return;
  }

  if (feedback) {
    feedback.textContent = "Opening wallet approval...";
    feedback.classList.add("loading");
  }

  setStatus("Waiting for wallet approval...", "scanning");
  setGuardianMessage("Please approve the connection inside your wallet.");

  try {
    let response;

    // Phantom and most injected Solana wallets.
    if (typeof provider.connect === "function") {
      response = await provider.connect({ onlyIfTrusted: false });
    } else if (typeof provider.request === "function") {
      response = await provider.request({ method: "connect" });
    } else {
      throw new Error("This wallet provider does not expose a connect method.");
    }

    const publicKey =
      response?.publicKey?.toString?.() ||
      provider.publicKey?.toString?.() ||
      response?.accounts?.[0]?.address ||
      response?.publicKey ||
      null;

    if (!publicKey) {
      throw new Error("The wallet connected but did not return a public key.");
    }

    walletState.provider = provider;
    walletState.walletName = name;
    walletState.publicKey = String(publicKey);

    renderConnected(String(publicKey), name);
    closeWalletSelector();
  } catch (error) {
    console.error("Wallet connection failed:", error);

    const cancelled =
      error?.code === 4001 ||
      /reject|cancel|declin/i.test(error?.message || "");

    const message = cancelled
      ? "Connection cancelled. You can try again."
      : `Wallet connection failed: ${error?.message || "Unknown error"}`;

    if (feedback) {
      feedback.textContent = message;
      feedback.classList.remove("loading");
      feedback.classList.add(cancelled ? "warning" : "error");
    }

    setStatus(message, cancelled ? "warning" : "error");
    setGuardianMessage(
      cancelled
        ? "The connection was cancelled. I will wait for you."
        : "The wallet could not be connected. Please try again."
    );
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
  document.getElementById("signatureCard")?.setAttribute("hidden", "");
  walletState.ownershipVerified = false;
  document.getElementById("connectWalletButton")?.removeAttribute("hidden");
  setText("resultWallet", "Not connected");
  setText("resultBalance", "Not checked yet");
  setText("resultRank", "Not checked yet");
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
  document.getElementById("signatureCard")?.removeAttribute("hidden");

  walletState.ownershipVerified = false;

  setText("connectedWalletAddress", abbreviate(publicKey));
  setText("resultWallet", abbreviate(publicKey));
  setText("resultBalance", "Not checked yet");
  setText("resultRank", "Not checked yet");
  setText("resultStatus", "Connected — signature required");
  setText("resultTitle", "Wallet Connected");
  setText(
    "resultSubtitle",
    `${walletName} is connected. Sign the free message to prove ownership.`
  );
  setText("rankCurrent", "Wallet connected");
  setText("rankNext", "Next: Sign Message");
  document.getElementById("holderProgressBar").style.width = "40%";
  setStatus(`${walletName} connected successfully. Sign the message to continue.`, "success");
  setGuardianMessage("Your wallet is connected. Now prove that it belongs to you.");
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


async function signOwnershipMessage() {
  const provider = walletState.provider;
  const publicKey = walletState.publicKey;
  const signButton = document.getElementById("signMessageButton");

  if (!provider || !publicKey) {
    setStatus("Connect a wallet before signing.", "warning");
    return;
  }

  if (typeof provider.signMessage !== "function") {
    setStatus(
      "This wallet does not expose signMessage in the current browser.",
      "error"
    );
    return;
  }

  signButton.disabled = true;
  signButton.textContent = "Preparing...";
  setStatus("Preparing a secure ownership message...", "scanning");
  setGuardianMessage("I am preparing your one-time verification message.");

  try {
    const requestResponse = await fetch("/api/auth/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet: publicKey })
    });

    const requestData = await requestResponse.json();

    if (!requestResponse.ok || !requestData.ok) {
      throw new Error(
        requestData.error || "Unable to create authentication request."
      );
    }

    const encodedMessage = new TextEncoder().encode(requestData.message);

    signButton.textContent = "Waiting for signature...";
    setStatus("Approve the message signature inside your wallet.", "scanning");
    setGuardianMessage("Please review and sign the free message in your wallet.");

    const signedResult = await provider.signMessage(encodedMessage, "utf8");

    const signatureBytes =
      signedResult?.signature ||
      signedResult;

    if (!signatureBytes) {
      throw new Error("The wallet did not return a signature.");
    }

    const signature = base58Encode(signatureBytes);

    signButton.textContent = "Verifying...";
    setStatus("Verifying your signature securely...", "scanning");

    const verifyResponse = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        wallet: publicKey,
        nonce: requestData.nonce,
        signature
      })
    });

    const verifyData = await verifyResponse.json();

    if (!verifyResponse.ok || !verifyData.ok) {
      throw new Error(
        verifyData.error || "Signature verification failed."
      );
    }

    renderOwnershipVerified();
  } catch (error) {
    console.error("Sign Message failed:", error);

    const cancelled =
      error?.code === 4001 ||
      /reject|cancel|declin/i.test(error?.message || "");

    setStatus(
      cancelled
        ? "Signature cancelled. No changes were made."
        : error?.message || "Signature verification failed.",
      cancelled ? "warning" : "error"
    );

    setGuardianMessage(
      cancelled
        ? "The signature was cancelled. You can try again when ready."
        : "I could not verify the signature. Please try again."
    );
  } finally {
    if (!walletState.ownershipVerified) {
      signButton.disabled = false;
      signButton.textContent = "Sign Message";
    }
  }
}

function renderOwnershipVerified() {
  walletState.ownershipVerified = true;

  const signButton = document.getElementById("signMessageButton");
  signButton.disabled = true;
  signButton.textContent = "Ownership Verified ✓";
  signButton.classList.add("verified");

  setText("resultStatus", "Ownership Verified");
  setText("resultTitle", "Wallet Ownership Verified");
  setText(
    "resultSubtitle",
    "Your cryptographic signature is valid. Balance verification is next."
  );
  setText("rankCurrent", "Ownership verified");
  setText("rankNext", "Next: SAINT Balance Check");
  document.getElementById("holderProgressBar").style.width = "66%";

  setStatus("Wallet ownership verified successfully.", "success");
  setGuardianMessage("The signature is valid. This wallet truly belongs to you.");

  document.getElementById("sanctuaryResult")?.classList.add("holder-success");
  document.getElementById("sanctuaryResult")?.scrollIntoView({
    behavior: "smooth",
    block: "center"
  });
}

function base58Encode(bytes) {
  const alphabet =
    "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

  const source = bytes instanceof Uint8Array
    ? bytes
    : new Uint8Array(bytes);

  if (source.length === 0) return "";

  const digits = [0];

  for (const byte of source) {
    let carry = byte;

    for (let index = 0; index < digits.length; index += 1) {
      const value = digits[index] * 256 + carry;
      digits[index] = value % 58;
      carry = Math.floor(value / 58);
    }

    while (carry > 0) {
      digits.push(carry % 58);
      carry = Math.floor(carry / 58);
    }
  }

  let result = "";

  for (const byte of source) {
    if (byte === 0) result += alphabet[0];
    else break;
  }

  for (let index = digits.length - 1; index >= 0; index -= 1) {
    result += alphabet[digits[index]];
  }

  return result;
}


// wallet-option-pointer-fix
document.addEventListener("click", (event) => {
  const option = event.target.closest("[data-wallet]");
  if (!option) return;

  event.preventDefault();
  event.stopPropagation();
  connectWallet(option.dataset.wallet);
}, true);
