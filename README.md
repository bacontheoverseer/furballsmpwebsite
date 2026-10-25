# Furball SMP Website

The website for **Furball SMP**, a small survival Minecraft community (Java and Bedrock).
It's a plain static site with no build step and no framework: HTML, CSS and a little JavaScript, in a blocky Minecraft style.

Live site: https://www.furballsmp.online

## Features

- **Landing page** with server IP copy button, feature cards, "how to join" steps, house rules and Java and Bedrock connection info
- **Players page** with a live trading card for every player: skin, rarity, playtime, blocks mined, mob kills, deaths and distance, plus search, sorting and an "online now" filter
- **Seasonal themes**, such as the Halloween theme and its event guide
- **Live chat** through [Crisp](https://crisp.chat)
- **Donations** through [Ko-fi](https://ko-fi.com): a floating Donate button, a `/tip` redirect and an optional monthly donation popup
- Fully responsive, and animations respect `prefers-reduced-motion`

## Project structure

| File | What it does |
| --- | --- |
| `index.html` | Homepage |
| `players.html` | Player trading cards page |
| `community.html` | Community page |
| `tip.html` | Short redirect page for `furballsmp.online/tip` (sends visitors to Ko-fi) |
| `style.css` | Main stylesheet (colors, buttons, layout, seasonal theme) |
| `stats.css` | Extra styles for the Players page cards |
| `script.js` | Copy-IP buttons and the live server status badge |
| `players.js` | Loads player stats and builds the trading cards |
| `config.js` | **Settings you edit:** the address of the stats feed |
| `crisp.js` | Loads the Crisp chat widget (add your Website ID) |
| `kofi.js` | Loads the Ko-fi donate button |
| `donate-popup.js` | Optional donation popup (can be switched off) |
| `players.json` | Sample player data, shown only if the live feed can't be reached |
| `furball.png`, `furballlogo.png` | Mascot and logo images |

If your repo keeps a normal theme and a seasonal theme in separate folders, each folder contains its own `index.html` and `style.css`, and the other files are shared.

## Run it locally

No install is needed. From the project folder:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000. Serving the files, rather than double-clicking them, lets the Players page load its data.

## Configuration

### Player stats feed (`config.js`)

```js
const API_URL = "https://your-worker-name.your-account.workers.dev/";
```

Set this to the HTTPS address of your stats feed (see [How the Players page works](#how-the-players-page-works)). If the feed can't be reached, the page falls back to `players.json` and says so at the bottom.

### Live chat (`crisp.js`)

Open `crisp.js` and replace `PASTE-YOUR-WEBSITE-ID-HERE` with your Crisp Website ID (Crisp dashboard, then Settings, then Website Settings, then Setup instructions). Until you do, the script does nothing.

### Donations

- **Ko-fi button:** `kofi.js` draws the floating Donate button for the page `ko-fi.com/furballsmp`. Change the page name or colors inside the file.
- **/tip redirect:** upload `tip.html` (or a `tip/index.html`) and `/tip` forwards to your Ko-fi page.
- **Donation popup:** add `<script src="donate-popup.js"></script>` before `</body>` on any page that should show it. At the top of `donate-popup.js` you can change `ENABLED`, `DELAY_MS`, `HIDE_FOR_DAYS` and `DONATE_URL`. Set `ENABLED` to `false`, or remove the script line, to turn it off.

## How the Players page works

```
Minecraft server
   -> PlayerStatsAPI plugin (web feed on port 25601)
   -> Cloudflare Worker (adds HTTPS and CORS)
   -> players.js in the browser
   -> trading cards
```

1. The [PlayerStatsAPI](https://modrinth.com/plugin/playerstats-api) plugin reads Minecraft's stat files and serves them at `/moss/players?stats=true`.
2. Browsers block an `https://` page from reading a plain `http://` feed, so a small free **Cloudflare Worker** sits in the middle and forwards the data over HTTPS:

   ```js
   export default {
     async fetch() {
       const r = await fetch("http://YOUR-SERVER-ADDRESS:25601/moss/players?stats=true");
       return new Response(r.body, {
         status: r.status,
         headers: {
           "content-type": "application/json",
           "access-control-allow-origin": "*",
           "cache-control": "public, max-age=60"
         }
       });
     }
   };
   ```

3. `players.js` turns each entry into a card and refreshes every couple of minutes.

Details that are handled in `players.js`:

- **Rarity** comes from hours played: Common (under 10), Uncommon (10+), Rare (50+), Epic (100+), Legendary (250+)
- **Duplicate accounts:** the same name under two different IDs is merged into one card
- **Skins:** Java skins come from [mc-heads.net](https://mc-heads.net); Bedrock (Floodgate) skins are drawn from the [Geyser Global API](https://geysermc.org), falling back to the mascot when none is found
- **Bedrock names** that start with `.` are shown without the dot and tagged "Bedrock"

> **Privacy note:** the plugin's feed includes every player's full stats (items used, crafted, mined and so on), not just what the cards show. If you want some of that to stay private, make the Worker return only the fields the site needs.

## Themes

The default theme and the seasonal theme (for example the Halloween theme) share the same pages and scripts. To switch themes, replace `index.html` and `style.css` with the version from the theme's folder, then re-upload. The Players page picks up the theme's colors automatically.

## Deploying

Any static host works (GitHub Pages, Cloudflare Pages, Netlify, or a normal web host). Upload the files as they are. If you use Pages hosting, `furballsmp.online/tip` should work from `tip.html`. On other hosts you may need a `tip/index.html` instead.

## Credits

- [PlayerStatsAPI](https://modrinth.com/plugin/playerstats-api) for the stats feed
- [Geyser and Floodgate](https://geysermc.org) for Bedrock support
- [Halloween plugin by Softici](https://softici.gitlab.io/halloween/) for the seasonal event
- [mc-heads.net](https://mc-heads.net) for Java skin renders
- Fonts: [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P) and [Nunito](https://fonts.google.com/specimen/Nunito)

## Contact

- Grief reports: griefed@furballsmp.online
- Everything else: support@furballsmp.online

## License

- **Code:** MIT License. See [LICENSE](LICENSE). Copyright (c) 2026 Furball SMP.
- **Artwork and imagery:** The Furball SMP name, logo, mascot and other artwork
  (for example `furball.png` and `furballlogo.png`) are property of Furball SMP and
  are licensed under [CC BY-NC-ND 4.0](https://creativecommons.org/licenses/by-nc-nd/4.0/).
  They are **not** covered by the MIT license. If you fork this project, please
  replace them with your own.
