---
title: M3U IPTV Stremio Addon
emoji: 📺
colorFrom: blue
colorTo: indigo
sdk: docker
pinned: false
---

# M3U IPTV Stremio Addon — Python / FastAPI

Versión Python del addon original en Node.js/Express. Funcionalidad idéntica.

## Equivalencias

| Node.js / Express | Python / FastAPI |
|---|---|
| `express` | `fastapi` + `uvicorn` |
| `node-fetch` / `fetch` | `httpx` (async) |
| `crypto.createHash` | `hashlib` |
| `fs.readFileSync` | `pathlib.Path.read_text` |
| `setTimeout` / `setInterval` | `asyncio.sleep` + `asyncio.create_task` |
| `addon.js` | `addon.py` |
| `parse-m3u.js` | `parse_m3u.py` |

## Instalación

```bash
pip install -r requirements.txt
```

## Arrancar

```bash
python addon.py
# o directamente con uvicorn:
uvicorn addon:app --host 0.0.0.0 --port 7000 --reload
```

## Variables de entorno

| Variable | Descripción |
|---|---|
| `PORT` | Puerto (default: 7000) |
| `M3U_URL` | URL única de lista M3U |
| `M3U_URLS` | URLs separadas por coma |
| `TMDB_API_KEY` | API key de TMDB (opcional) |
| `RENDER_EXTERNAL_URL` | URL pública en Render (activa keep-alive) |

## Deploy en Render

El `render.yaml` incluido ya está configurado para Python.
Solo sube el proyecto y define tus variables de entorno en el dashboard.
