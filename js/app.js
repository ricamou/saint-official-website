
(function(){
const T={"en": {"label": "English", "home": "Home", "vision": "Vision", "transparency": "Transparency", "creator": "Creator Fund", "community": "Community", "contact": "Contact", "buy": "Buy", "heroTitle": "A Web3 Movement Built for Trust.", "heroSubtitle": "A Crypto Community With a Soul.", "heroText": "$SAINT is a Solana-powered community movement designed around transparency, purpose, and long-term trust.", "pump": "Buy on Pump.fun", "phantom": "Open Phantom", "dashboard": "Live Dashboard", "copy": "Copy", "ca": "Official CA", "join": "Join The Movement", "become": "Become a Saint.", "footer": "A Crypto Community With a Soul.", "contactTitle": "Let's Build Something Together.", "contactText": "Use the form below to prepare an email to the official SAINT contact address.", "send": "Send Message", "name": "Full Name", "email": "Email", "subject": "Subject", "reason": "Reason", "message": "Message", "thanks": "✅ Thank you!", "thanksText": "Your email application has been opened. Please send the message from there, and we’ll get back to you as soon as possible."}, "pt": {"label": "Português", "home": "Início", "vision": "Visão", "transparency": "Transparência", "creator": "Creator Fund", "community": "Comunidade", "contact": "Contato", "buy": "Comprar", "heroTitle": "Um movimento Web3 construído para gerar confiança.", "heroSubtitle": "Uma comunidade cripto com alma.", "heroText": "$SAINT é um movimento comunitário na Solana, criado em torno de transparência, propósito e confiança de longo prazo.", "pump": "Comprar na Pump.fun", "phantom": "Abrir Phantom", "dashboard": "Dashboard ao Vivo", "copy": "Copiar", "ca": "CA Oficial", "join": "Junte-se ao Movimento", "become": "Torne-se um Santo.", "footer": "Uma comunidade cripto com alma.", "contactTitle": "Vamos construir algo juntos.", "contactText": "Use o formulário abaixo para preparar um e-mail para o contato oficial da SAINT.", "send": "Enviar Mensagem", "name": "Nome completo", "email": "E-mail", "subject": "Assunto", "reason": "Motivo", "message": "Mensagem", "thanks": "✅ Obrigado!", "thanksText": "Seu aplicativo de e-mail foi aberto. Envie a mensagem por lá e responderemos o mais rápido possível."}, "es": {"label": "Español", "home": "Inicio", "vision": "Visión", "transparency": "Transparencia", "creator": "Creator Fund", "community": "Comunidad", "contact": "Contacto", "buy": "Comprar", "heroTitle": "Un movimiento Web3 construido para generar confianza.", "heroSubtitle": "Una comunidad cripto con alma.", "heroText": "$SAINT es un movimiento comunitario en Solana, creado alrededor de la transparencia, el propósito y la confianza a largo plazo.", "pump": "Comprar en Pump.fun", "phantom": "Abrir Phantom", "dashboard": "Dashboard en Vivo", "copy": "Copiar", "ca": "CA Oficial", "join": "Únete al Movimiento", "become": "Conviértete en un Saint.", "footer": "Una comunidad cripto con alma.", "contactTitle": "Construyamos algo juntos.", "contactText": "Usa el formulario para preparar un correo al contacto oficial de SAINT.", "send": "Enviar Mensaje", "name": "Nombre completo", "email": "Correo", "subject": "Asunto", "reason": "Motivo", "message": "Mensaje", "thanks": "✅ ¡Gracias!", "thanksText": "Tu aplicación de correo fue abierta. Envía el mensaje desde allí y responderemos lo antes posible."}, "zh": {"label": "中文", "home": "首页", "vision": "愿景", "transparency": "透明度", "creator": "创作者基金", "community": "社区", "contact": "联系", "buy": "购买", "heroTitle": "一个为信任而生的 Web3 运动。", "heroSubtitle": "一个有灵魂的加密社区。", "heroText": "$SAINT 是一个基于 Solana 的社区运动，围绕透明度、使命感和长期信任而建立。", "pump": "在 Pump.fun 购买", "phantom": "打开 Phantom", "dashboard": "实时仪表盘", "copy": "复制", "ca": "官方 CA", "join": "加入运动", "become": "成为一名 Saint。", "footer": "一个有灵魂的加密社区。", "contactTitle": "让我们一起构建未来。", "contactText": "使用下方表单准备发送至 SAINT 官方邮箱的邮件。", "send": "发送消息", "name": "姓名", "email": "邮箱", "subject": "主题", "reason": "原因", "message": "消息", "thanks": "✅ 谢谢！", "thanksText": "你的邮件应用已打开。请在那里发送消息，我们会尽快回复。"}};
function lang(){const s=localStorage.getItem('saint-lang');if(s&&T[s])return s;const n=(navigator.language||'en').toLowerCase();if(n.startsWith('pt'))return'pt';if(n.startsWith('es'))return'es';if(n.startsWith('zh'))return'zh';return'en'}
function set(l){if(!T[l])l='en';localStorage.setItem('saint-lang',l);document.documentElement.lang=l==='zh'?'zh-CN':l;document.querySelectorAll('[data-i18n]').forEach(e=>{const k=e.dataset.i18n;if(T[l][k])e.textContent=T[l][k]});document.querySelectorAll('[data-i18n-placeholder]').forEach(e=>{const k=e.dataset.i18nPlaceholder;if(T[l][k])e.placeholder=T[l][k]});document.querySelectorAll('[data-lang-current]').forEach(e=>e.textContent=T[l].label)}
window.setSaintLanguage=set;document.addEventListener('DOMContentLoaded',()=>{set(lang());document.querySelectorAll('[data-lang]').forEach(b=>b.onclick=()=>set(b.dataset.lang))})
})();


