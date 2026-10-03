#!/usr/bin/env node
// Builds players.json from the Minecraft server's own stats files. No mod needed.
// Usage: node export-stats.js /path/to/server /path/to/website/players.json
// Needs Node 18+. Set WORLD=<folder name> if your world isn't called "world".
const fs = require("fs"), path = require("path");
const [serverDir = ".", out = "players.json"] = process.argv.slice(2);
const statsDir = path.join(serverDir, process.env.WORLD || "world", "stats");

const names = {};
try {
  for (const u of JSON.parse(fs.readFileSync(path.join(serverDir, "usercache.json"), "utf8")))
    names[u.uuid] = u.name;
} catch {}

(async () => {
  const players = [];
  for (const f of fs.readdirSync(statsDir).filter(f => f.endsWith(".json"))) {
    const uuid = f.slice(0, -5), file = path.join(statsDir, f);
    const s = JSON.parse(fs.readFileSync(file, "utf8")).stats || {};
    const c = s["minecraft:custom"] || {};
    const ticks = c["minecraft:play_time"] ?? c["minecraft:play_one_minute"] ?? 0;
    const sum = o => Object.values(o || {}).reduce((a, b) => a + b, 0);
    if (!names[uuid]) {
      try {
        const r = await fetch(`https://sessionserver.mojang.com/session/minecraft/profile/${uuid.replace(/-/g, "")}`);
        names[uuid] = (await r.json()).name;
      } catch {}
    }
    players.push({
      uuid, name: names[uuid] || uuid.slice(0, 8),
      hours: +(ticks / 72000).toFixed(1),
      mined: sum(s["minecraft:mined"]),
      mobKills: c["minecraft:mob_kills"] || 0,
      deaths: c["minecraft:deaths"] || 0,
      km: +((c["minecraft:walk_one_cm"] || 0) / 100000).toFixed(1),
      jumps: c["minecraft:jump"] || 0,
      lastSeen: fs.statSync(file).mtime.toISOString()
    });
  }
  fs.writeFileSync(out, JSON.stringify({ updated: new Date().toISOString(), players }, null, 1));
  console.log(`Wrote ${players.length} players to ${out}`);
})();
