# 🎬 M3U IPTV Addon — Versión Friendly

![Claude](https://img.shields.io/badge/Claude-Anthropic-black?style=for-the-badge&logo=anthropic&logoColor=white&color=CC785C)
![Render](https://img.shields.io/badge/Render-Deploy-black?style=for-the-badge&logo=render&logoColor=white&color=46E3B7)
![Node.js](https://img.shields.io/badge/Node.js-Runtime-black?style=for-the-badge&logo=nodedotjs&logoColor=white&color=339933)
![Stremio](https://img.shields.io/badge/Stremio-Addon-black?style=for-the-badge&logo=stremio&logoColor=white&color=8A2BE2)
![Railway](https://img.shields.io/badge/Railway-Deploy-black?style=for-the-badge&logo=railway&logoColor=white&color=0B0D0E)

Versión pública del addon M3U IPTV para Stremio. Cada usuario configura su propia lista M3U y TMDB Key desde la página web del addon — sin necesidad de tocar código ni variables de entorno.

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

El addon resuelve los IDs de IMDb directamente en Render/Railway sin necesidad de modificar tu lista M3U manualmente.
Al arrancar, lanza en segundo plano un proceso que recorre todas las películas y series y consulta TMDB para obtener su ID de IMDb real (tt...).
Este proceso usa un límite de ~3 consultas por segundo para no rebasar el límite gratuito de TMDB. Según el tamaño de tu lista puede tardar varios minutos. Durante ese tiempo el catálogo ya está disponible y funciona normalmente.
Si la pre-carga aún no ha llegado a un título concreto, el addon lo resuelve en el momento en que abres ese título directamente desde el catálogo "Mis Películas" o "Mis Series".

---

⚠️ Los títulos cuyo ID todavía no se ha resuelto no aparecerán como streams dentro de las fichas globales de Stremio hasta que sean abiertos al menos una vez desde el catálogo del addon, o hasta que la pre-carga llegue a ellos.

---

## 📁 Archivos del proyecto

```
addon.js        ← Servidor Express con formulario y lógica del addon
configure.html  ← Pagina web de configuración
parse-m3u.js    ← Parser de listas M3U
railway.json    ← Configuración para deploy en Railway
render.yaml     ← Configuración para deploy en Render
package.json    ← Dependencias
README.md       ← Esta guía
```

-----

## 🚀 Deploy

Elige la plataforma que prefieras:

Solo necesitas presionar un boton y listo, el deploy en automatico. 

### Opción 1 — Railway

El servicio nunca se duerme por inactividad pero el plan gratuito incluye solo $5 de crédito al mes.

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?repository=https://github.com/Esmequiinn/addon-m3u_friendly)
**O manualmente:**

1. Ir a [https://railway.app](https://railway.app)
2. New Project → Deploy from GitHub repo
3. Seleccionar tu fork
4. Railway detecta automáticamente Node.js y corre `npm install` y `npm start`
5. En Variables agregar si quieres un puerto fijo: `PORT = 7000`
6. Abrir la URL que Railway genera → `/configure`

### Opción 2 — Render

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/Esmequiinn/addon-m3u_friendly)

En render por el Blueprint es de pago pero tambien puedes hacerlo manualmente lo cual es gratuito, el plan gratuito es ilimitado, pero el servicio duerme tras 15 minutos de inactividad.

**Pasos:**

1. Ir a [https://render.com](https://render.com)
2. New + → Web Service
3. Conectar GitHub → seleccionar tu fork

**Build Command:**
```
npm install
```

**Start Command:**
```
npm start
```

4. Abrir la URL que Render genera 

> No necesitas configurar ninguna variable de entorno en Render — todo lo maneja el formulario del addon.

---

### 3. Abrir la URL del addon

Cuando termine el deploy, abre:

```
https://tu-addon.railway.app/
```

```
https://tu-addon.onrender.com/
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
- Railway gratis: el servicio nunca duerme — el cache dura mucho más tiempo, pero tiene un límite de $5 de crédito al mes

-----

# 🛠 Procesamiento manual con clean-m3u.js (Opcional)
Si prefieres tener los IDs resueltos desde el primer segundo sin esperar la pre-carga automática del addon, puedes usar el script ```clean-m3u.js```
para procesar tu lista manualmente antes de subirla.

[Descargar clean-m3u.js](https://github.com/Esmequiinn/addon-m3u/releases/download/IMDBCD/clean-m3u.js)

Este script:

* limpia títulos automáticamente
* detecta películas y series
* busca metadata usando TMDB
* agrega IMDb IDs reales (`tvg-id="tt1234567"`)
* guarda progreso automáticamente
* permite continuar después sin perder avance

---

# Instalar dependencias

```bash id="lci4m4"
npm install axios
```

---

# Configurar el script

Abre:

```txt id="lci4m5"
clean-m3u.js
```

y reemplaza:

```js id="lci4m6"
const API_KEY = "PON_TU_TMDB_API_KEY";
```

por tu API real:

```js id="lci4m7"
const API_KEY = "TU_API_KEY";
```

---

# Ejecutar el script

Coloca tu lista M3U como:

```txt id="lci4m8"
lista.m3u
```

Luego ejecuta:

```bash id="lci4m9"
node clean-m3u.js
```

---

# 💾 Guardado automático

El script:

* guarda progreso automáticamente
* crea backups
* permite cerrar con `CTRL + C`
* continúa donde quedó la próxima vez

---

# Compatibilidad de series

El script detecta automáticamente:

```txt id="lci4ma"
S01E01
S02E05
etc
```

y usa el IMDb ID correcto de toda la serie.

---

# Resultado esperado

Antes:

```txt id="lci4mb"
#EXTINF:-1 tvg-name="Breaking Bad S01E01",Breaking Bad S01E01
```

Después:

```txt id="lci4mc"
#EXTINF:-1 tvg-name="Breaking Bad" tvg-id="tt0903747",Breaking Bad
```

---

# 🌐 Usar tu lista M3U procesada en Render

Después de agregar los IMDb IDs a tu lista local usando `clean-m3u.js`, necesitarás subir el archivo `.m3u` a un servicio que permita acceso mediante enlace directo.

El addon descargará automáticamente la lista desde esa URL cada vez que Render inicie.

---

# Servicios recomendados

Puedes alojar tu lista M3U en:

- GitHub Releases
- Dropbox
- Google Drive
- Servidor VPS
- Hosting web
- CDN
- Servidores IPTV propios

---

# 🔗 Importante: la URL debe ser DIRECTA

El addon necesita una URL que descargue el archivo directamente.

Ejemplo correcto:

```txt
https://servidor.com/lista.m3u
```
Ejemplo incorrecto:
```txt
https://drive.google.com/file/d/xxxxx/view
```
Porque esa URL abre una página web y NO el archivo directamente.

# GitHub Releases (Recomendado)

La forma más estable y sencilla de alojar tu lista M3U es usando GitHub Releases.

## Pasos

1. Subir tu archivo:

```txt
lista-progress.m3u
```

a tu repositorio.

2. Ir a:

```txt
Releases → Create Release
```

3. Adjuntar el archivo `.m3u`

4. Publicar la release

5. Copiar el enlace directo del archivo

Ejemplo:

```txt
https://github.com/usuario/repo/releases/download/iptv/lista-progress.m3u
```

---

# ☁ Google Drive

Google Drive también funciona, pero debes convertir el enlace compartido en un enlace directo de descarga.

## Obtener enlace directo

Tu enlace normal se verá así:

```txt
https://drive.google.com/file/d/FILE_ID/view
```

Debes extraer el `FILE_ID` y convertirlo a:

```txt
https://drive.google.com/uc?export=download&id=FILE_ID
```

---

# ☁ Dropbox

En Dropbox:

1. Compartir archivo
2. Copiar enlace

El enlace normalmente termina en:

```txt
?dl=0
```

Debes cambiarlo por:

```txt
?dl=1
```

o:

```txt
?raw=1
```

para forzar descarga directa.

---

# Resultado final

Cuando Render inicie:

- descargará automáticamente la lista
- parseará películas y series
- detectará streams
- agrupará episodios
- cargará IMDb IDs
- integrará los streams directamente en Stremio

---


# 📁 Archivos usados por el script

| Archivo              | Descripción                        |
| -------------------- | ---------------------------------- |
| `lista.m3u`          | Lista original (nunca se modifica) |
| `lista-progress.m3u` | Lista procesada con IMDb IDs       |
| `lista-backup.m3u`   | Backup automático                  |



# 🔄 Actualizar la lista

Solo necesitas actualizar el archivo M3U remoto.

Render descargará automáticamente la lista al reiniciar el servicio.

Para reiniciar:

1. Ve a Render
2. Abre tu Web Service
3. Presiona:
   - Manual Deploy
   - Deploy latest commit

---

## ❓ Problemas comunes

|Problema                        |Solución                                          |
|--------------------------------|--------------------------------------------------|
|No aparecen películas           |Verifica que la URL M3U sea directa y accesible   |
|Los IDs no se resuelven         |Verifica tu TMDB API Key en el formulario         |
|Un título no aparece globalmente|Ábrelo desde el catálogo para forzar la resolución|
|Render tarda en responder       |El plan gratuito duerme tras 15 min de inactividad|
|Se agotó el credito de Railway  |El plan gratuito tiene $5/mes upgrade o cambia a render|