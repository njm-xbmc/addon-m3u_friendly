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
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>M3U IPTV – Configurar Addon</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0d0d1a;
      color: #e0e0e0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      background: #13132a;
      border: 1px solid #1e1e3f;
      border-radius: 16px;
      padding: 40px 36px;
      width: 100%;
      max-width: 520px;
      box-shadow: 0 8px 40px rgba(0,0,0,0.5);
    }
    .logo-wrap { display: flex; align-items: center; gap: 14px; margin-bottom: 28px; }
    .logo-box {
      width: 56px; height: 56px;
      background: linear-gradient(135deg, #1a1a2e, #0f3460);
      border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      font-size: 13px; font-weight: 900;
      border: 1px solid rgba(0,212,255,0.2);
      color: #00d4ff; letter-spacing: -0.5px;
    }
    .logo-text h1 { font-size: 20px; font-weight: 700; color: #fff; }
    .logo-text p  { font-size: 13px; color: #666; margin-top: 2px; }
    .divider { border: none; border-top: 1px solid #1e1e3f; margin-bottom: 28px; }
    label {
      display: block; font-size: 13px; font-weight: 600;
      color: #aaa; margin-bottom: 6px;
      text-transform: uppercase; letter-spacing: 0.5px;
    }
    label span { color: #e05a5a; margin-left: 2px; }
    label .opt { color: #555; font-weight: 400; text-transform: none; letter-spacing: 0; font-size: 12px; }
    textarea, input[type="text"], input[type="password"] {
      width: 100%;
      background: #0a0a18;
      border: 1px solid #1e1e3f;
      border-radius: 8px;
      color: #e0e0e0;
      font-size: 14px;
      padding: 10px 12px;
      outline: none;
      transition: border-color 0.2s;
      font-family: inherit;
      resize: vertical;
    }
    textarea { min-height: 90px; }
    textarea:focus, input:focus { border-color: #00d4ff; }
    .hint { font-size: 12px; color: #555; margin-top: 5px; margin-bottom: 18px; }
    .hint a { color: #00a0cc; text-decoration: none; }
    .hint a:hover { text-decoration: underline; }
    .btn {
      width: 100%;
      background: linear-gradient(135deg, #0077ff, #00d4ff);
      color: #fff; border: none; border-radius: 8px;
      padding: 12px 20px; font-size: 15px; font-weight: 700;
      cursor: pointer; transition: opacity 0.2s, transform 0.1s; margin-top: 6px;
    }
    .btn:hover { opacity: 0.9; }
    .btn:active { transform: scale(0.98); }
    .result-box {
      display: none; margin-top: 24px;
      background: #0a0a18; border: 1px solid #1e1e3f;
      border-radius: 10px; padding: 16px;
    }
    .result-label { font-size: 12px; color: #666; margin-bottom: 8px; }
    .url-row { display: flex; gap: 8px; }
    .url-row input {
      flex: 1; font-family: monospace; font-size: 12px;
      background: #060610; color: #00d4ff; min-width: 0;
    }
    .url-row button {
      background: #1e1e3f; border: 1px solid #2a2a5a;
      color: #e0e0e0; border-radius: 7px; padding: 0 14px;
      font-size: 13px; cursor: pointer; transition: background 0.2s; white-space: nowrap;
    }
    .url-row button:hover { background: #2a2a5a; }
    .install-btn {
      display: block; text-align: center; margin-top: 12px;
      background: #7c3aed; color: #fff; text-decoration: none;
      border-radius: 8px; padding: 10px; font-size: 14px; font-weight: 600;
      transition: opacity 0.2s;
    }
    .install-btn:hover { opacity: 0.85; }
    .error {
      background: rgba(224,90,90,0.1); border: 1px solid rgba(224,90,90,0.3);
      border-radius: 8px; padding: 10px 14px; font-size: 13px;
      color: #e05a5a; display: none; margin-top: 10px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo-wrap">
      <div class="logo-box">M3U</div>
      <div class="logo-text">
        <h1>M3U IPTV Addon</h1>
        <p>Para Stremio — configuración personal</p>
      </div>
    </div>
    <hr class="divider">
    <label>URLs de tu lista M3U <span>*</span></label>
    <textarea id="m3uUrls" placeholder="https://tu-lista.m3u&#10;https://otra-lista.m3u"></textarea>
    <p class="hint">Una URL por línea o separadas por coma. Debe ser un enlace directo al archivo .m3u</p>
    <label>TMDB API Key <span class="opt">(Opcional — recomendado)</span></label>
    <input type="password" id="tmdbKey" placeholder="ej: abc123def456...">
    <p class="hint">
      Necesaria para que el contenido aparezca con pósters y metadata en Stremio.
      Consíguela gratis en <a href="https://www.themoviedb.org/settings/api" target="_blank">themoviedb.org</a>
    </p>
    <button class="btn" onclick="generate()">🔗 Generar URL de instalación</button>
    <div class="error" id="errorMsg"></div>
    <div class="result-box" id="resultBox">
      <p class="result-label">📋 Copia esta URL y pégala en Stremio → Addons → Install from URL</p>
      <div class="url-row">
        <input type="text" id="manifestUrl" readonly>
        <button id="copyBtn" onclick="copyUrl()">Copiar</button>
      </div>
      <a class="install-btn" id="stremioLink" href="#">▶ Instalar en Stremio</a>
    </div>
  </div>
  <script>
    function showError(msg) {
      const el = document.getElementById("errorMsg");
      el.textContent = msg;
      el.style.display = "block";
    }
    function generate() {
      document.getElementById("errorMsg").style.display = "none";
      const rawUrls = document.getElementById("m3uUrls").value.trim();
      const tmdbKey = document.getElementById("tmdbKey").value.trim();
      if (!rawUrls) return showError("⚠️ Debes ingresar al menos una URL de lista M3U");
      const m3uUrls = rawUrls.split(/[\n,]+/).map(u => u.trim()).filter(u => u.startsWith("http"));
      if (!m3uUrls.length) return showError("⚠️ Ninguna URL válida. Deben comenzar con http:// o https://");
      const config = { m3uUrls };
      if (tmdbKey) config.tmdbApiKey = tmdbKey;
      const encoded = btoa(JSON.stringify(config));
      const url = window.location.origin + "/" + encoded + "/manifest.json";
      document.getElementById("manifestUrl").value = url;
      document.getElementById("stremioLink").href  = "stremio://" + url.replace(/^https?:\/\//, "");
      document.getElementById("resultBox").style.display = "block";
      document.getElementById("resultBox").scrollIntoView({ behavior: "smooth" });
    }
    function copyUrl() {
      const input = document.getElementById("manifestUrl");
      input.select();
      navigator.clipboard.writeText(input.value).then(() => {
        const btn = document.getElementById("copyBtn");
        btn.textContent = "✅ Copiado";
        setTimeout(() => { btn.textContent = "Copiar"; }, 2000);
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
