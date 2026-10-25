// Furball SMP donation popup. Add <script src="donate-popup.js"></script> before </body> on the pages you want it on.
(function () {
  const ENABLED = true;          // set to false to turn the popup off
  const DELAY_MS = 4000;         // how long after the page loads it appears
  const HIDE_FOR_DAYS = 3;       // how long "Maybe later" hides it (set 0 to show on every visit, handy for testing)
  const DONATE_URL = "https://ko-fi.com/furballsmp";
  const KEY = "furball-donate-popup-hidden-until";

  if (!ENABLED) return;

  try {
    const until = Number(localStorage.getItem(KEY) || 0);
    if (until > Date.now()) return;
  } catch (e) {}

  const css = `
  .dp-overlay{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;padding:20px;background:rgba(6,3,11,.72);opacity:0;transition:opacity .25s}
  .dp-overlay.show{opacity:1}
  .dp-box{position:relative;width:min(460px,100%);padding:28px 26px 24px;text-align:center;color:var(--text,#f3efe4);
    background:var(--panel,#1e1230);border:4px solid var(--edge,#06030b);
    box-shadow:inset 4px 4px 0 var(--panel-2,#2c1b45),inset -4px -4px 0 #150c24,0 0 40px rgba(240,122,26,.35);
    transform:translateY(14px);transition:transform .25s}
  .dp-overlay.show .dp-box{transform:none}
  .dp-x{position:absolute;top:10px;right:10px;width:34px;height:34px;cursor:pointer;border:3px solid var(--edge,#06030b);
    background:var(--panel-2,#2c1b45);color:var(--text,#f3efe4);font:400 .8rem 'Press Start 2P',monospace}
  .dp-x:hover{background:var(--grass,#f07a1a);color:#fff}
  .dp-icon{font-size:2.4rem;line-height:1;margin-bottom:12px}
  .dp-box h2{margin:0 0 12px;font:400 .95rem/1.5 'Press Start 2P',monospace;color:var(--gold-l,#c9f58f)}
  .dp-box p{margin:0 auto 22px;max-width:36ch;color:var(--mute,#a9a9b8);font:600 1rem/1.6 'Nunito',sans-serif}
  .dp-actions{display:flex;flex-wrap:wrap;gap:12px;justify-content:center;align-items:center}
  .dp-later{cursor:pointer;border:0;background:none;color:var(--mute,#a9a9b8);font:800 .9rem 'Nunito',sans-serif;text-decoration:underline}
  .dp-later:hover{color:var(--text,#f3efe4)}
  @media(prefers-reduced-motion:reduce){.dp-overlay,.dp-box{transition:none}}
  `;

  function close(remember) {
    const o = document.getElementById("dp-overlay");
    if (!o) return;
    if (remember && HIDE_FOR_DAYS > 0) {
      try { localStorage.setItem(KEY, String(Date.now() + HIDE_FOR_DAYS * 864e5)); } catch (e) {}
    }
    o.classList.remove("show");
    document.removeEventListener("keydown", onKey);
    setTimeout(() => o.remove(), 250);
  }
  function onKey(e) { if (e.key === "Escape") close(true); }

  function open() {
    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);

    const o = document.createElement("div");
    o.id = "dp-overlay";
    o.className = "dp-overlay";
    o.innerHTML = `
      <div class="dp-box" role="dialog" aria-modal="true" aria-labelledby="dp-title">
        <button class="dp-x" aria-label="Close">X</button>
        <div class="dp-icon" aria-hidden="true">🧾</div>
        <h2 id="dp-title">It's that time of month</h2>
        <p>Server bills are coming up soon, and we'd really appreciate it if you would donate just $1. Every dollar helps keep Furball SMP running. Thank you!</p>
        <div class="dp-actions">
          <a class="mc-btn" href="${DONATE_URL}" target="_blank" rel="noopener">Donate $1</a>
          <button class="dp-later">Maybe later</button>
        </div>
      </div>`;
    document.body.appendChild(o);

    o.querySelector(".dp-x").addEventListener("click", () => close(true));
    o.querySelector(".dp-later").addEventListener("click", () => close(true));
    o.querySelector(".mc-btn").addEventListener("click", () => close(true));
    o.addEventListener("click", e => { if (e.target === o) close(true); });
    document.addEventListener("keydown", onKey);

    requestAnimationFrame(() => o.classList.add("show"));
    o.querySelector(".dp-x").focus();
  }

  setTimeout(open, DELAY_MS);
})();
