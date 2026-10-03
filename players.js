const RARITY = [[250,"legendary"],[100,"epic"],[50,"rare"],[10,"uncommon"],[0,"common"]];
const rarityOf = h => RARITY.find(([min]) => h >= min)[1];
const fmt = n => Math.round(n).toLocaleString();
const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

const $ = id => document.getElementById(id);
let players = [], online = new Set();

function ago(iso) {
  const d = (Date.now() - new Date(iso)) / 864e5;
  if (d < 1) return "today";
  if (d < 2) return "yesterday";
  return `${Math.floor(d)} days ago`;
}

function render() {
  const q = $("search").value.trim().toLowerCase();
  const key = $("sort").value;
  const onlyOn = $("onlineOnly").checked;
  const list = players
    .filter(p => p.name.toLowerCase().includes(q) && (!onlyOn || online.has(p.name.toLowerCase())))
    .sort((a, b) => key === "name" ? a.name.localeCompare(b.name)
      : key === "lastSeen" ? new Date(b.lastSeen) - new Date(a.lastSeen) : b[key] - a[key]);

  $("empty").hidden = list.length > 0;
  $("cards").innerHTML = list.map(p => {
    const r = rarityOf(p.hours);
    const on = online.has(p.name.toLowerCase());
    return `<article class="card ${r}${on ? " on" : ""}">
      <div class="c-top"><span class="c-name">${esc(p.name)}</span><i class="c-dot" title="${on ? "Online now" : "Offline"}"></i></div>
      <div class="c-art">
        <span class="c-rarity">${r}</span><span class="c-rank">Rank ${p.rank}</span>
        <img src="https://mc-heads.net/body/${esc(p.uuid)}/right" alt="${esc(p.name)}'s skin" loading="lazy" onerror="this.src='furball.png'">
      </div>
      <ul class="c-stats">
        <li><span>Playtime</span>${fmt(p.hours)} h</li>
        <li><span>Blocks mined</span>${fmt(p.mined)}</li>
        <li><span>Mob kills</span>${fmt(p.mobKills)}</li>
        <li><span>Deaths</span>${fmt(p.deaths)}</li>
        <li><span>Walked</span>${fmt(p.km)} km</li>
      </ul>
      <div class="c-foot">${on ? "Online now" : "Last seen " + ago(p.lastSeen)}</div>
    </article>`;
  }).join("");
}

function tilt() {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const box = $("cards");
  box.addEventListener("pointermove", e => {
    const c = e.target.closest(".card");
    if (!c) return;
    const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    c.style.setProperty("--ry", `${(x - .5) * 14}deg`);
    c.style.setProperty("--rx", `${(.5 - y) * 14}deg`);
    c.style.setProperty("--mx", `${x * 100}%`);
    c.style.setProperty("--my", `${y * 100}%`);
  });
  box.addEventListener("pointerout", e => {
    const c = e.target.closest(".card");
    if (c) { c.style.setProperty("--rx", "0deg"); c.style.setProperty("--ry", "0deg"); }
  });
}

async function init() {
  const [data, live] = await Promise.all([
    fetch("players.json", { cache: "no-cache" }).then(r => r.json()).catch(() => ({ players: [] })),
    fetch("https://api.mcsrvstat.us/3/play.furballsmp.online").then(r => r.json()).catch(() => ({}))
  ]);
  (live.players?.list || []).forEach(p => online.add(p.name.toLowerCase()));
  players = data.players.slice().sort((a, b) => b.hours - a.hours).map((p, i) => ({ ...p, rank: i + 1 }));

  const totalHours = players.reduce((s, p) => s + p.hours, 0);
  const tiles = [
    [players.length, "Players joined"],
    [live.online ? (live.players?.online ?? 0) : "–", "Online now"],
    [fmt(totalHours), "Total hours played"],
    [fmt(players.reduce((s, p) => s + p.mined, 0)), "Blocks mined"]
  ];
  $("tiles").innerHTML = tiles.map(([v, l]) => `<div class="tile"><b>${v}</b><small>${l}</small></div>`).join("");
  if (data.updated) $("updated").textContent = "Stats updated " + new Date(data.updated).toLocaleString();

  ["search", "sort", "onlineOnly"].forEach(id => $(id).addEventListener("input", render));
  tilt();
  render();
}
init();
