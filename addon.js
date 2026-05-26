const express = require("express");
const path    = require("path");
const fs      = require("fs");
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

function normalize(str) {
  if (!str) return "";
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
  return new Promise(function(r) { setTimeout(r, ms); });
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
      "https://api.themoviedb.org/3/search/" + endpoint + "?api_key=" + apiKey + "&query=" + encodeURIComponent(clean) + "&language=es-MX"
    );
    const data = await searchRes.json();
    if (!data.results || !data.results.length) { tmdbCache[clean] = null; return null; }
    const detRes = await fetch(
      "https://api.themoviedb.org/3/" + endpoint + "/" + data.results[0].id + "/external_ids?api_key=" + apiKey
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
  const movies          = userData.movies;
  const series          = userData.series;
  const tmdbCache       = userData.tmdbCache;
  const movieImdbIndex  = userData.movieImdbIndex;
  const seriesImdbIndex = userData.seriesImdbIndex;
  const apiKey          = userData.apiKey;
  if (!apiKey) return;
  for (let i = 0; i < movies.length; i++) {
    const movie = movies[i];
    if (movie.id.startsWith("tt")) continue;
    const imdb = await searchTMDB(movie.title, "movie", tmdbCache, apiKey);
    if (imdb) { movieImdbIndex[imdb] = movie.id; movie.id = imdb; }
    await sleep(300);
  }
  const showList = Object.values(series);
  for (let i = 0; i < showList.length; i++) {
    const show = showList[i];
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
  for (let i = 0; i < m3uUrls.length; i++) {
    const url = m3uUrls[i];
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      allItems = allItems.concat(parseM3U(await res.text()));
    } catch (err) {
      console.error("Error descargando " + url + ":", err.message);
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
    const entries = Array.from(userCache.entries()).sort(function(a, b) { return a[1].loadedAt - b[1].loadedAt; });
    userCache.delete(entries[0][0]);
  }
  const loaded = await loadList(config.m3uUrls);
  const userData = {
    movies:          loaded.movies,
    series:          loaded.series,
    tmdbCache:       {},
    movieImdbIndex:  {},
    seriesImdbIndex: {},
    apiKey:          config.tmdbApiKey || null,
    loadedAt:        now
  };
  userCache.set(configHash, userData);
  prefetchTMDB(userData).catch(function(err) { console.error("Error en pre-carga TMDB:", err); });
  return userData;
}

// ─────────────────────────────────────────────
// LOGO
// ─────────────────────────────────────────────

const LOGO_SVG = [
  "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 256 256'>",
  "<defs>",
  "<linearGradient id='bg' x1='0%' y1='0%' x2='100%' y2='100%'>",
  "<stop offset='0%' stop-color='#1a1a2e'/><stop offset='100%' stop-color='#0f3460'/>",
  "</linearGradient>",
  "<linearGradient id='txt' x1='0%' y1='0%' x2='100%' y2='0%'>",
  "<stop offset='0%' stop-color='#00d4ff'/><stop offset='100%' stop-color='#0077ff'/>",
  "</linearGradient>",
  "</defs>",
  "<rect width='256' height='256' rx='48' fill='url(#bg)'/>",
  "<rect x='20' y='20' width='216' height='216' rx='36' fill='none' stroke='#00d4ff' stroke-width='3' stroke-opacity='0.3'/>",
  "<text x='128' y='168' font-family='Arial Black,sans-serif' font-size='96' font-weight='900' text-anchor='middle' fill='url(#txt)'>M3U</text>",
  "</svg>"
].join("");

const LOGO = "data:image/svg+xml;base64," + Buffer.from(LOGO_SVG).toString("base64");

// ─────────────────────────────────────────────
// CONFIGURE HTML
// ─────────────────────────────────────────────

const CONFIGURE_HTML = fs.readFileSync(path.join(__dirname, "configure.html"), "utf8");

// ─────────────────────────────────────────────
// RUTAS
// ─────────────────────────────────────────────

app.get("/", function(req, res) { res.redirect("/configure"); });

app.get("/configure", function(req, res) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(CONFIGURE_HTML);
});

app.get("/:config/manifest.json", function(req, res) {
  const config = decodeConfig(req.params.config);
  if (!config) return res.status(400).json({ error: "Config invalida" });
  const baseUrl = req.protocol + "://" + req.get("host");
  res.json({
    id:          "com.m3uiptv.public",
    version:     "1.0.0",
    name:        "M3U IPTV",
    description: "Reproduce tu lista M3U personal en Stremio con IDs IMDb automaticos",
    logo:        LOGO,
    resources:   ["catalog", "stream", "meta"],
    types:       ["movie", "series"],
    catalogs: [
      {
        type:  "movie",
        id:    "m3u_movies",
        name:  "Mis Peliculas",
        extra: [{ name: "search", isRequired: false }, { name: "skip", isRequired: false }]
      },
      {
        type:  "series",
        id:    "m3u_series",
        name:  "Mis Series",
        extra: [{ name: "search", isRequired: false }, { name: "skip", isRequired: false }]
      }
    ],
    behaviorHints: {
      configurable: true,
      configureUrl: baseUrl + "/configure"
    }
  });
});

