const express = require("express");
const path = require("path");
const { parseM3U, groupContent } = require("./parse-m3u");

const app = express();
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
    const endpoint = type === "series" ? "tv" : "movie";
    const searchRes = await fetch(
      `https://api.themoviedb.org/3/search/${endpoint}?api_key=${apiKey}&query=${encodeURIComponent(clean)}&language=es-MX`
    );
    const data = await searchRes.json();
    if (!data.results?.length) { tmdbCache[clean] = null; return null; }
    const detRes = await fetch(
      `https://api.themoviedb.org/3/${endpoint}/${data.results[0].id}/external_ids?api_key=${apiKey}`
    );
    const det = await detRes.json();
    const imdb = det.imdb_id || null;
    tmdbCache[clean] = imdb;
    return imdb;
  } catch {
    tmdbCache[clean] = null;
    return null;
  }
}

// ─────────────────────────────────────────────
// CHUNKS — divide array en lotes
// ─────────────────────────────────────────────

function chunks(arr, size) {
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

// ─────────────────────────────────────────────
// PREFETCH TMDB — lotes de 4 en paralelo
// 4 requests simultáneos cada 500ms = ~8/seg
// Límite TMDB: 40 req/10seg — dentro del límite
// Tiempo estimado: (N/4) × 500ms
// ─────────────────────────────────────────────

async function prefetchTMDB(userData) {
  const { movies, series, tmdbCache, movieImdbIndex, seriesImdbIndex, apiKey } = userData;
  if (!apiKey) return;

  const movieList = movies.filter(m => !m.id.startsWith("tt"));
  const seriesList = Object.values(series).filter(s => !s.id.startsWith("tt"));

  console.log(`⏳ Pre-carga: ${movieList.length} películas + ${seriesList.length} series`);

  for (const batch of chunks(movieList, 4)) {
    await Promise.all(
      batch.map(async movie => {
        const imdb = await searchTMDB(movie.title, "movie", tmdbCache, apiKey);
        if (imdb) { movieImdbIndex[imdb] = movie.id; movie.id = imdb; }
      })
    );
    await sleep(500);
  }

  console.log(`✅ Películas resueltas`);

  for (const batch of chunks(seriesList, 4)) {
    await Promise.all(
      batch.map(async show => {
        const imdb = await searchTMDB(show.title, "series", tmdbCache, apiKey);
        if (imdb) { seriesImdbIndex[imdb] = show.id; show.id = imdb; }
      })
    );
    await sleep(500);
  }

  console.log(`✅ Series resueltas`);
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
    const oldest = [...userCache.entries()]
      .sort((a, b) => a[1].loadedAt - b[1].loadedAt)[0];
    userCache.delete(oldest[0]);
  }
  const { movies, series } = await loadList(config.m3uUrls);
  const userData = {
    movies,
    series,
    tmdbCache: {},
    movieImdbIndex: {},
    seriesImdbIndex: {},
    apiKey: config.tmdbApiKey || null,
    loadedAt: now
  };
  userCache.set(configHash, userData);
  prefetchTMDB(userData).catch(err =>
    console.error("❌ Error en pre-carga TMDB:", err)
  );
  return userData;
}

// ─────────────────────────────────────────────
// LOGO
// ─────────────────────────────────────────────

const LOGO_SVG = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 256 256'>
  <defs>
    <linearGradient id='bg' x1='0%' y1='0%' x2='100%' y2='100%'>
      <stop offset='0%' stop-color='#1a1a2e'/>
      <stop offset='100%' stop-color='#0f3460'/>
    </linearGradient>
    <linearGradient id='txt' x1='0%' y1='0%' x2='100%' y2='0%'>
      <stop offset='0%' stop-color='#00d4ff'/>
      <stop offset='100%' stop-color='#0077ff'/>
    </linearGradient>
  </defs>
  <rect width='256' height='256' rx='48' fill='url(#bg)'/>
  <rect x='20' y='20' width='216' height='216' rx='36' fill='none' stroke='#00d4ff' stroke-width='3' stroke-opacity='0.3'/>
  <text x='128' y='168' font-family='Arial Black,sans-serif' font-size='96' font-weight='900' text-anchor='middle' fill='url(#txt)'>M3U</text>
