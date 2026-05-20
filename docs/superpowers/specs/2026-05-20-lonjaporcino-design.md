# lonjaporcino.es — Diseño del sitio

**Fecha:** 2026-05-20  
**Dominio:** lonjaporcino.es  
**Stack:** Astro + Keystatic CMS + Vercel

---

## Propósito

Publicación de precios del mercado porcino español. Actualización manual semanal vía Keystatic CMS. Editor principal: el propietario del sitio, asistido por Claude Code. Los artículos escritos por Claude Code se crean como `.md` con el schema correcto y son editables desde el panel CMS.

---

## Arquitectura

### Stack técnico

| Capa | Tecnología |
|---|---|
| Framework | Astro con `output: 'hybrid'` |
| Adapter | `@astrojs/vercel` (serverless) |
| CMS | Keystatic con `storage: 'github'` en prod, `'local'` en dev |
| UI CMS / Gráfica | React (`@astrojs/react`) — solo para Keystatic y Chart.js |
| Charts | Chart.js (cliente, `client:load`) |
| Tipografía | Playfair Display + Inter (Google Fonts) |
| Hosting | Vercel |
| Dominio | lonjaporcino.es |

### Renderizado

- Todo el sitio es **estático en build time** — Astro lee los archivos del repo y genera HTML.
- Excepción: `/api/keystatic/[...params].ts` es SSR puro (`prerender = false`) para el OAuth y las operaciones de lectura/escritura del CMS.
- La gráfica histórica se renderiza en cliente con los datos inyectados como JSON en el HTML generado en build.

### Estructura de directorios

```
src/
  pages/
    index.astro                    # Home
    precios.astro                  # Precios completos + gráfica
    blog/
      index.astro                  # Listado
      [slug].astro                 # Artículo
    sobre.astro                    # Sobre + contacto
    api/
      keystatic/
        [...params].ts             # SSR: OAuth + CRUD Keystatic
  content/
    sesiones/                      # Colección de sesiones de precios
    posts/                         # Colección de artículos de blog
  components/
    PreciosTable.astro             # Tabla de precios (bloque reutilizable)
    HistoricoChart.tsx             # Gráfica Chart.js (React, client:load)
    BlogCard.astro                 # Tarjeta de artículo
  layouts/
    Base.astro                     # Layout base: head, header, footer
keystatic.config.ts
astro.config.mjs
```

---

## Modelo de datos (Keystatic)

### Colección `sesiones`

Una entrada por sesión de lonja. Todas las subcategorías son opcionales — si una semana no se publica ibérico, se deja vacío y no aparece en la tabla.

**Campos globales:**
```
fecha            → date (obligatorio, slugField)
fuente           → text  (ej: "Mercolleida", "Lonja de Salamanca")
notas            → text opcional
```

**Bloque: Porcino Blanco (Cebo)** — unidad €/kg canal
```
blanco_selecto_min / blanco_selecto_max     → number
blanco_normal_min  / blanco_normal_max      → number
blanco_graso_min   / blanco_graso_max       → number
```

**Bloque: Lechones y Cochinillos** — unidad €/ud o €/kg según subcategoría
```
lechon_nacional_min    / lechon_nacional_max      → number  (€/ud, base 20 kg)
lechon_importacion_min / lechon_importacion_max   → number  (€/ud, base 20 kg)
cochinillo_marca_min   / cochinillo_marca_max     → number  (€/kg)
cochinillo_estandar_min / cochinillo_estandar_max → number  (€/kg)
```

**Bloque: Porcino Ibérico** — unidad €/kg vivo salvo lechones (€/ud)
```
bellota_100_min  / bellota_100_max    → number
bellota_75_min   / bellota_75_max     → number
bellota_50_min   / bellota_50_max     → number
cebo_campo_min   / cebo_campo_max     → number
cebo_min         / cebo_max           → number
lechones_ibericos_min / lechones_ibericos_max → number  (€/ud)
primales_ibericos_min / primales_ibericos_max → number  (€/kg vivo)
```

**Bloque: Desvieje** — unidad €/kg canal
```
cerdas_unica_min   / cerdas_unica_max   → number
cerdas_extra_min   / cerdas_extra_max   → number
cerdas_desecho_min / cerdas_desecho_max → number
verracos_min       / verracos_max       → number
```

**Implementación en Keystatic:** los campos se agrupan en 4 secciones con `fields.object()` para que el CMS los muestre como bloques colapsables, mejorando la UX al editar.

### Colección `posts`

Artículos de blog y análisis de mercado. Los artículos escritos por Claude Code siguen este mismo schema para que sean editables desde el CMS.

```
titulo       → fields.slug (slugField, genera la URL)
descripcion  → fields.text (multiline, para SEO y listados)
fecha        → fields.date
draft        → fields.checkbox (defaultValue: false)
tags         → fields.array de fields.text
contenido    → fields.markdoc({ extension: 'md' })
```

> **Nota crítica:** usar `fields.markdoc({ extension: 'md' })` — NO `fields.document()`. El campo `document` busca archivos `.mdoc` y mostraría "0 entries" con archivos `.md`. Ver guía de errores.

### Singleton `sobre`

```
texto  → fields.markdoc({ extension: 'md' })
email  → fields.text
```

---

## Páginas y rutas