app.get("/:config/catalog/:type/:id.json",        handleCatalog);
app.get("/:config/catalog/:type/:id/:extra.json", handleCatalog);

async function handleCatalog(req, res) {
  try {
    const config = decodeConfig(req.params.config);
    if (!config) return res.json({ metas: [] });
    const type   = req.params.type;
    const id     = req.params.id;
    const extra  = req.params.extra ? Object.fromEntries(new URLSearchParams(req.params.extra)) : {};
    const search = extra.search ? normalize(extra.search) : null;
    const skip   = parseInt(extra.skip || "0", 10);
    const PAGE   = 100;
    const data   = await getUserData(req.params.config, config);
    if (type === "movie" && id === "m3u_movies") {
      let results = data.movies;
      if (search) results = results.filter(function(m) { return normalize(m.title).includes(search); });
      return res.json({ metas: results.slice(skip, skip + PAGE).map(function(m) { return { id: m.id, type: "movie", name: m.title, poster: m.poster }; }) });
    }
    if (type === "series" && id === "m3u_series") {
      let results = Object.values(data.series);
      if (search) results = results.filter(function(s) { return normalize(s.title).includes(search); });
      return res.json({ metas: results.slice(skip, skip + PAGE).map(function(s) { return { id: s.id, type: "series", name: s.title, poster: s.poster }; }) });
    }
    res.json({ metas: [] });
  } catch (err) {
    console.error("Catalog error:", err);
    res.json({ metas: [] });
  }
}

app.get("/:config/meta/:type/:id.json", async function(req, res) {
  try {
    const config = decodeConfig(req.params.config);
    if (!config) return res.json({ meta: null });
    const type = req.params.type;
    const id   = req.params.id;
    const data = await getUserData(req.params.config, config);
    const movies          = data.movies;
    const series          = data.series;
    const tmdbCache       = data.tmdbCache;
    const movieImdbIndex  = data.movieImdbIndex;
    const seriesImdbIndex = data.seriesImdbIndex;
    const apiKey          = data.apiKey;
    if (type === "movie") {
      const slugKey = movieImdbIndex[id] || id;
      let movie = movies.find(function(m) { return m.id === id || m.id === slugKey; })
        || movies.find(function(m) { return normalize(m.title) === normalize(id); });
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
        || Object.values(series).find(function(s) { return normalize(s.title) === normalize(id); });
      if (!show) return res.json({ meta: null });
      if (!show.id.startsWith("tt")) {
        const imdb = await searchTMDB(show.title, "series", tmdbCache, apiKey);
        if (imdb) { seriesImdbIndex[imdb] = show.id; show.id = imdb; }
      }
      return res.json({
        meta: {
          id: show.id, type: "series", name: show.title, poster: show.poster,
          videos: show.episodes.map(function(ep) {
            return { id: show.id + ":" + ep.season + ":" + ep.episode, title: ep.title, season: ep.season, number: ep.episode };
          })
        }
      });
    }
    res.json({ meta: null });
  } catch (err) {
    console.error("Meta error:", err);
    res.json({ meta: null });
  }
});

app.get("/:config/stream/:type/:id.json", async function(req, res) {
  try {
    const config = decodeConfig(req.params.config);
    if (!config) return res.json({ streams: [] });
    const type = req.params.type;
    const id   = req.params.id;
    const data = await getUserData(req.params.config, config);
    const movies          = data.movies;
    const series          = data.series;
    const movieImdbIndex  = data.movieImdbIndex;
    const seriesImdbIndex = data.seriesImdbIndex;
    if (type === "movie") {
      const slugKey = movieImdbIndex[id] || id;
      const movie = movies.find(function(m) { return m.id === id || m.id === slugKey; })
        || movies.find(function(m) { return normalize(m.title) === normalize(id); });
      if (!movie) return res.json({ streams: [] });
      return res.json({ streams: movie.streams.map(function(s, i) { return { url: s.url, name: "M3U", title: "Stream " + (i + 1) }; }) });
    }
    if (type === "series") {
      const parts   = id.split(":");
      const rawId   = parts[0];
      const season  = parseInt(parts[1], 10);
      const episode = parseInt(parts[2], 10);
      const slugKey = seriesImdbIndex[rawId] || rawId;
      const show = series[slugKey] || series[rawId]
        || Object.values(series).find(function(s) { return normalize(s.title) === normalize(rawId) || s.id === rawId; });
      if (!show) return res.json({ streams: [] });
      const eps = show.episodes.filter(function(e) { return e.season === season && e.episode === episode; });
      return res.json({ streams: eps.map(function(ep, i) { return { url: ep.url, name: "M3U", title: "Stream " + (i + 1) }; }) });
    }
    res.json({ streams: [] });
  } catch (err) {
    console.error("Stream error:", err);
    res.json({ streams: [] });
  }
});

// ─────────────────────────────────────────────
// START
// ─────────────────────────────────────────────

app.listen(PORT, function() {
  console.log("M3U IPTV corriendo en http://localhost:" + PORT);
});
