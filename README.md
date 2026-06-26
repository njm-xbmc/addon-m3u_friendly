# 🎬 M3U IPTV Addon — Friendly Version

[![Claude](https://img.shields.io/badge/Claude-Anthropic-black?style=for-the-badge&logo=anthropic&logoColor=white&color=CC785C)](https://anthropic.com)
[![Render](https://img.shields.io/badge/Render-Deploy-black?style=for-the-badge&logo=render&logoColor=white&color=46E3B7)](https://render.com)
[![Node.js](https://img.shields.io/badge/Node.js-Runtime-black?style=for-the-badge&logo=nodedotjs&logoColor=white&color=339933)](https://nodejs.org)
[![Python](https://img.shields.io/badge/Python-3.10+-black?style=for-the-badge&logo=python&logoColor=white&color=3776AB)](https://python.org)
[![Stremio](https://img.shields.io/badge/Stremio-Addon-black?style=for-the-badge&logo=stremio&logoColor=white&color=8A2BE2)](https://stremio.com)
[![Railway](https://img.shields.io/badge/Railway-Deploy-black?style=for-the-badge&logo=railway&logoColor=white&color=0B0D0E)](https://railway.app)
[![Hugging Face](https://img.shields.io/badge/Hugging%20Face-Space-black?style=for-the-badge&logo=huggingface&logoColor=white&color=FFD21E)](https://huggingface.co)

[ Readme en Español ](README.es.md)

M3U IPTV addon for Stremio. Each user configures their own M3U list and TMDB Key from the addon's web page — no code or environment variables needed.

---

## 🚀 How it works

1. Open the addon URL in your browser
2. Fill in the form with your M3U playlist URL and TMDB API Key
3. The addon generates a personalized install URL
4. Paste that URL into Stremio → done

Each user has their own completely independent and private configuration.

---

## ✅ Features

- Built-in web configuration form
- Support for multiple M3U playlists
- Automatic IMDb ID resolution via TMDB on startup
- Fallback: on-demand resolution when opening from catalog
- Per-user in-memory cache
- Catalog search
- Multiple streams per title
- Global Stremio + Cinemeta integration

---

## 📁 Project structure

```
addon-m3u_friendly/
├── addon.js           ← Node.js/Express server
├── parse-m3u.js       ← M3U parser (Node.js)
├── configure.html     ← Web configuration page
├── package.json       ← Node.js dependencies
├── railway.json       ← Railway deploy config
├── render.yaml        ← Render deploy config (Node.js)
├── README.md          ← This guide
├── README.es.md       ← Spanish guide
└── python/            ← Python/FastAPI version (for Hugging Face & others)
    ├── addon.py
    ├── parse_m3u.py
    ├── configure.html
    ├── requirements.txt
    ├── Dockerfile
    └── render.yaml
```

---

## 🚀 Deploy

This addon has two versions: **Node.js** (Railway, Render, Koyeb) and **Python** (Hugging Face Spaces, Fly.io, Koyeb, Render).

---

### ⚡ Option 1 — Railway (Node.js) — Easiest

One-click deploy. The service never sleeps but the free plan includes only $5 credit/month.

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/m3u-addon?referralCode=tn36RQ&utm_medium=integration&utm_source=template&utm_campaign=generic)

**Or manually:**

1. Go to [railway.app](https://railway.app)
2. New Project → Deploy from GitHub repo
3. Select your fork
4. Railway auto-detects Node.js and runs `npm install` and `npm start`
5. Optionally add `PORT = 7000` in Variables
6. Open the Railway-generated URL → `/configure`

---

### 🌐 Option 2 — Render (Node.js) — Free unlimited

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/Esmequiinn/addon-m3u_friendly)

> Blueprint deploy may require a payment method. For a 100% free deploy, use the manual method below.

**Manual setup:**

1. Go to [render.com](https://render.com)
2. New + → Web Service → connect your GitHub fork
3. **Build Command:** `npm install`
4. **Start Command:** `npm start`
5. Open the Render-generated URL

> No environment variables needed — everything is handled by the addon's form.

⚠️ The free plan sleeps after 15 minutes of inactivity. The addon includes a built-in keep-alive ping every 14 minutes to prevent this on paid plans.

---

### 🤗 Option 3 — Hugging Face Spaces (Python) — Free, no sleep

Uses the Python version located in the `python/` folder. Hugging Face Spaces never sleep and have no credit limit.

1. Go to [huggingface.co/new-space](https://huggingface.co/new-space)
2. SDK: **Docker**
3. Upload all files from the `python/` folder of this repo
4. The Space will build and start automatically
5. Open the Space URL → `/configure`

> You can also duplicate the demo Space directly:
> [EsmeQuiinn/M3U-add](https://huggingface.co/spaces/EsmeQuiinn/M3U-add)

---

### 🚀 Option 4 — Koyeb (Node.js or Python) — Free, no sleep

Koyeb's free tier runs a service 24/7 with no sleep and no credit limit.

**Node.js deploy:**

1. Go to [koyeb.com](https://www.koyeb.com)
2. Create App → GitHub → select your fork
3. **Build command:** `npm install`
4. **Run command:** `npm start`
5. **Port:** `7860` (or whatever `PORT` is set to)

**Python deploy:**

1. Same steps but point to the `python/` subfolder
2. **Build command:** `pip install -r python/requirements.txt`
3. **Run command:** `uvicorn python.addon:app --host 0.0.0.0 --port 8000`
4. **Port:** `8000`

---

### ✈️ Option 5 — Fly.io (Python) — Free tier

Fly.io offers 3 free shared VMs. Uses the Python/Docker version.

1. Install the [Fly CLI](https://fly.io/docs/hands-on/install-flyctl/)
2. `fly auth login`
3. Inside the `python/` folder: `fly launch`
4. Follow the prompts (choose the free plan, region closest to you)
5. `fly deploy`
6. Open the `.fly.dev` URL → `/configure`

---

## 🔑 TMDB API Key

To automatically resolve IMDb IDs:

1. Create an account at [themoviedb.org](https://www.themoviedb.org/signup)
2. Go to [Settings → API](https://www.themoviedb.org/settings/api)
3. Copy your free API Key
4. Paste it into the addon form

---

## 💾 Per-user cache

The addon stores each user's list and resolved IDs in memory.

| Platform | Cache behavior |
|---|---|
| Railway | Never sleeps, cache lasts until restart |
| Render (free) | Sleeps after 15 min, cache resets on wake |
| Hugging Face | Never sleeps, cache persists until restart |
| Koyeb | Never sleeps, cache persists until restart |
| Fly.io | Never sleeps, cache persists until restart |

---

## 🛠 Manual processing with clean-m3u.js (Optional)

If you want IMDb IDs resolved from the first second without waiting for background pre-loading, use `clean-m3u.js` to process your list manually before uploading.

[Download clean-m3u.js](https://github.com/Esmequiinn/addon-m3u/releases/download/IMDBCD/clean-m3u.js)

This script:
- Cleans titles automatically
- Detects movies and series
- Searches metadata using TMDB
- Adds real IMDb IDs (`tvg-id="tt1234567"`)
- Saves progress automatically
- Can resume from where it left off

**Install dependency:**
```bash
npm install axios
```

**Configure:**

Open `clean-m3u.js` and replace:
```js
const API_KEY = "PUT_YOUR_TMDB_API_KEY";
```

**Run:**

Place your M3U list as `lista.m3u` then:
```bash
node clean-m3u.js
```

**Before → After:**
```
# Before
#EXTINF:-1 tvg-name="Breaking Bad S01E01",Breaking Bad S01E01

# After
#EXTINF:-1 tvg-name="Breaking Bad" tvg-id="tt0903747",Breaking Bad
```

---

## 🔗 Hosting your M3U list

The addon needs a **direct download URL** for your M3U file.

| Service | Notes |
|---|---|
| **GitHub Releases** ✅ | Most stable. Direct download link. |
| **Dropbox** | Change `?dl=0` to `?dl=1` at end of link |
| **Google Drive** | Convert to `https://drive.google.com/uc?export=download&id=FILE_ID` |
| **VPS / web hosting** | Any direct `.m3u` URL works |

> ⚠️ GitHub Releases URLs redirect to `objects.githubusercontent.com`. The Python version handles this automatically with `follow_redirects=True`. The Node.js version uses `axios` which also follows redirects by default.

---

## ❓ Common issues

| Problem | Solution |
|---|---|
| No movies appear | Check that your M3U URL is direct and accessible |
| IDs not resolving | Check your TMDB API Key in the form |
| Title not appearing globally | Open it from the catalog to force resolution |
| Render is slow to respond | Free plan sleeps after 15 min of inactivity |
| Railway credit ran out | Free plan has $5/month — switch to Render or Hugging Face |
| Hugging Face Space offline | Go to the Space settings and restart it |
