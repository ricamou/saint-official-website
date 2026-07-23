
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
  checkExistingSanctuarySession();
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

  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin"
    });
  } catch (error) {
    console.warn("Backend logout warning:", error);
  }

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
  resetHolderBalanceUI();
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
      credentials: "same-origin",
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
      credentials: "same-origin",
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
    "💙 Welcome to the Sanctuary. Your wallet ownership is verified."
  );
  setText("rankCurrent", "Ownership verified");
  setText("rankNext", "Secure session active — next: SAINT Balance Check");
  document.getElementById("holderProgressBar").style.width = "66%";

  setStatus("Wallet ownership verified successfully.", "success");
  setGuardianMessage("The signature is valid. This wallet truly belongs to you.");

  document.getElementById("sanctuaryResult")?.classList.add("holder-success");
  document.getElementById("sanctuaryResult")?.scrollIntoView({
    behavior: "smooth",
    block: "center"
  });

  checkSaintBalance();
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


async function checkExistingSanctuarySession() {
  try {
    const response = await fetch("/api/auth/session", {
      method: "GET",
      credentials: "same-origin",
      headers: { "Accept": "application/json" }
    });

    if (!response.ok) return;

    const data = await response.json();

    if (!data.ok || !data.authenticated || !data.wallet) return;

    walletState.publicKey = data.wallet;
    walletState.ownershipVerified = true;

    setText("resultWallet", abbreviate(data.wallet));
    setText("resultStatus", "Ownership Verified");
    setText("resultTitle", "💙 Welcome to the Sanctuary");
    setText(
      "resultSubtitle",
      "Your secure authentication session is active. Connect the same wallet to continue."
    );
    setText("rankCurrent", "Ownership verified");
    setText("rankNext", "Next: SAINT Balance Check");
    document.getElementById("holderProgressBar").style.width = "66%";
    setStatus("Secure Sanctuary session restored.", "success");
    setGuardianMessage("Welcome back, Saint. Your secure session is active.");
    checkSaintBalance();
  } catch (error) {
    console.warn("Session restore warning:", error);
  }
}


async function checkSaintBalance() {
  if (!walletState.ownershipVerified) {
    setStatus("Sign the ownership message before checking the balance.", "warning");
    return;
  }

  setText("resultBalance", "Checking...");
  setText("resultRank", "Checking...");
  setText("resultStatus", "Checking SAINT balance");
  setText("rankCurrent", "Verifying holder balance");
  setText("rankNext", "Reading the Solana blockchain");
  document.getElementById("holderProgressBar").style.width = "72%";
  setStatus("Checking your SAINT balance...", "scanning");
  setGuardianMessage("I am checking your SAINT balance on Solana.");

  try {
    const response = await fetch("/api/sanctuary/balance", {
      method: "GET",
      credentials: "same-origin",
      headers: { "Accept": "application/json" }
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Unable to check the SAINT balance.");
    }

    renderHolderBalance(data);
  } catch (error) {
    console.error("SAINT balance check failed:", error);
    setText("resultBalance", "Check failed");
    setText("resultRank", "Unavailable");
    setText("resultStatus", "Try again");
    setText("rankNext", "Balance verification unavailable");
    setStatus(
      error?.message || "Unable to check the SAINT balance. Please try again.",
      "error"
    );
    setGuardianMessage("The balance check was interrupted. Please try again.");
  }
}

function renderHolderBalance(data) {
  const balance = Number(data.balance || 0);
  const minimum = Number(data.minimumRequired || 1000000);
  const remaining = Math.max(0, Number(data.remaining || 0));
  const progress = Math.max(0, Math.min(100, Number(data.progress || 0)));
  const eligible = Boolean(data.eligible);

  const details = document.getElementById("holderBalanceDetails");
  const encouragement = document.getElementById("holderEncouragement");
  const welcome = document.getElementById("holderWelcome");
  const enterButton = document.getElementById("enterSanctuaryButton");
  const buyButton = document.getElementById("buySaintButton");

  details?.removeAttribute("hidden");

  setText("holderCurrentBalance", `${formatSaint(balance)} SAINT`);
  setText("holderRemainingBalance", `${formatSaint(remaining)} SAINT`);
  setText("resultBalance", `${formatSaint(balance)} SAINT`);
  setText("resultRank", eligible ? "Sanctuary Member" : "Almost There");
  document.getElementById("holderProgressBar").style.width = `${progress}%`;

  if (eligible) {
    setText("resultStatus", "Requirement Met");
    setText("resultTitle", "💙 Welcome to the Sanctuary");
    setText(
      "resultSubtitle",
      "Your wallet is verified and holds the required amount of SAINT."
    );
    setText("rankCurrent", `${progress.toFixed(0)}% Complete`);
    setText("rankNext", "1,000,000 SAINT requirement met");
    setText("holderRemainingLabel", "Requirement");
    setText("holderRemainingBalance", `${formatSaint(minimum)} SAINT ✓`);

    encouragement?.setAttribute("hidden", "");
    welcome?.removeAttribute("hidden");

    enterButton?.classList.remove("disabled");
    enterButton?.setAttribute("aria-disabled", "false");
    buyButton?.setAttribute("hidden", "");

    setStatus("Holder requirement verified successfully.", "success");
    setGuardianMessage("Welcome, Saint. The Sanctuary recognizes you.");
  } else {
    setText("resultStatus", "More SAINT Required");
    setText("resultTitle", "You're Almost There");
    setText(
      "resultSubtitle",
      "Increase your SAINT balance to unlock the Sanctuary."
    );
    setText("rankCurrent", `${progress.toFixed(0)}% Complete`);
    setText("rankNext", `${formatSaint(remaining)} SAINT remaining`);
    setText("holderRemainingLabel", "Remaining");

    encouragement?.removeAttribute("hidden");
    welcome?.setAttribute("hidden", "");

    enterButton?.classList.add("disabled");
    enterButton?.setAttribute("aria-disabled", "true");
    buyButton?.removeAttribute("hidden");

    setStatus(
      `Buy ${formatSaint(remaining)} more SAINT to enter the Sanctuary.`,
      "warning"
    );
    setGuardianMessage("You are close. Buy more SAINT to open the gates.");
  }

  details?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function resetHolderBalanceUI() {
  document.getElementById("holderBalanceDetails")?.setAttribute("hidden", "");
  document.getElementById("holderEncouragement")?.setAttribute("hidden", "");
  document.getElementById("holderWelcome")?.setAttribute("hidden", "");

  const enterButton = document.getElementById("enterSanctuaryButton");
  const buyButton = document.getElementById("buySaintButton");

  enterButton?.classList.add("disabled");
  enterButton?.setAttribute("aria-disabled", "true");
  buyButton?.removeAttribute("hidden");
}

function formatSaint(value) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2
  }).format(Number(value || 0));
}
