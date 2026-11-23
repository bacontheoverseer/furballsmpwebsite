// API_URL comes from config.js
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

// ---- Skins ----
// Bedrock (Floodgate) players have UUIDs like 00000000-0000-0000-XXXX-XXXXXXXXXXXX; the last 16 hex digits are their Xbox ID.
const isBedrock = p => p.name.startsWith(".") || p.uuid.startsWith("00000000-0000-0000-");
const xuidOf = uuid => BigInt("0x" + uuid.replace(/-/g, "").slice(16)).toString();
const javaSkinUrl = name => `https://mc-heads.net/body/${encodeURIComponent(name)}/right`;
const bedrockSkins = new Map(); // xuid -> { img, steve } or null

async function getBedrockSkin(xuid) {
  if (bedrockSkins.has(xuid)) return bedrockSkins.get(xuid);
  let result = null;
  try {
    const meta = await fetch("https://api.geysermc.org/v2/skin/" + xuid).then(r => r.json());
    if (meta.texture_id) {
      const img = await new Promise((ok, no) => {
        const i = new Image(); i.onload = () => ok(i); i.onerror = no;
        i.src = "https://textures.minecraft.net/texture/" + meta.texture_id;
      });
      result = { img, steve: meta.is_steve !== false };
    }
  } catch {}
  bedrockSkins.set(xuid, result);
  return result;
}

// Draw a front-facing body from a raw 64x64 (or old 64x32) skin texture.
function drawBody({ img, steve }) {
  const c = document.createElement("canvas"); c.width = 16; c.height = 32;
  const g = c.getContext("2d"); g.imageSmoothingEnabled = false;
  const modern = img.height >= 64, aw = steve ? 4 : 3, ax = steve ? 0 : 1;
  const part = (sx, sy, sw, sh, dx, dy, flip) => {
    g.save();
    if (flip) { g.translate(dx + sw, dy); g.scale(-1, 1); g.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh); }
    else g.drawImage(img, sx, sy, sw, sh, dx, dy, sw, sh);
    g.restore();
  };
  part(4, 20, 4, 12, 4, 20);                                   // right leg
  modern ? part(20, 52, 4, 12, 8, 20) : part(4, 20, 4, 12, 8, 20, true); // left leg
  part(20, 20, 8, 12, 4, 8);                                   // body
  part(44, 20, aw, 12, ax, 8);                                 // right arm
  modern ? part(36, 52, aw, 12, 12, 8) : part(44, 20, aw, 12, 12, 8, true); // left arm
  part(8, 8, 8, 8, 4, 0); part(40, 8, 8, 8, 4, 0);            // head + hat layer
  return c;
}

async function hydrateBedrock() {
  for (const box of document.querySelectorAll(".c-art[data-xuid]")) {
    const skin = await getBedrockSkin(box.dataset.xuid);
    const old = box.querySelector("img");
    if (skin && old) old.replaceWith(drawBody(skin));
  }
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
      const r = rarityOf(p.hours), bedrock = isBedrock(p);
      p.xuid = bedrock ? xuidOf(p.uuid) : null;
      const shown = p.name.startsWith(".") ? p.name.slice(1) : p.name;
      const when = p.online ? "Online now" : p.lastSeen ? "Last seen " + ago(p.lastSeen) : "";
      return `<article class="card ${r}${p.online ? " on" : ""}">
        <div class="c-top"><span class="c-name">${esc(shown)}</span><i class="c-dot" title="${p.online ? "Online now" : "Offline"}"></i></div>
        <div class="c-art"${p.xuid ? ` data-xuid="${p.xuid}"` : ""}>
          <span class="c-rarity">${r}</span><span class="c-rank">Rank ${p.rank}</span>
          <img src="${p.xuid ? "furballlogo.png" : javaSkinUrl(shown)}" alt="${esc(shown)}'s skin" loading="lazy" onerror="this.onerror=null;this.src='furballlogo.png'">
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
    hydrateBedrock();
  }

  function tiles() {
    const t = [
      [players.length, "Players joined"],
      [players.filter(p => p.online).length, "Online now"],
      [fmt(players.reduce((s, p) => s + p.hours, 0)), "Total hours played"],
      [fmt(players.reduce((s, p) => s + p.mined, 0)), "Blocks mined"]
    ];
    $("tiles").innerHTML = t.map(([v, l]) => `<div class="stat-tile"><small>${l}</small><b>${v}</b></div>`).join("");
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
  module.exports = { normalize, mergeByName, xuidOf };
}