const CONFIG = window.SAINT_CONFIG;
const root = document.documentElement;
const savedTheme = localStorage.getItem("saint-theme");
if (savedTheme) root.setAttribute("data-theme", savedTheme);

window.addEventListener("load", () => {
  document.getElementById("loader")?.classList.add("hidden");
  createParticles();
  fetchDexData();
});

function copyContract() {
  navigator.clipboard.writeText(CONFIG.contract).then(() => showToast("CA copied")).catch(() => showToast(CONFIG.contract));
}
function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2200);
}

document.getElementById("themeToggle")?.addEventListener("click", () => {
  const next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
  root.setAttribute("data-theme", next);
  localStorage.setItem("saint-theme", next);
});
const navbar = document.getElementById("navbar");
window.addEventListener("scroll", () => navbar?.classList.toggle("scrolled", window.scrollY > 40));

const menuToggle = document.getElementById("menuToggle");
const mobileNav = document.getElementById("mobileNav");
menuToggle?.addEventListener("click", () => {
  mobileNav.classList.toggle("open");
  document.body.classList.toggle("menu-open");
});
mobileNav?.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => {
  mobileNav.classList.remove("open");
  document.body.classList.remove("menu-open");
}));

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) entry.target.classList.add("visible");
  });
}, { threshold: 0.13 });
document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));

document.getElementById("refreshData")?.addEventListener("click", fetchDexData);

function formatUsd(value, compact = true) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  if (n < 0.01 && n > 0) return "$" + n.toPrecision(3);
  return new Intl.NumberFormat("en-US", { style:"currency", currency:"USD", notation: compact ? "compact" : "standard", maximumFractionDigits: n < 1 ? 6 : 2 }).format(n);
}
function formatNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US", { notation:"compact", maximumFractionDigits:2 }).format(n);
}
function setText(id, value) { document.querySelectorAll(`#${id}`).forEach((el) => el.textContent = value); }

