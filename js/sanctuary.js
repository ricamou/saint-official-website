const SC = window.SANCTUARY_CONFIG;

const LEVELS = [
  { name: "Supporter", min: 1, next: 100000 },
  { name: "Guardian", min: 100000, next: 500000 },
  { name: "Saint", min: 500000, next: 2000000 },
  { name: "Archangel", min: 2000000, next: 10000000 },
  { name: "Founder", min: 10000000, next: 50000000 },
  { name: "Whale", min: 50000000, next: 100000000 },
  { name: "Legend", min: 100000000, next: null }
];

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("sanctuaryForm");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const address = document.getElementById("walletAddress").value.trim();

    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) {
      renderError("Invalid Solana wallet address.");
      return;
    }

    await verifyHolder(address);
  });
});

async function verifyHolder(address) {
  setScanning(true);
  setGuardianMessage("Let me verify this wallet on the Solana blockchain...");

  try {
    const response = await fetch("/api/check-holder", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ wallet: address })
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Holder verification failed.");
    }

    renderResult(address, Number(data.balance || 0));
  } catch (error) {
    console.error(error);
    renderError("The Solana network is busy. Please wait a moment and try again.");
  } finally {
    setScanning(false);
  }
}

function renderResult(address, balance) {
  const holder = balance > 0;
  const level = getHolderLevel(balance);
  const result = document.getElementById("sanctuaryResult");

  setText("resultWallet", abbreviateWallet(address));
  setText("resultBalance", formatToken(balance) + " SAINT");
  setText("resultRank", holder ? level.name : "Not a holder");
  setText("resultStatus", holder ? "Verified Holder" : "No SAINT Found");
  setText("resultTitle", holder ? "Wallet Verified" : "No SAINT Found");
  setText(
    "resultSubtitle",
    holder
      ? "Welcome to The Holders Sanctuary."
      : "Become a holder before entering."
  );
  setText(
    "statusText",
    holder
      ? "Verification complete. The Sanctuary is open."
      : "No SAINT balance was found."
  );

  setGuardianMessage(
    holder
      ? "Welcome, Saint. The Sanctuary awaits."
      : "I could not find SAINT in this wallet yet."
  );

  result.classList.toggle("holder-success", holder);

  const enter = document.getElementById("enterSanctuaryButton");
  const buy = document.getElementById("buySaintButton");

  if (holder) {
    enter.href = SC.telegram;
    enter.target = "_blank";
    enter.rel = "noopener";
    enter.classList.remove("disabled");
    enter.setAttribute("aria-disabled", "false");
    buy.style.display = "none";
  } else {
    enter.href = "#";
    enter.removeAttribute("target");
    enter.classList.add("disabled");
    enter.setAttribute("aria-disabled", "true");
    buy.style.display = "inline-flex";
  }

  renderProgress(balance, level);
  result.scrollIntoView({ behavior: "smooth", block: "center" });
}

function renderError(message) {
  setScanning(false);
  setText("statusText", message);
  setText("resultTitle", "Verification Error");
  setText("resultSubtitle", message);
  setText("resultStatus", "Try Again");
  setGuardianMessage("Something interrupted the verification. Please try again.");
}

function setScanning(active) {
  const button = document.getElementById("verifyButton");
  const status = document.getElementById("sanctuaryStatus");

  if (!button || !status) return;

  button.disabled = active;
  button.textContent = active ? "Scanning..." : "Verify Holder";
  status.classList.toggle("scanning", active);

  if (active) {
    setText("statusText", "Scanning the Solana blockchain...");
  }
}

function getHolderLevel(balance) {
  if (balance <= 0) {
    return { name: "Not a holder", min: 0, next: 1 };
  }

  return [...LEVELS].reverse().find((level) => balance >= level.min) || LEVELS[0];
}

function renderProgress(balance, level) {
  const bar = document.getElementById("holderProgressBar");

  if (balance <= 0) {
    bar.style.width = "0%";
    setText("rankCurrent", "No holder level");
    setText("rankNext", "Hold at least 1 SAINT");
    return;
  }

  if (!level.next) {
    bar.style.width = "100%";
    setText("rankCurrent", level.name);
    setText("rankNext", "Highest level reached");
    return;
  }

  const percentage = Math.max(
    0,
    Math.min(100, ((balance - level.min) / (level.next - level.min)) * 100)
  );

  bar.style.width = percentage + "%";
  setText("rankCurrent", level.name);
  setText(
    "rankNext",
    formatToken(Math.max(0, level.next - balance)) + " SAINT to next level"
  );
}

function setGuardianMessage(message) {
  setText("guardianMessage", message);
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function abbreviateWallet(address) {
  return address.slice(0, 6) + "..." + address.slice(-6);
}

function formatToken(value) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2
  }).format(Number(value || 0));
}


window.addEventListener("online", () => {
  const status = document.getElementById("statusText");
  if (status && status.textContent.includes("network")) {
    status.textContent = "Connection restored. You can verify the wallet again.";
  }
});

window.addEventListener("offline", () => {
  const status = document.getElementById("statusText");
  if (status) status.textContent = "You appear to be offline. Reconnect and try again.";
});


function openSanctuaryComingSoonModal() {
  const modal = document.getElementById("sanctuaryComingSoonModal");
  if (!modal) return;

  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("sanctuary-modal-open");
}

function closeSanctuaryComingSoonModal() {
  const modal = document.getElementById("sanctuaryComingSoonModal");
  if (!modal) return;

  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("sanctuary-modal-open");
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-close-sanctuary-modal]").forEach((element) => {
    element.addEventListener("click", closeSanctuaryComingSoonModal);
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeSanctuaryComingSoonModal();
  }
});
