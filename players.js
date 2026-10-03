// Change this if your test link used a different address or port.
const API_URL = "http://play.furballsmp.online:25601/moss/players?stats=true";
const FALLBACK_URL = "players.json"; // used only if the live feed can't be reached
const REFRESH_MS = 120000;

const RARITY = [[250, "legendary"], [100, "epic"], [50, "rare"], [10, "uncommon"], [0, "common"]];
const rarityOf = h => RARITY.find(([min]) => h >= min)[1];
const fmt = n => Math.round(n).toLocaleString();
const fmtH = h => (h < 10 ? h.toFixed(1) : fmt(h));
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const sum = o => Object.values(o || {}).reduce((a, b) => a + (+b || 0), 0);

// Turn one entry from the live feed into the flat shape the cards use.
function normalize(p) {
  if (!p.stats) return { ...p, online: !!p.online, lastSeen: p.lastSeen || null }; // old flat players.json
  const s = p.stats.stats || {}, c = s["minecraft:custom"] || {}, a = p.activity || {};
  const ticks = c["minecraft:play_time"] ?? c["minecraft:play_one_minute"] ?? a.playtime_ticks ?? 0;
  return {
    uuid: p.uuid, name: p.name || p.uuid.slice(0, 8), online: !!p.online,
    hours: ticks / 72000, mined: sum(s["minecraft:mined"]),
    mobKills: c["minecraft:mob_kills"] || 0, deaths: c["minecraft:deaths"] || 0,
    km: ((c["minecraft:walk_one_cm"] || 0) + (c["minecraft:sprint_one_cm"] || 0)) / 100000,
    lastSeen: a.last_seen_iso || null
  };
}

// Same person can appear twice (online + offline-mode UUIDs), so combine by name.
function mergeByName(list) {
  const map = new Map();
  for (const p of list) {
    const key = p.name.toLowerCase(), o = map.get(key);
    if (!o) { map.set(key, { ...p }); continue; }
    const realUuid = u => u[14] === "4";
    if ((realUuid(p.uuid) && !realUuid(o.uuid)) || (realUuid(p.uuid) === realUuid(o.uuid) && p.hours > o.hours)) o.uuid = p.uuid;
    ["hours", "mined", "mobKills", "deaths", "km"].forEach(k => (o[k] += p[k]));
    o.online = o.online || p.online;
    if (p.lastSeen && (!o.lastSeen || p.lastSeen > o.lastSeen)) o.lastSeen = p.lastSeen;
  }
  return [...map.values()];
}

if (typeof document !== "undefined") {
  const $ = id => document.getElementById(id);
  let players = [], live = false;

  const ago = iso => {
    if (!iso) return "";
    const d = (Date.now() - new Date(iso)) / 864e5;
    return d < 1 ? "today" : d < 2 ? "yesterday" : `${Math.floor(d)} days ago`;
  };

  function render() {
    const q = $("search").value.trim().toLowerCase();
    const key = $("sort").value, onlyOn = $("onlineOnly").checked;
    const list = players
      .filter(p => p.name.toLowerCase().includes(q) && (!onlyOn || p.online))
      .sort((a, b) => key === "name" ? a.name.localeCompare(b.name)
        : key === "lastSeen" ? new Date(b.lastSeen || 0) - new Date(a.lastSeen || 0) : b[key] - a[key]);

    $("empty").hidden = list.length > 0;
    $("cards").innerHTML = list.map(p => {
      const r = rarityOf(p.hours), bedrock = p.name.startsWith(".");
      const when = p.online ? "Online now" : p.lastSeen ? "Last seen " + ago(p.lastSeen) : "";
      return `<article class="card ${r}${p.online ? " on" : ""}">
        <div class="c-top"><span class="c-name">${esc(bedrock ? p.name.slice(1) : p.name)}</span><i class="c-dot" title="${p.online ? "Online now" : "Offline"}"></i></div>
        <div class="c-art">
          <span class="c-rarity">${r}</span><span class="c-rank">Rank ${p.rank}</span>
          <img src="https://mc-heads.net/body/${esc(p.uuid)}/right" alt="${esc(p.name)}'s skin" loading="lazy" onerror="this.onerror=null;this.src='furball.png'">
        </div>
        <ul class="c-stats">
          <li><span>Playtime</span>${fmtH(p.hours)} h</li>
          <li><span>Blocks mined</span>${fmt(p.mined)}</li>
          <li><span>Mob kills</span>${fmt(p.mobKills)}</li>
          <li><span>Deaths</span>${fmt(p.deaths)}</li>
          <li><span>On foot</span>${fmt(p.km)} km</li>
        </ul>
        <div class="c-foot">${bedrock ? "Bedrock · " : ""}${when}</div>
      </article>`;
    }).join("");
  }

  function tiles() {
    const t = [
      [players.length, "Players joined"],
      [players.filter(p => p.online).length, "Online now"],
      [fmt(players.reduce((s, p) => s + p.hours, 0)), "Total hours played"],
      [fmt(players.reduce((s, p) => s + p.mined, 0)), "Blocks mined"]
    ];
    $("tiles").innerHTML = t.map(([v, l]) => `<div class="tile"><b>${v}</b><small>${l}</small></div>`).join("");
    $("updated").textContent = live ? "Live from the server. Refreshes every couple of minutes." : "Showing a saved snapshot (the live feed couldn't be reached).";
  }

  async function load() {
    let raw;
    try {
      const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 15000);
      raw = await fetch(API_URL, { signal: ctl.signal }).then(r => r.json());
      clearTimeout(t); live = true;
    } catch {
      live = false;
      raw = await fetch(FALLBACK_URL, { cache: "no-cache" }).then(r => r.json()).catch(() => ({ players: [] }));
    }
    players = mergeByName((raw.players || []).map(normalize))
      .sort((a, b) => b.hours - a.hours).map((p, i) => ({ ...p, rank: i + 1 }));
    tiles(); render();
  }

  function tilt() {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const box = $("cards");
    box.addEventListener("pointermove", e => {
      const c = e.target.closest(".card"); if (!c) return;
      const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      c.style.setProperty("--ry", `${(x - .5) * 14}deg`); c.style.setProperty("--rx", `${(.5 - y) * 14}deg`);
      c.style.setProperty("--mx", `${x * 100}%`); c.style.setProperty("--my", `${y * 100}%`);
    });
    box.addEventListener("pointerout", e => {
      const c = e.target.closest(".card");
      if (c) { c.style.setProperty("--rx", "0deg"); c.style.setProperty("--ry", "0deg"); }
    });
  }

  ["search", "sort", "onlineOnly"].forEach(id => $(id).addEventListener("input", render));
  tilt(); load(); setInterval(load, REFRESH_MS);
} else {
  module.exports = { normalize, mergeByName };
}