</svg>`;

const LOGO = `data:image/svg+xml;base64,${Buffer.from(LOGO_SVG).toString("base64")}`;

// ─────────────────────────────────────────────
// SIGNATURE
// ─────────────────────────────────────────────

const STREMIO_SIGNATURE =
  "eyJhbGciOiJkaXIiLCJlbmMiOiJBMTI4Q0JDLUhTMjU2In0..drO4si40GNH5_7aW8jgB9g.-1ysZnzhUaDVuZwvH2qcKs-pGPZ5D1ikiZQG1OfrWSNLrdVAU4wiuI1zXj2LtWNyn-ckw9K3be7ufwYrfXra0ty2W72J5wibK6spyF0n20oc925LpgsA2yhZvfYpGWeh.1RFI7MSVY2fm6IKI7dOqyw";

// ─────────────────────────────────────────────
// RUTAS
// ─────────────────────────────────────────────

app.get("/", (req, res) => res.redirect("/configure"));

app.get("/configure", (req, res) => {
  res.sendFile(path.join(__dirname, "configure.html"));
});

// ─── Manifest base ───────────────────────────

app.get("/manifest.json", (req, res) => {
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  res.json({
    id:          "com.m3uiptv.public",
    version:     "1.0.0",
    name:        "M3U IPTV",
    description: "Stream your personal M3U playlist or Xtream Codes IPTV in Stremio. Auto-resolves IMDb IDs via TMDB. By Esmequiinn (reddit user Thin-Soil-4159)",
    logo:        "https://raw.githubusercontent.com/Esmequiinn/addon-m3u_friendly/main/logo.svg",
    resources:   ["catalog", "stream", "meta"],
    types:       ["movie", "series"],
    catalogs: [
      {
        type:  "movie",
        id:    "m3u_movies",
        name:  "My Movies",
        extra: [{ name: "search", isRequired: false }]
      },
      {
        type:  "series",
        id:    "m3u_series",
        name:  "My Series",
        extra: [{ name: "search", isRequired: false }]
      }
    ],
    behaviorHints: {
      configurable:          true,
      configurationRequired: true,
      configureUrl:          `${baseUrl}/configure`
    },
    stremioAddonsConfig: {
      issuer:    "https://stremio-addons.net",
      signature: STREMIO_SIGNATURE
    }
  });
});

// ─── Manifest usuario ────────────────────────

app.get("/:config/manifest.json", (req, res) => {
  const config = decodeConfig(req.params.config);
  if (!config) return res.status(400).json({ error: "Config inválida" });
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  res.json({
    id:          "com.m3uiptv.public",
    version:     "1.0.0",
    name:        "M3U IPTV",
    description: "Reproduce tu lista M3U personal en Stremio con IDs IMDb automáticos. By Esmequiinn (reddit user Thin-Soil-4159)",
    logo:        LOGO,
    resources:   ["catalog", "stream", "meta"],
    types:       ["movie", "series"],
    catalogs: [
      {
        type:  "movie",
        id:    "m3u_movies",
        name:  "Mis Películas",
        extra: [
          { name: "search", isRequired: false },
          { name: "skip",   isRequired: false }
        ]
      },
      {
        type:  "series",
        id:    "m3u_series",
        name:  "Mis Series",
        extra: [
          { name: "search", isRequired: false },
          { name: "skip",   isRequired: false }
        ]
      }
    ],
    behaviorHints: {
      configurable: true,
      configureUrl: `${baseUrl}/configure`
    },
    stremioAddonsConfig: {
      issuer:    "https://stremio-addons.net",
      signature: STREMIO_SIGNATURE
    }
  });
});

// ─── Catalog ─────────────────────────────────

app.get("/:config/catalog/:type/:id.json",        handleCatalog);
app.get("/:config/catalog/:type/:id/:extra.json", handleCatalog);

async function handleCatalog(req, res) {
  try {
    const config = decodeConfig(req.params.config);
    if (!config) return res.json({ metas: [] });
    const { type, id } = req.params;
    const extra  = req.params.extra
      ? Object.fromEntries(new URLSearchParams(req.params.extra))
      : {};
    const search = extra.search ? normalize(extra.search) : null;
    const skip   = parseInt(extra.skip || "0", 10);
    const PAGE   = 100;
    const data   = await getUserData(req.params.config, config);
    if (type === "movie" && id === "m3u_movies") {
      let results = data.movies;
      if (search) results = results.filter(m => normalize(m.title).includes(search));
      return res.json({
        metas: results.slice(skip, skip + PAGE).map(m => ({
          id: m.id, type: "movie", name: m.title, poster: m.poster
        }))
      });
    }
    if (type === "series" && id === "m3u_series") {
      let results = Object.values(data.series);
      if (search) results = results.filter(s => normalize(s.title).includes(search));
      return res.json({
        metas: results.slice(skip, skip + PAGE).map(s => ({
          id: s.id, type: "series", name: s.title, poster: s.poster
        }))
      });
    }
    res.json({ metas: [] });
  } catch (err) {
    console.error("❌ Catalog error:", err);
    res.json({ metas: [] });
  }
}

// ─── Meta ─────────────────────────────────────

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
      return res.json({
        meta: { id: movie.id, type: "movie", name: movie.title, poster: movie.poster }
      });
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
            id:     `${show.id}:${ep.season}:${ep.episode}`,
            title:  ep.title,
            season: ep.season,
            number: ep.episode
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

// ─── Streams ──────────────────────────────────

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
      return res.json({
        streams: movie.streams.map((s, i) => ({
          url: s.url, name: "M3U", title: `Stream ${i + 1}`
        }))
      });
    }
    if (type === "series") {
      const parts   = id.split(":");
      const rawId   = parts[0];
      const season  = parseInt(parts[1], 10);
      const episode = parseInt(parts[2], 10);
      const slugKey = seriesImdbIndex[rawId] || rawId;
      const show = series[slugKey] || series[rawId]
        || Object.values(series).find(s =>
            normalize(s.title) === normalize(rawId) || s.id === rawId
          );
      if (!show) return res.json({ streams: [] });
      const eps = show.episodes.filter(
        e => e.season === season && e.episode === episode
      );
      return res.json({
        streams: eps.map((ep, i) => ({
          url: ep.url, name: "M3U", title: `Stream ${i + 1}`
        }))
      });
    }
    res.json({ streams: [] });
  } catch (err) {
    console.error("❌ Stream error:", err);
    res.json({ streams: [] });
  }
});

// ─────────────────────────────────────────────
// START
// ─────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`🚀 M3U IPTV corriendo en http://localhost:${PORT}`);
});
