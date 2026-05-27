const express = require("express");
const { parseM3U, groupContent } = require("./parse-m3u");

const app  = express();
const PORT = process.env.PORT || 7000;

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  next();
});

// ─────────────────────────────────────────────
// CACHE POR USUARIO
// ─────────────────────────────────────────────

const userCache = new Map();
const CACHE_TTL = 6 * 60 * 60 * 1000;
const MAX_USERS = 200;

// ─────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────

function decodeConfig(str) {
  try {
    const config = JSON.parse(Buffer.from(str, "base64").toString("utf8"));
    if (!Array.isArray(config.m3uUrls) || !config.m3uUrls.length) return null;
    return config;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────
// NORMALIZE
// ─────────────────────────────────────────────

function normalize(str = "") {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(19|20)\d{2}\b/g, "")
    .replace(/1080p|720p|2160p|4k|hdr|webrip|bluray|x264|x265/gi, "")
    .replace(/latino|castellano|dual|subtitulado|sub/gi, "")
    .replace(/s\d{1,2}e\d{1,2}/gi, "")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ─────────────────────────────────────────────
// TMDB
// ─────────────────────────────────────────────

async function searchTMDB(title, type, tmdbCache, apiKey) {
  if (!apiKey) return null;
  const clean = normalize(title);
  if (clean in tmdbCache) return tmdbCache[clean];
  try {
    const endpoint  = type === "series" ? "tv" : "movie";
    const searchRes = await fetch(
      `https://api.themoviedb.org/3/search/${endpoint}?api_key=${apiKey}&query=${encodeURIComponent(clean)}&language=es-MX`
    );
    const data = await searchRes.json();
    if (!data.results?.length) { tmdbCache[clean] = null; return null; }
    const detRes = await fetch(
      `https://api.themoviedb.org/3/${endpoint}/${data.results[0].id}/external_ids?api_key=${apiKey}`
    );
    const det  = await detRes.json();
    const imdb = det.imdb_id || null;
    tmdbCache[clean] = imdb;
    return imdb;
  } catch {
    tmdbCache[clean] = null;
    return null;
  }
}

async function prefetchTMDB(userData) {
  const { movies, series, tmdbCache, movieImdbIndex, seriesImdbIndex, apiKey } = userData;
  if (!apiKey) return;
  for (const movie of movies) {
    if (movie.id.startsWith("tt")) continue;
    const imdb = await searchTMDB(movie.title, "movie", tmdbCache, apiKey);
    if (imdb) { movieImdbIndex[imdb] = movie.id; movie.id = imdb; }
    await sleep(300);
  }
  for (const show of Object.values(series)) {
    if (show.id.startsWith("tt")) continue;
    const imdb = await searchTMDB(show.title, "series", tmdbCache, apiKey);
    if (imdb) { seriesImdbIndex[imdb] = show.id; show.id = imdb; }
    await sleep(300);
  }
}

// ─────────────────────────────────────────────
// CARGAR LISTA
// ─────────────────────────────────────────────

async function loadList(m3uUrls) {
  let allItems = [];
  for (const url of m3uUrls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      allItems = allItems.concat(parseM3U(await res.text()));
    } catch (err) {
      console.error(`❌ Error descargando ${url}:`, err.message);
    }
  }
  return groupContent(allItems);
}

// ─────────────────────────────────────────────
// CACHE DE USUARIO
// ─────────────────────────────────────────────

async function getUserData(configHash, config) {
  const now = Date.now();
  if (userCache.has(configHash)) {
    const cached = userCache.get(configHash);
    if (now - cached.loadedAt < CACHE_TTL) return cached;
  }
  if (userCache.size >= MAX_USERS) {
    const oldest = [...userCache.entries()].sort((a, b) => a[1].loadedAt - b[1].loadedAt)[0];
    userCache.delete(oldest[0]);
  }
  const { movies, series } = await loadList(config.m3uUrls);
  const userData = {
    movies,
    series,
    tmdbCache:       {},
    movieImdbIndex:  {},
    seriesImdbIndex: {},
    apiKey:          config.tmdbApiKey || null,
    loadedAt:        now
  };
  userCache.set(configHash, userData);
  prefetchTMDB(userData).catch(err => console.error("❌ Error en pre-carga TMDB:", err));
  return userData;
}

// ─────────────────────────────────────────────
// LOGO
// ─────────────────────────────────────────────

const LOGO_SVG = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 256 256'>
  <defs>
    <linearGradient id='bg' x1='0%' y1='0%' x2='100%' y2='100%'>
      <stop offset='0%' stop-color='#1a1a2e'/><stop offset='100%' stop-color='#0f3460'/>
    </linearGradient>
    <linearGradient id='txt' x1='0%' y1='0%' x2='100%' y2='0%'>
      <stop offset='0%' stop-color='#00d4ff'/><stop offset='100%' stop-color='#0077ff'/>
    </linearGradient>
  </defs>
  <rect width='256' height='256' rx='48' fill='url(#bg)'/>
  <rect x='20' y='20' width='216' height='216' rx='36' fill='none' stroke='#00d4ff' stroke-width='3' stroke-opacity='0.3'/>
  <text x='128' y='168' font-family='Arial Black,sans-serif' font-size='96' font-weight='900' text-anchor='middle' fill='url(#txt)'>M3U</text>
</svg>`;
const LOGO = `data:image/svg+xml;base64,${Buffer.from(LOGO_SVG).toString("base64")}`;

// ─────────────────────────────────────────────
// RUTAS
// ─────────────────────────────────────────────

app.get("/", (req, res) => res.redirect("/configure"));

app.get("/manifest.json", (req, res) => {
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  res.json({
    id:          "com.m3uiptv.public",
    version:     "1.0.0",
    name:        "M3U IPTV",
    description: "Stream your personal M3U playlist or Xtream Codes IPTV in Stremio. Auto-resolves IMDb IDs via TMDB.",
    logo:        LOGO,
    resources:   ["catalog", "stream", "meta"],
    types:       ["movie", "series"],
    catalogs: [
      {
        type:  "movie",
        id:    "m3u_movies",
        name:  "🎬 My Movies",
        extra: [{ name: "search", isRequired: false }]
      },
      {
        type:  "series",
        id:    "m3u_series",
        name:  "📺 My Series",
        extra: [{ name: "search", isRequired: false }]
      }
    ],
    behaviorHints: {
      configurable:          true,
      configurationRequired: true,
      configureUrl:          `${baseUrl}/configure`
    }
  });
});

app.get("/configure", (req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(CONFIGURE_HTML);
});

app.get("/:config/manifest.json", (req, res) => {
  const config = decodeConfig(req.params.config);
  if (!config) return res.status(400).json({ error: "Config inválida" });
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  res.json({
    id:          "com.m3uiptv.public",
    version:     "1.0.0",
    name:        "M3U IPTV",
    description: "Reproduce tu lista M3U personal en Stremio con IDs IMDb automáticos",
    logo:        LOGO,
    resources:   ["catalog", "stream", "meta"],
    types:       ["movie", "series"],
    catalogs: [
      {
        type:  "movie",
        id:    "m3u_movies",
        name:  "🎬 Mis Películas",
        extra: [{ name: "search", isRequired: false }, { name: "skip", isRequired: false }]
      },
      {
        type:  "series",
        id:    "m3u_series",
        name:  "📺 Mis Series",
        extra: [{ name: "search", isRequired: false }, { name: "skip", isRequired: false }]
      }
    ],
    behaviorHints: {
      configurable:  true,
      configureUrl:  `${baseUrl}/configure`
    }
  });
});

app.get("/:config/catalog/:type/:id.json",        handleCatalog);
app.get("/:config/catalog/:type/:id/:extra.json", handleCatalog);

async function handleCatalog(req, res) {
  try {
    const config = decodeConfig(req.params.config);
    if (!config) return res.json({ metas: [] });
    const { type, id } = req.params;
    const extra  = req.params.extra ? Object.fromEntries(new URLSearchParams(req.params.extra)) : {};
    const search = extra.search ? normalize(extra.search) : null;
    const skip   = parseInt(extra.skip || "0", 10);
    const PAGE   = 100;
    const data   = await getUserData(req.params.config, config);
    if (type === "movie" && id === "m3u_movies") {
      let results = data.movies;
      if (search) results = results.filter(m => normalize(m.title).includes(search));
      return res.json({ metas: results.slice(skip, skip + PAGE).map(m => ({ id: m.id, type: "movie", name: m.title, poster: m.poster })) });
    }
    if (type === "series" && id === "m3u_series") {
      let results = Object.values(data.series);
      if (search) results = results.filter(s => normalize(s.title).includes(search));
      return res.json({ metas: results.slice(skip, skip + PAGE).map(s => ({ id: s.id, type: "series", name: s.title, poster: s.poster })) });
    }
    res.json({ metas: [] });
  } catch (err) {
    console.error("❌ Catalog error:", err);
    res.json({ metas: [] });
  }
}

app.get("/:config/meta/:type/:id.json", async (req, res) => {
  try {
    const config = decodeConfig(req.params.config);
    if (!config) return res.json({ meta: null });
    const { type, id } = req.params;
    const data = await getUserData(req.params.config, config);
    const { movies, series, tmdbCache, movieImdbIndex, seriesImdbIndex, apiKey } = data;
    if (type === "movie") {
      const slugKey = movieImdbIndex[id] || id;
      let movie = movies.find(m => m.id === id || m.id === slugKey)
        || movies.find(m => normalize(m.title) === normalize(id));
      if (!movie) return res.json({ meta: null });
      if (!movie.id.startsWith("tt")) {
        const imdb = await searchTMDB(movie.title, "movie", tmdbCache, apiKey);
        if (imdb) { movieImdbIndex[imdb] = movie.id; movie.id = imdb; }
      }
      return res.json({ meta: { id: movie.id, type: "movie", name: movie.title, poster: movie.poster } });
    }
    if (type === "series") {
      const slugKey = seriesImdbIndex[id] || id;
      let show = series[slugKey] || series[id]
        || Object.values(series).find(s => normalize(s.title) === normalize(id));
      if (!show) return res.json({ meta: null });
      if (!show.id.startsWith("tt")) {
        const imdb = await searchTMDB(show.title, "series", tmdbCache, apiKey);
        if (imdb) { seriesImdbIndex[imdb] = show.id; show.id = imdb; }
      }
      return res.json({
        meta: {
          id: show.id, type: "series", name: show.title, poster: show.poster,
          videos: show.episodes.map(ep => ({
            id: `${show.id}:${ep.season}:${ep.episode}`,
            title: ep.title, season: ep.season, number: ep.episode
          }))
        }
      });
    }
    res.json({ meta: null });
  } catch (err) {
    console.error("❌ Meta error:", err);
    res.json({ meta: null });
  }
});

app.get("/:config/stream/:type/:id.json", async (req, res) => {
  try {
    const config = decodeConfig(req.params.config);
    if (!config) return res.json({ streams: [] });
    const { type, id } = req.params;
    const data = await getUserData(req.params.config, config);
    const { movies, series, movieImdbIndex, seriesImdbIndex } = data;
    if (type === "movie") {
      const slugKey = movieImdbIndex[id] || id;
      const movie = movies.find(m => m.id === id || m.id === slugKey)
        || movies.find(m => normalize(m.title) === normalize(id));
      if (!movie) return res.json({ streams: [] });
      return res.json({ streams: movie.streams.map((s, i) => ({ url: s.url, name: "M3U", title: `Stream ${i + 1}` })) });
    }
    if (type === "series") {
      const parts   = id.split(":");
      const rawId   = parts[0];
      const season  = parseInt(parts[1], 10);
      const episode = parseInt(parts[2], 10);
      const slugKey = seriesImdbIndex[rawId] || rawId;
      const show = series[slugKey] || series[rawId]
        || Object.values(series).find(s => normalize(s.title) === normalize(rawId) || s.id === rawId);
      if (!show) return res.json({ streams: [] });
      const eps = show.episodes.filter(e => e.season === season && e.episode === episode);
      return res.json({ streams: eps.map((ep, i) => ({ url: ep.url, name: "M3U", title: `Stream ${i + 1}` })) });
    }
    res.json({ streams: [] });
  } catch (err) {
    console.error("❌ Stream error:", err);
    res.json({ streams: [] });
  }
});

// ─────────────────────────────────────────────
// CONFIGURE PAGE
// ─────────────────────────────────────────────

const CONFIGURE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>M3U IPTV – Setup</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #0d0d0d;
      color: #e0e0e0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }

    .card { width: 100%; max-width: 480px; }

    .header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 28px;
    }

    .logo {
      width: 44px; height: 44px;
      background: #111;
      border: 1px solid #222;
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 900; color: #00d4ff; flex-shrink: 0;
    }

    .header h1 { font-size: 18px; font-weight: 600; color: #fff; }
    .header p  { font-size: 13px; color: #555; margin-top: 2px; }

    .tabs {
      display: flex;
      background: #111;
      border: 1px solid #1e1e1e;
      border-radius: 8px;
      padding: 3px;
      margin-bottom: 24px;
      gap: 3px;
    }

    .tab {
      flex: 1;
      padding: 8px;
      border: none;
      border-radius: 6px;
      background: transparent;
      color: #555;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s;
      font-family: inherit;
    }

    .tab.active {
      background: #1e1e1e;
      color: #fff;
    }

    .panel { display: none; }
    .panel.active { display: block; }

    .field { margin-bottom: 18px; }

    label {
      display: flex;
      align-items: baseline;
      gap: 6px;
      font-size: 12px;
      font-weight: 600;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      margin-bottom: 6px;
    }

    .tag {
      font-size: 10px; font-weight: 500;
      color: #444; text-transform: none; letter-spacing: 0;
      background: #1a1a1a; border: 1px solid #2a2a2a;
      border-radius: 4px; padding: 1px 6px;
    }

    .tag.req { color: #e05a5a; border-color: #3a1a1a; background: #1f0f0f; }

    textarea, input[type="text"], input[type="password"], input[type="url"] {
      width: 100%;
      background: #111;
      border: 1px solid #222;
      border-radius: 8px;
      color: #e0e0e0;
      font-size: 13px;
      padding: 10px 12px;
      outline: none;
      transition: border-color 0.15s;
      font-family: inherit;
    }

    textarea { resize: none; height: 88px; }
    textarea:focus, input:focus { border-color: #333; }

    .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

    .hint { font-size: 12px; color: #444; margin-top: 5px; line-height: 1.5; }
    .hint a { color: #555; text-decoration: underline; }
    .hint a:hover { color: #888; }

    .example {
      font-family: monospace; font-size: 11px; color: #555;
      background: #0a0a0a; border: 1px solid #1a1a1a;
      border-radius: 6px; padding: 8px 10px; margin-top: 6px; line-height: 1.6;
    }

    .divider { border: none; border-top: 1px solid #1a1a1a; margin: 20px 0; }

    .section-label {
      font-size: 11px; color: #444; text-transform: uppercase;
      letter-spacing: 0.6px; margin-bottom: 14px;
    }

    .btn {
      width: 100%;
      background: #fff; color: #000; border: none;
      border-radius: 8px; padding: 11px 20px;
      font-size: 14px; font-weight: 600;
      cursor: pointer; transition: opacity 0.15s; margin-top: 4px;
      font-family: inherit;
    }

    .btn:hover { opacity: 0.85; }
    .btn:active { opacity: 0.7; }

    .result {
      display: none; margin-top: 20px;
      background: #111; border: 1px solid #1e1e1e;
      border-radius: 10px; padding: 14px;
    }

    .result-label {
      font-size: 11px; color: #444; text-transform: uppercase;
      letter-spacing: 0.5px; margin-bottom: 8px;
    }

    .url-row { display: flex; gap: 8px; }

    .url-row input {
      flex: 1; background: #0a0a0a; border: 1px solid #1a1a1a;
      border-radius: 7px; color: #00d4ff;
      font-family: monospace; font-size: 11px; padding: 8px 10px;
      outline: none; min-width: 0;
    }

    .url-row button {
      background: #1a1a1a; border: 1px solid #2a2a2a; color: #aaa;
      border-radius: 7px; padding: 0 14px; font-size: 12px;
      cursor: pointer; transition: background 0.15s; white-space: nowrap;
      font-family: inherit;
    }

    .url-row button:hover { background: #222; color: #fff; }

    .install {
      display: block; text-align: center; margin-top: 10px;
      background: #6d28d9; color: #fff; text-decoration: none;
      border-radius: 7px; padding: 9px; font-size: 13px; font-weight: 600;
      transition: opacity 0.15s;
    }

    .install:hover { opacity: 0.85; }

    .error {
      background: #1a0a0a; border: 1px solid #3a1a1a; border-radius: 7px;
      padding: 9px 12px; font-size: 12px; color: #e05a5a;
      display: none; margin-top: 10px;
    }
  </style>
</head>
<body>
  <div class="card">

    <div class="header">
      <div class="logo">M3U</div>
      <div>
        <h1>M3U IPTV</h1>
        <p>Stremio Addon</p>
      </div>
    </div>

    <!-- TABS -->
    <div class="tabs">
      <button class="tab active" onclick="switchTab('m3u')">M3U Playlist</button>
      <button class="tab" onclick="switchTab('xtream')">Xtream Codes</button>
    </div>

    <!-- PANEL: M3U -->
    <div class="panel active" id="panel-m3u">
      <div class="field">
        <label>Playlist URL <span class="tag req">required</span></label>
        <textarea id="m3uUrls" placeholder="https://yourprovider.com/playlist.m3u&#10;https://another-provider.com/list.m3u"></textarea>
        <div class="example">
          One URL per line, or separated by commas<br><br>
          https://provider.com/get.php?username=john&password=1234&type=m3u_plus<br>
          https://iptv-service.com/john/mysecretpass/playlist.m3u
        </div>
      </div>
    </div>

    <!-- PANEL: XTREAM -->
    <div class="panel" id="panel-xtream">
      <div class="field">
        <label>Server URL <span class="tag req">required</span></label>
        <input type="url" id="xtreamServer" placeholder="http://yourprovider.com:8080">
        <p class="hint">The server address your provider gave you — include the port if any.</p>
      </div>
      <div class="field row-2">
        <div>
          <label>Username <span class="tag req">required</span></label>
          <input type="text" id="xtreamUser" placeholder="john123">
        </div>
        <div>
          <label>Password <span class="tag req">required</span></label>
          <input type="password" id="xtreamPass" placeholder="••••••••">
        </div>
      </div>
      <div class="example">
        Your provider will give you these 3 things.<br>
        Example server: http://iptv-service.com:8080<br>
        The addon will build your M3U URL automatically.
      </div>
    </div>

    <hr class="divider">

    <!-- TMDB — shared -->
    <p class="section-label">Optional — recommended</p>
    <div class="field">
      <label>TMDB API Key <span class="tag">optional</span></label>
      <input type="password" id="tmdbKey" placeholder="e.g. a1b2c3d4e5f6...">
      <p class="hint">
        Matches your content with Stremio's global catalog — posters, descriptions, ratings.
        Free key at <a href="https://www.themoviedb.org/settings/api" target="_blank">themoviedb.org</a>
      </p>
    </div>

    <button class="btn" onclick="generate()">Generate install URL →</button>

    <div class="error" id="errorMsg"></div>

    <div class="result" id="result">
      <p class="result-label">Your personal install URL</p>
      <div class="url-row">
        <input type="text" id="manifestUrl" readonly>
        <button id="copyBtn" onclick="copyUrl()">Copy</button>
      </div>
      <a class="install" id="stremioLink" href="#">Open in Stremio</a>
    </div>

  </div>

  <script>
    let activeTab = 'm3u';

    function switchTab(tab) {
      activeTab = tab;
      document.querySelectorAll('.tab').forEach((t, i) => {
        t.classList.toggle('active', (i === 0 && tab === 'm3u') || (i === 1 && tab === 'xtream'));
      });
      document.getElementById('panel-m3u').classList.toggle('active', tab === 'm3u');
      document.getElementById('panel-xtream').classList.toggle('active', tab === 'xtream');
      document.getElementById('errorMsg').style.display = 'none';
      document.getElementById('result').style.display = 'none';
    }

    function showError(msg) {
      const el = document.getElementById('errorMsg');
      el.textContent = msg;
      el.style.display = 'block';
    }

    function generate() {
      document.getElementById('errorMsg').style.display = 'none';
      document.getElementById('result').style.display = 'none';

      const tmdbKey = document.getElementById('tmdbKey').value.trim();
      let m3uUrls = [];

      if (activeTab === 'm3u') {
        const raw = document.getElementById('m3uUrls').value.trim();
        if (!raw) return showError('Please enter at least one M3U URL.');
        m3uUrls = raw.split(/[\\n,]+/).map(u => u.trim()).filter(u => u.startsWith('http'));
        if (!m3uUrls.length) return showError('No valid URLs found. They must start with http:// or https://');

      } else {
        const server = document.getElementById('xtreamServer').value.trim().replace(/\\/$/, '');
        const user   = document.getElementById('xtreamUser').value.trim();
        const pass   = document.getElementById('xtreamPass').value.trim();
        if (!server) return showError('Please enter the server URL.');
        if (!user)   return showError('Please enter your username.');
        if (!pass)   return showError('Please enter your password.');
        if (!server.startsWith('http')) return showError('Server URL must start with http:// or https://');
        m3uUrls = [\`\${server}/get.php?username=\${encodeURIComponent(user)}&password=\${encodeURIComponent(pass)}&type=m3u_plus&output=ts\`];
      }

      const config = { m3uUrls };
      if (tmdbKey) config.tmdbApiKey = tmdbKey;

      const encoded = btoa(JSON.stringify(config));
      const url     = window.location.origin + '/' + encoded + '/manifest.json';

      document.getElementById('manifestUrl').value = url;
      document.getElementById('stremioLink').href  = 'stremio://' + url.replace(/^https?:\\/\\//, '');
      document.getElementById('result').style.display = 'block';
      document.getElementById('result').scrollIntoView({ behavior: 'smooth' });
    }

    function copyUrl() {
      const input = document.getElementById('manifestUrl');
      input.select();
      navigator.clipboard.writeText(input.value).then(() => {
        const btn = document.getElementById('copyBtn');
        btn.textContent = 'Copied ✓';
        setTimeout(() => btn.textContent = 'Copy', 2000);
      });
    }
  </script>
</body>
</html>`;

// ─────────────────────────────────────────────
// START
// ─────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`🚀 M3U IPTV corriendo en http://localhost:${PORT}`);
});