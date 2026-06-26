# 🎬 M3U IPTV Addon — Versión Friendly

[![Claude](https://img.shields.io/badge/Claude-Anthropic-black?style=for-the-badge&logo=anthropic&logoColor=white&color=CC785C)](https://anthropic.com)
[![Node.js](https://img.shields.io/badge/Node.js-Runtime-black?style=for-the-badge&logo=nodedotjs&logoColor=white&color=339933)](https://nodejs.org)
[![Python](https://img.shields.io/badge/Python-3.10+-black?style=for-the-badge&logo=python&logoColor=white&color=3776AB)](https://python.org)
[![Stremio](https://img.shields.io/badge/Stremio-Addon-black?style=for-the-badge&logo=stremio&logoColor=white&color=8A2BE2)](https://stremio.com)

M3U IPTV para Stremio. Cada usuario configura su propia lista M3U y TMDB Key desde la página web del addon — sin necesidad de tocar código ni variables de entorno.

---

## Cómo funciona

1. El usuario abre la URL del addon en el navegador
2. Llena el formulario con su URL de lista M3U y su TMDB API Key
3. El addon genera una URL de instalación personalizada
4. Pega esa URL en Stremio → listo

Cada usuario tiene su propia configuración completamente independiente y privada.

---

## Características

- Formulario de configuración web incluido
- Soporte para múltiples listas M3U
- Resolución automática de IDs IMDb vía TMDB al arrancar
- Fallback: resolución al abrir desde el catálogo
- Cache por usuario en memoria
- Buscador en el catálogo
- Múltiples streams por título
- Integración global con Stremio y Cinemeta

---

## 📁 Estructura del proyecto

```
addon-m3u_friendly/
├── addon.js           ← Servidor Node.js/Express
├── parse-m3u.js       ← Parser M3U (Node.js)
├── configure.html     ← Página de configuración web
├── package.json       ← Dependencias Node.js
├── railway.json       ← Config para Railway
├── render.yaml        ← Config para Render (Node.js)
├── README.md          ← Guía en inglés
├── README.es.md       ← Esta guía
└── python/            ← Versión Python/FastAPI (para Hugging Face y otros)
    ├── addon.py
    ├── parse_m3u.py
    ├── configure.html
    ├── requirements.txt
    ├── Dockerfile
    └── render.yaml
```

---

## Opciones de deploy

| Plataforma | Runtime | Un clic | Se duerme | Límite gratis |
|---|---|---|---|---|
| Railway | Node.js | ✅ | ❌ | $5/mes |
| Render | Node.js | ✅ | ⚠️ 15 min | Ilimitado |
| Koyeb | Node.js | ✅ | ❌ | Ilimitado |
| Hugging Face | Python | Manual | ❌ | Ilimitado |
| Fly.io | Python | Manual | ❌ | 3 VMs gratis |

---

### Opción 1 — Railway (Node.js)

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/m3u-addon?referralCode=tn36RQ&utm_medium=integration&utm_source=template&utm_campaign=generic)

El servicio nunca se duerme pero el plan gratuito incluye solo $5 de crédito al mes.

**O manualmente:** New Project → Deploy from GitHub repo → seleccionar tu fork. Railway detecta Node.js automáticamente.

---

### Opción 2 — Render (Node.js)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/Esmequiinn/addon-m3u_friendly)

> El deploy por Blueprint puede pedir método de pago. Para deploy 100% gratuito usa el método manual.

**Manual:** New + → Web Service → conectar tu fork → **Build:** `npm install` → **Start:** `npm start`

> No necesitas variables de entorno — el formulario del addon lo maneja todo.

⚠️ El plan gratuito duerme tras 15 minutos de inactividad.

---

### Opción 3 — Koyeb (Node.js) — Gratis, sin sueño

[![Deploy to Koyeb](https://www.koyeb.com/static/images/deploy/button.svg)](https://app.koyeb.com/deploy?type=git&builder=buildpack&repository=github.com/Esmequiinn/addon-m3u_friendly&branch=main&run_command=npm%20start&build_command=npm%20install&name=m3u-iptv-addon)

El plan gratuito corre 24/7 sin dormir y sin límite de crédito. Haz clic, conecta tu cuenta de GitHub y despliega.

---

### Opción 4 — Hugging Face Spaces (Python) — Gratis, sin sueño

Los Spaces de Hugging Face nunca se duermen y no tienen límite de crédito. Usa la versión Python de la carpeta `python/`.

1. Ir a [huggingface.co/new-space](https://huggingface.co/new-space)
2. SDK: **Docker**
3. Subir todos los archivos de la carpeta `python/` de este repo
4. El Space se construye y arranca automáticamente
5. Ve a `App` y configuralo

---

### Opción 5 — Fly.io (Python) — Plan gratuito

Fly.io ofrece 3 VMs compartidas gratuitas. Requiere el [Fly CLI](https://fly.io/docs/hands-on/install-flyctl/).

```bash
fly auth login
cd python/
fly launch
fly deploy
```

Abre la URL `.fly.dev` → `/configure`

---

## 🔑 TMDB API Key

1. Crea cuenta en [themoviedb.org](https://www.themoviedb.org/signup)
2. Ve a [Settings → API](https://www.themoviedb.org/settings/api)
3. Copia tu API Key gratuita
4. Pégala en el formulario del addon

---

## 💾 Cache por usuario

El addon guarda en memoria la lista y los IDs resueltos de cada usuario.

| Plataforma | Comportamiento del cache |
|---|---|
| Railway | Nunca duerme — cache dura hasta reinicio |
| Render (gratis) | Duerme tras 15 min — cache se borra al despertar |
| Koyeb | Nunca duerme — cache persiste hasta reinicio |
| Hugging Face | Nunca duerme — cache persiste hasta reinicio |
| Fly.io | Nunca duerme — cache persiste hasta reinicio |

---

## 🛠 Procesamiento manual con clean-m3u.js (Opcional)

Si prefieres tener los IDs resueltos desde el primer segundo sin esperar la pre-carga automática, procesa tu lista con `clean-m3u.js` antes de subirla.

[Descargar clean-m3u.js](https://github.com/Esmequiinn/addon-m3u/releases/download/IMDBCD/clean-m3u.js)

**Instalar:** `npm install axios`

**Configurar:** reemplaza `const API_KEY = "PON_TU_TMDB_API_KEY"` con tu key.

**Ejecutar:** coloca tu lista como `lista.m3u` y corre `node clean-m3u.js`

**Resultado:**
```
# Antes
#EXTINF:-1 tvg-name="Breaking Bad S01E01",Breaking Bad S01E01

# Después
#EXTINF:-1 tvg-name="Breaking Bad" tvg-id="tt0903747",Breaking Bad
```

---

## Dónde alojar tu lista M3U

El addon necesita una **URL de descarga directa** para tu archivo M3U.

| Servicio | Notas |
|---|---|
| **GitHub Releases** ✅ | Lo más estable. Usa el enlace directo del asset. |
| **Dropbox** | Cambia `?dl=0` por `?dl=1` al final del enlace |
| **Google Drive** | Convierte a `https://drive.google.com/uc?export=download&id=FILE_ID` |
| **VPS / hosting web** | Cualquier URL directa `.m3u` funciona |

> ⚠️ Las URLs de GitHub Releases redirigen automáticamente. Tanto la versión Node.js como la Python siguen los redirects correctamente.

---

## ❓ Problemas comunes

| Problema | Solución |
|---|---|
| No aparecen películas | Verifica que la URL M3U sea directa y accesible |
| Los IDs no se resuelven | Verifica tu TMDB API Key en el formulario |
| Un título no aparece globalmente | Ábrelo desde el catálogo para forzar la resolución |
| Render tarda en responder | El plan gratuito duerme tras 15 min de inactividad |
| Se agotó el crédito de Railway | Cambia a Koyeb o Hugging Face (ambos gratis, sin sueño) |
| Space de Hugging Face offline | Ve a la configuración del Space y reinícialo |
