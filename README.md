# 🎬 M3U IPTV Addon — Friendly Version

[![Claude](https://img.shields.io/badge/Claude-Anthropic-black?style=for-the-badge&logo=anthropic&logoColor=white&color=CC785C)](https://anthropic.com)
[![Node.js](https://img.shields.io/badge/Node.js-Runtime-black?style=for-the-badge&logo=nodedotjs&logoColor=white&color=339933)](https://nodejs.org)
[![Python](https://img.shields.io/badge/Python-3.10+-black?style=for-the-badge&logo=python&logoColor=white&color=3776AB)](https://python.org)
[![Stremio](https://img.shields.io/badge/Stremio-Addon-black?style=for-the-badge&logo=stremio&logoColor=white&color=8A2BE2)](https://stremio.com)

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
└── python/            ← Python/FastAPI version (Hugging Face & others)
    ├── addon.py
    ├── parse_m3u.py
    ├── configure.html
    ├── requirements.txt
    ├── Dockerfile
    └── render.yaml
```

---

## 🚀 Deploy options

| Platform | Runtime | One-click | Sleeps | Free limit |
|---|---|---|---|---|
| Railway | Node.js | ✅ | ❌ | $5/month |
| Render | Node.js | ✅ | ⚠️ 15 min | Unlimited |
| Koyeb | Node.js | ✅ | ❌ | Unlimited |
| Hugging Face | Python | Manual | ❌ | Unlimited |
| Fly.io | Python | Manual | ❌ | 3 free VMs |

---

### ⚡ Option 1 — Railway (Node.js)

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/m3u-addon?referralCode=tn36RQ&utm_medium=integration&utm_source=template&utm_campaign=generic)

The service never sleeps but the free plan includes only $5 credit/month.

**Or manually:** New Project → Deploy from GitHub repo → select your fork. Railway auto-detects Node.js.

---

### 🌐 Option 2 — Render (Node.js)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/Esmequiinn/addon-m3u_friendly)

> Blueprint deploy may require a payment method. For 100% free, use the manual method.

**Manual setup:** New + → Web Service → connect your fork → **Build:** `npm install` → **Start:** `npm start`

> No environment variables needed — the form handles everything.

⚠️ The free plan sleeps after 15 min of inactivity.

---

### 🚀 Option 3 — Koyeb (Node.js) — Free, no sleep

[![Deploy to Koyeb](https://www.koyeb.com/static/images/deploy/button.svg)](https://app.koyeb.com/deploy?type=git&builder=buildpack&repository=github.com/Esmequiinn/addon-m3u_friendly&branch=main&run_command=npm%20start&build_command=npm%20install&name=m3u-iptv-addon)

Free tier runs 24/7 with no sleep and no credit limit. Click the button, connect your GitHub account, and deploy.

---

### 🤗 Option 4 — Hugging Face Spaces (Python) — Free, no sleep

Hugging Face Spaces never sleep and have no credit limit. Uses the Python version from the `python/` folder.

1. Go to [huggingface.co/new-space](https://huggingface.co/new-space)
2. SDK: **Docker**
3. Upload all files from the `python/` folder of this repo
4. The Space builds and starts automatically
5. Open the Space URL → `/configure`

> Or duplicate the demo Space: [EsmeQuiinn/M3U-add](https://huggingface.co/spaces/EsmeQuiinn/M3U-add)

---

### ✈️ Option 5 — Fly.io (Python) — Free tier

Fly.io offers 3 free shared VMs. Requires the [Fly CLI](https://fly.io/docs/hands-on/install-flyctl/).

```bash
fly auth login
cd python/
fly launch
fly deploy
```

Open the `.fly.dev` URL → `/configure`

---

## 🔑 TMDB API Key

1. Create an account at [themoviedb.org](https://www.themoviedb.org/signup)
2. Go to [Settings → API](https://www.themoviedb.org/settings/api)
3. Copy your free API Key
4. Paste it into the addon form

---

## 💾 Per-user cache

The addon stores each user's list and resolved IDs in memory.

| Platform | Cache behavior |
|---|---|
| Railway | Never sleeps — cache lasts until restart |
| Render (free) | Sleeps after 15 min — cache resets on wake |
| Koyeb | Never sleeps — cache persists until restart |
| Hugging Face | Never sleeps — cache persists until restart |
| Fly.io | Never sleeps — cache persists until restart |

---

## 🛠 Manual processing with clean-m3u.js (Optional)

If you want IMDb IDs resolved from the first second without waiting for background pre-loading, use `clean-m3u.js` to process your list manually.

[Download clean-m3u.js](https://github.com/Esmequiinn/addon-m3u/releases/download/IMDBCD/clean-m3u.js)

**Install:** `npm install axios`

**Configure:** replace `const API_KEY = "PUT_YOUR_TMDB_API_KEY"` with your key.

**Run:** place your list as `lista.m3u` and run `node clean-m3u.js`

**Result:**
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
| **GitHub Releases** ✅ | Most stable. Use the direct asset download link. |
| **Dropbox** | Change `?dl=0` to `?dl=1` at end of link |
| **Google Drive** | Convert to `https://drive.google.com/uc?export=download&id=FILE_ID` |
| **VPS / web hosting** | Any direct `.m3u` URL works |

> ⚠️ GitHub Releases URLs redirect automatically. Both the Node.js and Python versions follow redirects correctly.

---

## ❓ Common issues

| Problem | Solution |
|---|---|
| No movies appear | Check that your M3U URL is direct and accessible |
| IDs not resolving | Check your TMDB API Key in the form |
| Title not appearing globally | Open it from the catalog to force resolution |
| Render slow to respond | Free plan sleeps after 15 min of inactivity |
| Railway credit ran out | Switch to Koyeb or Hugging Face (both free, no sleep) |
| Hugging Face Space offline | Go to the Space settings and restart it |