async function fetchDexData() {
  const status = document.getElementById("dataStatus");
  if (!status || !CONFIG?.dexApi) return;
  status.textContent = "Loading live data…";
  try {
    const res = await fetch(CONFIG.dexApi, { cache: "no-store" });
    if (!res.ok) throw new Error("DexScreener API unavailable");
    const data = await res.json();
    const pairs = Array.isArray(data) ? data : (data.pairs || []);
    if (!pairs.length) throw new Error("No pair data found");
    const best = pairs.filter(p => p.chainId === "solana").sort((a,b) => Number(b?.liquidity?.usd || 0) - Number(a?.liquidity?.usd || 0))[0] || pairs[0];

    const buys = Number(best?.txns?.h24?.buys || 0);
    const sells = Number(best?.txns?.h24?.sells || 0);
    const change = Number(best?.priceChange?.h24);
    const liq = Number(best?.liquidity?.usd || 0);
    const vol = Number(best?.volume?.h24 || 0);
    const txns = buys + sells;

    setText("priceUsd", formatUsd(best?.priceUsd, false));
    setText("marketCap", formatUsd(best?.marketCap || best?.fdv));
    setText("liquidity", formatUsd(liq));
    setText("volume24h", formatUsd(vol));
    setText("txns24h", formatNumber(txns));
    setText("txnsSplit", `${formatNumber(buys)} buys / ${formatNumber(sells)} sells`);
    setText("priceChange", Number.isFinite(change) ? `24h ${change >= 0 ? "+" : ""}${change.toFixed(2)}%` : "24h —");

    const score = calculateHealthScore({ liq, vol, txns, change });
    setHealth(score);
    drawPulseChart([liq, vol, txns * 25, Math.abs(change || 0) * 1000, (best?.marketCap || best?.fdv || 0) / 20]);

    status.textContent = `Live data loaded · ${best.dexId || "DEX"}`;
  } catch (err) {
    status.textContent = "Live data unavailable — open DexScreener";
    setHealth(null);
    drawPulseChart([20,40,35,55,42,68,50]);
    console.warn(err);
  }
}
function calculateHealthScore({ liq, vol, txns, change }) {
  let score = 35;
  score += Math.min(liq / 1500, 25);
  score += Math.min(vol / 1500, 20);
  score += Math.min(txns / 8, 15);
  if (Number.isFinite(change)) score += Math.max(-10, Math.min(10, change / 2));
  return Math.max(0, Math.min(100, Math.round(score)));
}
function setHealth(score) {
  const ring = document.querySelector(".score-ring");
  const scoreEl = document.getElementById("healthScore");
  const label = document.getElementById("healthLabel");
  const desc = document.getElementById("healthDescription");
  if (!ring || !scoreEl) return;
  if (score === null) {
    scoreEl.textContent = "—";
    label && (label.textContent = "Waiting for data");
    desc && (desc.textContent = "Open DexScreener to verify live market data.");
    return;
  }
  scoreEl.textContent = score;
  ring.style.background = `conic-gradient(var(--gold) ${score * 3.6}deg, rgba(255,255,255,.12) 0deg)`;
  label && (label.textContent = score >= 75 ? "Strong signal" : score >= 50 ? "Developing signal" : "Early signal");
  desc && (desc.textContent = "Score based on liquidity, volume, transactions, and price activity.");
}
function drawPulseChart(values) {
  const canvas = document.getElementById("pulseChart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0,0,w,h);
  const max = Math.max(...values, 1);
  const points = values.map((v,i) => ({
    x: 30 + i * ((w-60)/(values.length-1 || 1)),
    y: h - 30 - (v/max)*(h-60)
  }));
  ctx.strokeStyle = "rgba(230,195,106,.18)";
  ctx.lineWidth = 1;
  for (let y=30; y<h; y+=30){ ctx.beginPath(); ctx.moveTo(20,y); ctx.lineTo(w-20,y); ctx.stroke(); }
  const grad = ctx.createLinearGradient(0,0,w,0);
  grad.addColorStop(0,"#e6c36a"); grad.addColorStop(1,"#7cc7ff");
  ctx.strokeStyle = grad; ctx.lineWidth = 4; ctx.lineCap = "round";
  ctx.beginPath();
  points.forEach((p,i)=> i ? ctx.lineTo(p.x,p.y) : ctx.moveTo(p.x,p.y));
  ctx.stroke();
  points.forEach(p => { ctx.fillStyle = "#e6c36a"; ctx.beginPath(); ctx.arc(p.x,p.y,4,0,Math.PI*2); ctx.fill(); });
}
function createParticles() {
  const field = document.getElementById("particleField");
  if (!field) return;
  for (let i=0; i<46; i++) {
    const dot = document.createElement("i");
    dot.style.left = Math.random()*100 + "%";
    dot.style.top = Math.random()*100 + "%";
    dot.style.animationDuration = (6 + Math.random()*8) + "s";
    dot.style.animationDelay = (-Math.random()*8) + "s";
    field.appendChild(dot);
  }
}


function openPhantomApp(event) {
  if (event) event.preventDefault();

  showToast("Opening Phantom...");

  const startedAt = Date.now();

  // Attempts to open the Phantom app directly.
  window.location.href = "phantom://";

  // If the app does not open, send the user to the official Phantom download page.
  setTimeout(() => {
    if (Date.now() - startedAt < 2200) {
      window.location.href = "https://phantom.app/download";
    }
  }, 1400);
}


/* v4.2 first-visit language modal */
function chooseInitialLanguage(lang) {
  localStorage.setItem("saint-lang", lang);
  localStorage.setItem("saint-language-confirmed", "true");

  if (typeof window.setSaintLanguage === "function") {
    window.setSaintLanguage(lang);
  }

  const modal = document.getElementById("languageModal");
  if (modal) {
    modal.classList.add("hidden");
    setTimeout(() => modal.remove(), 320);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("languageModal");
  if (!modal) return;

  const confirmed = localStorage.getItem("saint-language-confirmed") === "true";

  if (confirmed) {
    modal.remove();
    return;
  }

  document.body.classList.add("language-modal-open");
});
