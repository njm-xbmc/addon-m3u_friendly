# 🎬 M3U IPTV Addon — Friendly Version

![Claude](https://img.shields.io/badge/Claude-Anthropic-black?style=for-the-badge&logo=anthropic&logoColor=white&color=CC785C)
![Render](https://img.shields.io/badge/Render-Deploy-black?style=for-the-badge&logo=render&logoColor=white&color=46E3B7)
![Node.js](https://img.shields.io/badge/Node.js-Runtime-black?style=for-the-badge&logo=nodedotjs&logoColor=white&color=339933)
![Stremio](https://img.shields.io/badge/Stremio-Addon-black?style=for-the-badge&logo=stremio&logoColor=white&color=8A2BE2)
![Railway](https://img.shields.io/badge/Railway-Deploy-black?style=for-the-badge&logo=railway&logoColor=white&color=0B0D0E)

Public version of the M3U IPTV addon for Stremio. Each user configures their own M3U list and TMDB Key from the addon's web page — no code or environment variables needed.

---

## 🚀 How it works

1. The user opens the addon URL in a browser
2. Fills in the form with their M3U list URL and TMDB API Key
3. The addon generates a personalized installation URL
4. Paste that URL into Stremio → done

Each user has their own completely independent and private configuration.

---

## ✅ Features

- Built-in web configuration form
- Support for multiple M3U lists
- Automatic IMDb ID resolution via TMDB on startup
- Fallback: resolution when opening from the catalog
- Per-user in-memory cache (rebuilt on restart)
- Catalog search
- Multiple streams per title
- Global integration with Stremio and Cinemeta
- Built-in keep-alive ping every 14 minutes — the service never goes to sleep

---

The addon resolves IMDb IDs directly on Render/Railway without needing to manually edit your M3U list.
On startup, it launches a background process that goes through all movies and series and queries TMDB to get their real IMDb ID (tt...).
This process uses a limit of ~3 requests per second to stay within TMDB's free tier. Depending on the size of your list, it may take several minutes. During that time the catalog is already available and working normally.
If the pre-load hasn't reached a specific title yet, the addon resolves it on the spot when you open that title directly from the catalog.

---

⚠️ Titles whose ID hasn't been resolved yet won't appear as streams inside Stremio's global pages until they've been opened at least once from the addon's catalog, or until the pre-load reaches them.

---

## 📁 Project files

```
addon.js        ← Express server with form and addon logic
configure.html  ← Web configuration page
parse-m3u.js    ← M3U list parser
railway.json    ← Railway deploy configuration
render.yaml     ← Render deploy configuration
package.json    ← Dependencies
README.md       ← This guide
```

---

## 🚀 Deploy

Choose the platform you prefer:

Just press a button and you're done — deploy is automatic.

### Option 1 — Railway

The service never sleeps due to inactivity, but the free plan includes only $5 of credit per month.

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/m3u-addon?referralCode=tn36RQ&utm_medium=integration&utm_source=template&utm_campaign=generic)

**Or manually:**

1. Go to [https://railway.app](https://railway.app)
2. New Project → Deploy from GitHub repo
3. Select your fork
4. Railway automatically detects Node.js and runs `npm install` and `npm start`
5. In Variables add if you want a fixed port: `PORT = 7000`
6. Open the URL Railway generates → `/configure`

### Option 2 — Render

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/Esmequiinn/addon-m3u_friendly)

On Render via Blueprint it's paid, but you can also do it manually which is free. The addon includes a built-in keep-alive ping every 14 minutes that keeps the service always active — no sleeping.

**Steps:**

1. Go to [https://render.com](https://render.com)
2. New + → Web Service
3. Connect GitHub → select your fork

**Build Command:**
```
npm install
```

**Start Command:**
```
npm start
```

4. Open the URL that Render generates

> You don't need to configure any environment variables on Render — everything is handled by the addon's form.

---

### 3. Open the addon URL

When the deploy finishes, open:

```
https://your-addon.railway.app/
```

```
https://your-addon.onrender.com/
```

Fill in the form with your M3U list and TMDB Key, generate your URL and install in Stremio.

---

## 🔑 TMDB API Key

For IMDb IDs to be resolved automatically:

1. Create an account at [themoviedb.org](https://www.themoviedb.org/signup)
2. Go to [Settings → API](https://www.themoviedb.org/settings/api)
3. Copy your free API Key
4. Paste it into the addon form

---

## 💾 Per-user cache

The addon stores each user's list and resolved IDs in memory.

- The cache lasts **6 hours** — after that the list reloads automatically
- If the server restarts, the cache is cleared and rebuilt on the first request

---

# 🛠 Manual processing with clean-m3u.js (Optional)

If you prefer to have IDs resolved from the very first second without waiting for the automatic pre-load, you can use `clean-m3u.js` to process your list manually before uploading it.

[Download clean-m3u.js](https://github.com/Esmequiinn/addon-m3u/releases/download/IMDBCD/clean-m3u.js)

This script:

- Cleans titles automatically
- Detects movies and series
- Searches metadata using TMDB
- Adds real IMDb IDs (`tvg-id="tt1234567"`)
- Saves progress automatically
- Allows you to continue later without losing progress

---

# Install dependencies

```bash
npm install axios
```

---

# Configure the script

Open:

```
clean-m3u.js
```

and replace:

```js
const API_KEY = "PUT_YOUR_TMDB_API_KEY";
```

with your real API key:

```js
const API_KEY = "YOUR_API_KEY";
```

---

# Run the script

Place your M3U list as:

```
lista.m3u
```

Then run:

```bash
node clean-m3u.js
```

---

# 💾 Automatic saving

The script:

- Saves progress automatically
- Creates backups
- Allows closing with `CTRL + C`
- Continues where it left off next time

---

# Series compatibility

The script automatically detects:

```
S01E01
S02E05
etc
```

and uses the correct IMDb ID for the entire series.

---

# Expected result

Before:

```
#EXTINF:-1 tvg-name="Breaking Bad S01E01",Breaking Bad S01E01
```

After:

```
#EXTINF:-1 tvg-name="Breaking Bad" tvg-id="tt0903747",Breaking Bad
```

---

# 🌐 Using your processed M3U list on Render

After adding IMDb IDs to your local list using `clean-m3u.js`, you'll need to upload the `.m3u` file to a service that allows direct link access.

The addon will automatically download the list from that URL every time Render starts.

---

# Recommended services

You can host your M3U list on:

- GitHub Releases
- Dropbox
- Google Drive
- VPS server
- Web hosting
- CDN
- Your own IPTV servers

---

# 🔗 Important: the URL must be DIRECT

The addon needs a URL that downloads the file directly.

Correct example:

```
https://server.com/lista.m3u
```

Incorrect example:

```
https://drive.google.com/file/d/xxxxx/view
```

Because that URL opens a web page and does NOT download the file directly.

# GitHub Releases (Recommended)

The most stable and simple way to host your M3U list is using GitHub Releases.

## Steps

1. Upload your file:

```
lista-progress.m3u
```

to your repository.

2. Go to:

```
Releases → Create Release
```

3. Attach the `.m3u` file

4. Publish the release

5. Copy the direct link to the file

Example:

```
https://github.com/username/repo/releases/download/iptv/lista-progress.m3u
```

---

# ☁ Google Drive

Google Drive also works, but you must convert the shared link into a direct download link.

## Get direct link

Your normal link will look like this:

```
https://drive.google.com/file/d/FILE_ID/view
```

You need to extract the `FILE_ID` and convert it to:

```
https://drive.google.com/uc?export=download&id=FILE_ID
```

---

# ☁ Dropbox

On Dropbox:

1. Share the file
2. Copy the link

The link normally ends in:

```
?dl=0
```

Change it to:

```
?dl=1
```

or:

```
?raw=1
```

to force direct download.

---

# Final result

When Render starts:

- It automatically downloads the list
- Parses movies and series
- Detects streams
- Groups episodes
- Loads IMDb IDs
- Integrates streams directly into Stremio

---

# 📁 Files used by the script

| File                 | Description                          |
| -------------------- | ------------------------------------ |
| `lista.m3u`          | Original list (never modified)       |
| `lista-progress.m3u` | Processed list with IMDb IDs         |
| `lista-backup.m3u`   | Automatic backup                     |

---

# 🔄 Updating the list

Just update the remote M3U file.

Render will automatically download the list on restart.

To restart:

1. Go to Render
2. Open your Web Service
3. Press:
   - Manual Deploy
   - Deploy latest commit

---

## ❓ Common issues

| Problem                          | Solution                                                    |
| -------------------------------- | ----------------------------------------------------------- |
| No movies appear                 | Check that the M3U URL is direct and accessible             |
| IDs are not resolving            | Check your TMDB API Key in the form                         |
| A title doesn't appear globally  | Open it from the catalog to force resolution                |
| Ran out of Railway credit        | Free plan has $5/month — upgrade or switch to Render        |
