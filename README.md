# 🎬 M3U IPTV Addon — Versión Pública

![Render](https://img.shields.io/badge/Render-Deploy-black?style=for-the-badge&logo=render&logoColor=white&color=46E3B7)
![Node.js](https://img.shields.io/badge/Node.js-Runtime-black?style=for-the-badge&logo=nodedotjs&logoColor=white&color=339933)
![Stremio](https://img.shields.io/badge/Stremio-Addon-black?style=for-the-badge&logo=stremio&logoColor=white&color=8A2BE2)
![Claude](https://img.shields.io/badge/Claude-Anthropic-black?style=for-the-badge&logo=anthropic&logoColor=white&color=CC785C)

Versión pública del addon M3U IPTV para Stremio. Cada usuario configura su propia lista M3U y TMDB Key desde la página web del addon — sin necesidad de tocar código ni variables de entorno.

> ¿Prefieres montarlo tú solo en Render con tu propia configuración? → [addon-m3u (versión personal)](https://github.com/Esmequiinn/addon-m3u)

-----

## 🚀 Cómo funciona

1. El usuario abre la URL del addon en el navegador
1. Llena el formulario con su URL de lista M3U y su TMDB API Key
1. El addon genera una URL de instalación personalizada
1. Pega esa URL en Stremio → listo

Cada usuario tiene su propia configuración completamente independiente y privada.

-----

## ✅ Características

- Formulario de configuración web incluido
- Soporte para múltiples listas M3U
- Resolución automática de IDs IMDb vía TMDB al arrancar
- Fallback: resolución al abrir desde el catálogo
- Cache por usuario en memoria (se reconstruye al reiniciar)
- Buscador en el catálogo
- Múltiples streams por título
- Integración global con Stremio y Cinemeta

-----

## 📁 Archivos del proyecto

```
addon.js        ← Servidor Express con formulario y lógica del addon
parse-m3u.js    ← Parser de listas M3U
package.json    ← Dependencias
README.md       ← Esta guía
```

-----

## 🚀 Deploy en Render

### 1. Fork este repositorio

Presiona **Fork** arriba a la derecha en GitHub.

### 2. Crear Web Service en Render

1. Ir a <https://render.com>
1. New + → Web Service
1. Conectar GitHub → seleccionar tu fork

**Build Command:**

```
npm install
```

**Start Command:**

```
npm start
```

> No necesitas configurar ninguna variable de entorno — todo lo maneja el formulario.

### 3. Abrir la URL del addon

Cuando Render termine el deploy, abre:

```
https://tu-addon.onrender.com/configure
```

Llena el formulario con tu lista M3U y tu TMDB Key, genera tu URL e instala en Stremio.

-----

## 🔑 TMDB API Key

Para que los IDs de IMDb se resuelvan automáticamente:

1. Crea cuenta en [themoviedb.org](https://www.themoviedb.org/signup)
1. Ve a [Settings → API](https://www.themoviedb.org/settings/api)
1. Copia tu API Key gratuita
1. Pégala en el formulario del addon

-----

## 💾 Cache por usuario

El addon guarda en memoria la lista y los IDs resueltos de cada usuario.

- El cache dura **6 horas** — después se recarga la lista automáticamente
- Si el servidor se reinicia, el cache se borra y se reconstruye al primer request
- En el plan gratuito de Render el servicio duerme tras 15 minutos de inactividad

-----

## ❓ Problemas comunes

|Problema                        |Solución                                          |
|--------------------------------|--------------------------------------------------|
|No aparecen películas           |Verifica que la URL M3U sea directa y accesible   |
|Los IDs no se resuelven         |Verifica tu TMDB API Key en el formulario         |
|Un título no aparece globalmente|Ábrelo desde el catálogo para forzar la resolución|
|Render tarda en responder       |El plan gratuito duerme tras 15 min de inactividad|