---
title: M3U IPTV Stremio Addon
emoji: 📺
colorFrom: blue
colorTo: indigo
sdk: docker
pinned: false
---

# M3U IPTV Stremio Addon — Python / FastAPI

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