| Ruta | Descripción |
|---|---|
| `/` | Home: última sesión (tabla resumen 4 bloques) + 3 posts recientes |
| `/precios` | Tabla completa de la última sesión + gráfica histórica interactiva |
| `/blog` | Listado de todos los posts (no drafts) |
| `/blog/[slug]` | Artículo individual |
| `/sobre` | Texto editable desde CMS + email de contacto |
| `/keystatic` | Panel CMS (login con GitHub) |
| `/api/keystatic/[...params]` | Rutas SSR internas (OAuth, CRUD) |

---

## Diseño visual

### Paleta

| Token | Hex | Uso |
|---|---|---|
| `--bg` | `#F9F6F1` | Fondo principal (crema cálido) |
| `--white` | `#FFFFFF` | Tablas, tarjetas, header |
| `--text` | `#1A1A1A` | Texto principal |
| `--muted` | `#6B6B6B` | Texto secundario, etiquetas |
| `--accent` | `#5C3D2E` | Marrón tostado — énfasis, logo, precios máximos |
| `--green` | `#8B9E6E` | Verde oliva — section labels, tags |
| `--border` | `#E2DDD7` | Bordes y líneas divisorias |

### Tipografía

- **Playfair Display** — encabezados, nombre de bloques de precio, títulos de posts
- **Inter** — cuerpo, tablas, navegación, meta datos

### Principios

- Sin imágenes decorativas obligatorias
- Tablas con filas alternadas crema/blanco, sin bordes pesados
- Gráfica histórica: líneas finas por categoría, sin relleno (estilo editorial)
- Header sticky, altura 60px, solo logo + navegación
- Sin animaciones, carruseles ni sombras exageradas

---

## Gráfica histórica

- **Librería:** Chart.js
- **Componente:** `HistoricoChart.tsx` (React, `client:load`)
- **Datos:** inyectados como JSON en el HTML desde build time — Astro lee todas las `sesiones` y los pasa como prop al componente
- **Interacción:** selector de categoría para filtrar qué línea mostrar
- **Eje X:** fecha de sesión · **Eje Y:** precio medio ((min+max)/2)

---

## Configuración Astro

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel/serverless';
import keystatic from '@keystatic/astro';

export default defineConfig({
  site: 'https://www.lonjaporcino.es',
  output: 'hybrid',
  adapter: vercel(),
  integrations: [react(), keystatic()],
});
```

---

## Configuración Keystatic (esquema)

```ts
// keystatic.config.ts
import { config, fields, collection, singleton } from '@keystatic/core';

const isProduction = process.env.NODE_ENV === 'production';

export default config({
  storage: isProduction
    ? { kind: 'github', repo: { owner: 'TU_USUARIO_GITHUB', name: 'lonjaporcino.es' } }
    // ↑ reemplazar con el usuario/org de GitHub donde vive el repo
    : { kind: 'local' },

  ui: {
    brand: { name: 'Lonja Porcino' },
    navigation: {
      Precios: ['sesiones'],
      Blog: ['posts'],
      Sitio: ['sobre'],
    },
  },

  collections: {
    sesiones: collection({ /* ... campos descritos arriba ... */ }),
    posts: collection({ /* ... campos descritos arriba ... */ }),
  },

  singletons: {
    sobre: singleton({ /* ... campos descritos arriba ... */ }),
  },
});
```

---

## Variables de entorno (Vercel)

| Variable | Entorno | Descripción |
|---|---|---|
| `KEYSTATIC_GITHUB_CLIENT_ID` | Production | Client ID del GitHub App |
| `KEYSTATIC_GITHUB_CLIENT_SECRET` | Production | Client Secret del GitHub App |
| `KEYSTATIC_SECRET` | Production | String aleatorio ≥32 chars (estable entre deploys) |

---

## GitHub App (requerido por Keystatic)

- Tipo: **GitHub App** (NO OAuth App clásico)
- Callback URLs:
  - `https://www.lonjaporcino.es/api/keystatic/github/oauth/callback`
  - `https://lonjaporcino.es/api/keystatic/github/oauth/callback`
- **"Expire user authorization tokens"**: activado (imprescindible)
- Permissions → Repository contents: **Read and write**
- Instalado en el repositorio del proyecto

---

## Errores conocidos de Keystatic (guía de referencia)

| Síntoma | Causa | Fix |
|---|---|---|
| "Authorization failed" | Callback URL incorrecto | URL exacta en el GitHub App |
| "Authorization failed" | Expiring tokens OFF | Activar en GitHub App settings |
| "Authorization failed" | Variables no en Production | Verificar entorno en Vercel + redesplegar |
| "Be careful! redirect_uri..." | Solo una variante de URL registrada | Añadir ambas (www y sin www) al GitHub App |
| "0 entries" en el CMS | `fields.document()` busca `.mdoc` | Usar `fields.markdoc({ extension: 'md' })` |
| 503 en refresh-token | `KEYSTATIC_SECRET` cambió entre deploys | Usar siempre el mismo secret |

---

## Criterios de éxito

1. `https://www.lonjaporcino.es` carga la tabla de precios de la última sesión
2. `https://www.lonjaporcino.es/keystatic` permite login con GitHub y muestra las colecciones
3. Se puede crear una sesión de precios desde el CMS y el sitio se actualiza tras el deploy
4. Los artículos creados por Claude Code aparecen en el CMS y son editables
5. La gráfica histórica muestra datos cuando hay ≥2 sesiones
6. Lighthouse performance ≥ 90 en desktop
