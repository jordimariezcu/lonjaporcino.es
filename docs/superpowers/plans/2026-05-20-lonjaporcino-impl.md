# lonjaporcino.es — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build lonjaporcino.es — sitio de publicación de precios del mercado porcino con Keystatic CMS, Astro y Vercel.

**Architecture:** Astro hybrid mode. Páginas estáticas generadas en build time. Keystatic reader para sesiones de precios y datos del singleton "sobre". Astro Content Collections para blog posts (renderizado de markdown nativo). SSR solo para la ruta API de Keystatic (`/api/keystatic/[...params].ts`).

**Tech Stack:** Astro 4, @keystatic/core + @keystatic/astro, @astrojs/react, @astrojs/vercel/serverless, chart.js, react-chartjs-2, TypeScript.

---

## File Map

| Archivo | Acción | Propósito |
|---|---|---|
| `package.json` | Crear | Dependencias del proyecto |
| `astro.config.mjs` | Crear | Config Astro: hybrid, Vercel adapter, Keystatic integration |
| `tsconfig.json` | Crear | TypeScript config |
| `.gitignore` | Crear | Ignorar node_modules, .env, dist |
| `.env.example` | Crear | Plantilla de variables de entorno |
| `keystatic.config.ts` | Crear | Schema completo CMS: sesiones, posts, sobre |
| `src/content/config.ts` | Crear | Astro content collection schema para posts |
| `src/styles/global.css` | Crear | CSS con tokens de diseño, tipografía, componentes |
| `src/layouts/Base.astro` | Crear | Layout HTML base: head, header sticky, footer |
| `src/components/PreciosTable.astro` | Crear | Bloque de tabla de precios reutilizable |
| `src/components/HistoricoChart.tsx` | Crear | Gráfica Chart.js con selector de categoría |
| `src/components/BlogCard.astro` | Crear | Tarjeta de artículo del blog |
| `src/pages/index.astro` | Crear | Home: última sesión + 3 posts recientes |
| `src/pages/precios.astro` | Crear | Tabla completa + gráfica histórica |
| `src/pages/blog/index.astro` | Crear | Listado de todos los posts |
| `src/pages/blog/[slug].astro` | Crear | Artículo individual |
| `src/pages/sobre.astro` | Crear | Página sobre + contacto |
| `src/pages/api/keystatic/[...params].ts` | Crear | Ruta SSR para OAuth y CRUD de Keystatic |
| `src/content/sesiones/2026-05-19.yaml` | Crear | Seed: sesión de precios de ejemplo |
| `src/content/posts/bienvenidos-a-lonja-porcino.md` | Crear | Seed: primer artículo de blog |

---

## Task 1: package.json + npm install

**Files:**
- Create: `package.json`

- [ ] **Step 1: Crear package.json**

```json
{
  "name": "lonjaporcino",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview"
  },
  "dependencies": {
    "astro": "^4.16.0",
    "@astrojs/react": "^3.6.0",
    "@astrojs/vercel": "^7.8.0",
    "@keystatic/core": "^0.5.39",
    "@keystatic/astro": "^5.0.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "chart.js": "^4.4.6",
    "react-chartjs-2": "^5.2.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1"
  }
}
```

- [ ] **Step 2: Instalar dependencias**

```bash
npm install
```

Resultado esperado: `node_modules/` creado, sin errores.

---

## Task 2: astro.config.mjs + tsconfig.json

**Files:**
- Create: `astro.config.mjs`
- Create: `tsconfig.json`

- [ ] **Step 1: Crear astro.config.mjs**

```js
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

- [ ] **Step 2: Crear tsconfig.json**

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "strictNullChecks": true
  }
}
```

---

## Task 3: keystatic.config.ts

**Files:**
- Create: `keystatic.config.ts`

- [ ] **Step 1: Crear keystatic.config.ts con schema completo**

```ts
import { config, fields, collection, singleton } from '@keystatic/core';

const isProduction = process.env.NODE_ENV === 'production';

export default config({
  storage: isProduction
    ? {
        kind: 'github',
        repo: {
          owner: 'TU_USUARIO_GITHUB',
          name: 'lonjaporcino.es',
        },
      }
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
    sesiones: collection({
      label: 'Sesiones de precios',
      slugField: 'fecha',
      path: 'src/content/sesiones/*',
      format: { data: 'yaml' },
      schema: {
        fecha: fields.slug({ name: { label: 'Fecha (YYYY-MM-DD)' } }),
        fuente: fields.text({
          label: 'Fuente',
          description: 'Ej: Mercolleida, Lonja de Salamanca',
        }),
        notas: fields.text({ label: 'Notas de mercado', multiline: true }),

        blanco: fields.object({
          label: 'Porcino Blanco (Cebo) — €/kg canal',
          fields: {
            selecto_min: fields.text({ label: 'Cerdo Selecto — Mín (€)', description: 'Ej: 1.88' }),
            selecto_max: fields.text({ label: 'Cerdo Selecto — Máx (€)' }),
            normal_min:  fields.text({ label: 'Cerdo Normal — Mín (€)' }),
            normal_max:  fields.text({ label: 'Cerdo Normal — Máx (€)' }),
            graso_min:   fields.text({ label: 'Cerdo Graso — Mín (€)' }),
            graso_max:   fields.text({ label: 'Cerdo Graso — Máx (€)' }),
          },
        }),

        lechones: fields.object({
          label: 'Lechones y Cochinillos',
          fields: {
            lechon_nacional_min:     fields.text({ label: 'Lechón Nacional — Mín (€/ud base 20kg)' }),
            lechon_nacional_max:     fields.text({ label: 'Lechón Nacional — Máx (€/ud base 20kg)' }),
            lechon_importacion_min:  fields.text({ label: 'Lechón Importación — Mín (€/ud)' }),
            lechon_importacion_max:  fields.text({ label: 'Lechón Importación — Máx (€/ud)' }),
            cochinillo_marca_min:    fields.text({ label: 'Cochinillo con marca — Mín (€/kg)' }),
            cochinillo_marca_max:    fields.text({ label: 'Cochinillo con marca — Máx (€/kg)' }),
            cochinillo_estandar_min: fields.text({ label: 'Cochinillo estándar — Mín (€/kg)' }),
            cochinillo_estandar_max: fields.text({ label: 'Cochinillo estándar — Máx (€/kg)' }),
          },
        }),

        iberico: fields.object({
          label: 'Porcino Ibérico',
          fields: {
            bellota_100_min:       fields.text({ label: 'Bellota 100% — Mín (€/kg vivo)' }),
            bellota_100_max:       fields.text({ label: 'Bellota 100% — Máx (€/kg vivo)' }),
            bellota_75_min:        fields.text({ label: 'Bellota 75% — Mín (€/kg vivo)' }),
            bellota_75_max:        fields.text({ label: 'Bellota 75% — Máx (€/kg vivo)' }),
            bellota_50_min:        fields.text({ label: 'Bellota 50% — Mín (€/kg vivo)' }),
            bellota_50_max:        fields.text({ label: 'Bellota 50% — Máx (€/kg vivo)' }),
            cebo_campo_min:        fields.text({ label: 'Cebo de Campo — Mín (€/kg vivo)' }),
            cebo_campo_max:        fields.text({ label: 'Cebo de Campo — Máx (€/kg vivo)' }),
            cebo_min:              fields.text({ label: 'Cebo — Mín (€/kg vivo)' }),
            cebo_max:              fields.text({ label: 'Cebo — Máx (€/kg vivo)' }),
            lechones_ibericos_min: fields.text({ label: 'Lechones Ibéricos — Mín (€/ud)' }),
            lechones_ibericos_max: fields.text({ label: 'Lechones Ibéricos — Máx (€/ud)' }),
            primales_ibericos_min: fields.text({ label: 'Primales Ibéricos — Mín (€/kg vivo)' }),
            primales_ibericos_max: fields.text({ label: 'Primales Ibéricos — Máx (€/kg vivo)' }),
          },
        }),

        desvieje: fields.object({
          label: 'Desvieje — €/kg canal',
          fields: {
            cerdas_unica_min:   fields.text({ label: 'Cerdas Única — Mín (€/kg)' }),
            cerdas_unica_max:   fields.text({ label: 'Cerdas Única — Máx (€/kg)' }),
            cerdas_extra_min:   fields.text({ label: 'Cerdas Extra — Mín (€/kg)' }),
            cerdas_extra_max:   fields.text({ label: 'Cerdas Extra — Máx (€/kg)' }),
            cerdas_desecho_min: fields.text({ label: 'Cerdas Desecho — Mín (€/kg)' }),
            cerdas_desecho_max: fields.text({ label: 'Cerdas Desecho — Máx (€/kg)' }),
            verracos_min:       fields.text({ label: 'Verracos — Mín (€/kg)' }),
            verracos_max:       fields.text({ label: 'Verracos — Máx (€/kg)' }),
          },
        }),
      },
    }),

    posts: collection({
      label: 'Artículos',
      slugField: 'titulo',
      path: 'src/content/posts/*.md',
      format: { contentField: 'contenido' },
      schema: {
        titulo: fields.slug({ name: { label: 'Título' } }),
        descripcion: fields.text({ label: 'Descripción SEO', multiline: true }),
        fecha: fields.date({ label: 'Fecha de publicación' }),
        draft: fields.checkbox({ label: 'Borrador', defaultValue: false }),
        tags: fields.array(
          fields.text({ label: 'Tag' }),
          { label: 'Tags', itemLabel: (props) => props.value }
        ),
        contenido: fields.markdoc({ label: 'Contenido', extension: 'md' }),
      },
    }),
  },

  singletons: {
    sobre: singleton({
      label: 'Sobre el sitio',
      path: 'src/content/sobre',
      schema: {
        descripcion: fields.text({ label: 'Descripción del sitio', multiline: true }),
        email: fields.text({ label: 'Email de contacto' }),
      },
    }),
  },
});
```

---

## Task 4: Ruta API de Keystatic

**Files:**
- Create: `src/pages/api/keystatic/[...params].ts`

- [ ] **Step 1: Crear directorios y archivo de ruta**

```bash
mkdir -p src/pages/api/keystatic
```

- [ ] **Step 2: Crear src/pages/api/keystatic/[...params].ts**

```ts
export const prerender = false;
import { makeHandler } from '@keystatic/astro/api';
import config from '../../../../keystatic.config';

export const ALL = makeHandler({ config });
```

---

## Task 5: Global CSS

**Files:**
- Create: `src/styles/global.css`

- [ ] **Step 1: Crear src/styles/global.css**

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg:       #F9F6F1;
  --white:    #FFFFFF;
  --text:     #1A1A1A;
  --muted:    #6B6B6B;
  --accent:   #5C3D2E;
  --green:    #8B9E6E;
  --border:   #E2DDD7;
  --font-serif: 'Playfair Display', Georgia, serif;
  --font-sans:  'Inter', system-ui, sans-serif;
}

body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-sans);
  font-size: 15px;
  line-height: 1.6;
}

/* ── Header ────────────────────────────────────── */
.site-header {
  background: var(--white);
  border-bottom: 1px solid var(--border);
  padding: 0 2rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 60px;
  position: sticky;
  top: 0;
  z-index: 10;
}

.logo {
  font-family: var(--font-serif);
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--accent);
  text-decoration: none;
  letter-spacing: 0.01em;
}
.logo span { color: var(--text); font-weight: 400; }

.site-nav a {
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--muted);
  text-decoration: none;
  margin-left: 2rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.site-nav a:hover,
.site-nav a[aria-current="page"] { color: var(--accent); }

/* ── Footer ────────────────────────────────────── */
.site-footer {
  border-top: 1px solid var(--border);
  padding: 1.5rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.site-footer p { font-size: 0.78rem; color: var(--muted); }

/* ── Layout ────────────────────────────────────── */
.hero {
  padding: 3.5rem 2rem 2rem;
  max-width: 960px;
  margin: 0 auto;
}
.hero-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--green);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 0.5rem;
}
.hero h1 {
  font-family: var(--font-serif);
  font-size: 2.4rem;
  font-weight: 700;
  line-height: 1.2;
  margin-bottom: 0.5rem;
}
.hero-sub { font-size: 0.9rem; color: var(--muted); }

hr.divider { border: none; border-top: 1px solid var(--border); }

.container {
  max-width: 960px;
  margin: 0 auto;
  padding: 0 2rem 4rem;
}

.section-label {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--green);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin: 2.5rem 0 1rem;
}

/* ── Price blocks ──────────────────────────────── */
.price-block {
  background: var(--white);
  border: 1px solid var(--border);
  margin-bottom: 1px;
}
.price-block-header {
  padding: 0.65rem 1rem;
  background: var(--bg);
  border-bottom: 1px solid var(--border);
  font-family: var(--font-serif);
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--accent);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.price-block-header::before {
  content: '';
  display: block;
  width: 3px;
  height: 14px;
  background: var(--accent);
  border-radius: 2px;
}

table { width: 100%; border-collapse: collapse; }
thead th {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 0.5rem 1rem;
  text-align: left;
  border-bottom: 1px solid var(--border);
}
thead th:not(:first-child) { text-align: right; }
tbody tr:nth-child(even) { background: #FDFBF8; }
tbody tr:hover { background: #F4F0EA; }
tbody td {
  padding: 0.55rem 1rem;
  font-size: 0.875rem;
  border-bottom: 1px solid var(--border);
}
tbody tr:last-child td { border-bottom: none; }
tbody td:not(:first-child) {
  text-align: right;
  font-variant-numeric: tabular-nums;
  font-weight: 500;
}
.price-min { color: var(--muted); }
.price-max { color: var(--accent); font-weight: 600; }
.price-unit { color: var(--muted); font-size: 0.8rem; }

/* ── Blog ──────────────────────────────────────── */
.blog-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1px;
  background: var(--border);
}
.blog-card {
  background: var(--white);
  padding: 1.25rem;
  text-decoration: none;
  color: inherit;
  display: block;
}
.blog-card:hover { background: #FDFBF8; }
.blog-date {
  font-size: 0.72rem;
  color: var(--muted);
  margin-bottom: 0.4rem;
}
.blog-title {
  font-family: var(--font-serif);
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.35;
  margin-bottom: 0.4rem;
}
.blog-desc { font-size: 0.8rem; color: var(--muted); line-height: 1.5; }
.blog-tag {
  display: inline-block;
  margin-top: 0.75rem;
  font-size: 0.68rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--green);
}

/* ── Blog post article ─────────────────────────── */
.post-header {
  max-width: 720px;
  margin: 0 auto;
  padding: 3rem 2rem 2rem;
}
.post-body {
  max-width: 720px;
  margin: 0 auto;
  padding: 2rem 2rem 4rem;
  line-height: 1.8;
}
.post-body h1, .post-body h2, .post-body h3 {
  font-family: var(--font-serif);
  margin: 2rem 0 0.75rem;
}
.post-body p { margin-bottom: 1.25rem; }
.post-body ul, .post-body ol { margin: 0 0 1.25rem 1.5rem; }

/* ── Chart ─────────────────────────────────────── */
.chart-wrapper {
  background: var(--white);
  border: 1px solid var(--border);
  padding: 1.5rem;
  margin-bottom: 0.25rem;
}
.chart-select {
  font-family: var(--font-sans);
  font-size: 0.85rem;
  padding: 0.4rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: 2px;
  background: var(--white);
  color: var(--text);
  margin-bottom: 1.25rem;
  cursor: pointer;
}

/* ── Sobre ─────────────────────────────────────── */
.sobre-body {
  max-width: 640px;
  margin: 0 auto;
  padding: 3rem 2rem 4rem;
  line-height: 1.8;
}
.sobre-body p { margin-bottom: 1.25rem; color: var(--muted); }
.contact-link {
  display: inline-block;
  margin-top: 1rem;
  color: var(--accent);
  font-weight: 600;
  text-decoration: none;
  border-bottom: 1px solid var(--accent);
  padding-bottom: 1px;
}

/* ── Responsive ────────────────────────────────── */
@media (max-width: 640px) {
  .blog-grid { grid-template-columns: 1fr; }
  .hero h1 { font-size: 1.75rem; }
  .site-nav a { margin-left: 1rem; }
}
```

---

## Task 6: Base layout

**Files:**
- Create: `src/layouts/Base.astro`

- [ ] **Step 1: Crear directorio y archivo**

```bash
mkdir -p src/layouts
```

- [ ] **Step 2: Crear src/layouts/Base.astro**

```astro
---
import '../styles/global.css';

interface Props {
  title?: string;
  description?: string;
}

const {
  title = 'Inicio',
  description = 'Precios del mercado porcino español actualizados semanalmente',
} = Astro.props;

const currentPath = Astro.url.pathname;
---

<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title} · Lonja Porcino</title>
  <meta name="description" content={description} />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link
    href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@400;500;600&display=swap"
    rel="stylesheet"
  />
</head>
<body>
  <header class="site-header">
    <a href="/" class="logo">Lonja<span>Porcino</span></a>
    <nav class="site-nav">
      <a href="/" aria-current={currentPath === '/' ? 'page' : undefined}>Inicio</a>
      <a href="/precios" aria-current={currentPath === '/precios' ? 'page' : undefined}>Precios</a>
      <a href="/blog" aria-current={currentPath.startsWith('/blog') ? 'page' : undefined}>Blog</a>
      <a href="/sobre" aria-current={currentPath === '/sobre' ? 'page' : undefined}>Sobre</a>
    </nav>
  </header>

  <main>
    <slot />
  </main>

  <footer class="site-footer">
    <p>lonjaporcino.es · Precios orientativos, sin carácter contractual</p>
    <p>© {new Date().getFullYear()}</p>
  </footer>
</body>
</html>
```

- [ ] **Step 3: Crear favicon.svg en public/**

```bash
mkdir -p public
```

Crear `public/favicon.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" fill="#5C3D2E" rx="4"/>
  <text x="16" y="22" font-size="18" text-anchor="middle" fill="#F9F6F1" font-family="serif" font-weight="bold">L</text>
</svg>
```

---

## Task 7: PreciosTable component

**Files:**
- Create: `src/components/PreciosTable.astro`

- [ ] **Step 1: Crear directorio y archivo**

```bash
mkdir -p src/components
```

- [ ] **Step 2: Crear src/components/PreciosTable.astro**

```astro
---
interface PrecioRow {
  nombre: string;
  min: number | null;
  max: number | null;
  unidad: string;
}

interface Props {
  titulo: string;
  rows: PrecioRow[];
}

const { titulo, rows } = Astro.props;
const filledRows = rows.filter(r => r.min !== null || r.max !== null);

function fmt(val: number | null): string {
  if (val === null) return '—';
  return val.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
---

{filledRows.length > 0 && (
  <div class="price-block">
    <div class="price-block-header">{titulo}</div>
    <table>
      <thead>
        <tr>
          <th>Categoría</th>
          <th>Mín</th>
          <th>Máx</th>
          <th>Unidad</th>
        </tr>
      </thead>
      <tbody>
        {filledRows.map(row => (
          <tr>
            <td>{row.nombre}</td>
            <td class="price-min">{fmt(row.min)}</td>
            <td class="price-max">{fmt(row.max)}</td>
            <td class="price-unit">{row.unidad}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)}
```

---

## Task 8: HistoricoChart component

**Files:**
- Create: `src/components/HistoricoChart.tsx`

- [ ] **Step 1: Crear src/components/HistoricoChart.tsx**

```tsx
import { useState, useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip);

export interface SesionChartData {
  fecha: string;
  blanco_selecto: number | null;
  blanco_normal: number | null;
  blanco_graso: number | null;
  lechon_nacional: number | null;
  lechon_importacion: number | null;
  cochinillo_marca: number | null;
  cochinillo_estandar: number | null;
  bellota_100: number | null;
  bellota_75: number | null;
  bellota_50: number | null;
  cebo_campo: number | null;
  cebo: number | null;
  lechones_ibericos: number | null;
  primales_ibericos: number | null;
  cerdas_unica: number | null;
  cerdas_extra: number | null;
  cerdas_desecho: number | null;
  verracos: number | null;
}

const CATEGORIAS: { key: keyof Omit<SesionChartData, 'fecha'>; label: string; color: string }[] = [
  { key: 'blanco_selecto',    label: 'Cerdo Selecto',        color: '#5C3D2E' },
  { key: 'blanco_normal',     label: 'Cerdo Normal',         color: '#8B6E5A' },
  { key: 'blanco_graso',      label: 'Cerdo Graso',          color: '#B89E8E' },
  { key: 'lechon_nacional',   label: 'Lechón Nacional',      color: '#8B9E6E' },
  { key: 'lechon_importacion',label: 'Lechón Importación',   color: '#6B8049' },
  { key: 'bellota_100',       label: 'Bellota 100%',         color: '#2C5F2E' },
  { key: 'bellota_75',        label: 'Bellota 75%',          color: '#4A8F4D' },
  { key: 'bellota_50',        label: 'Bellota 50%',          color: '#6BBF6F' },
  { key: 'cebo_campo',        label: 'Cebo de Campo',        color: '#9E6B2E' },
  { key: 'cebo',              label: 'Cebo',                 color: '#C9924A' },
  { key: 'lechones_ibericos', label: 'Lechones Ibéricos',    color: '#4A3728' },
  { key: 'primales_ibericos', label: 'Primales Ibéricos',    color: '#7A5C48' },
  { key: 'cerdas_unica',      label: 'Cerdas — Única',       color: '#6B6B6B' },
  { key: 'cerdas_extra',      label: 'Cerdas — Extra',       color: '#9B9B9B' },
  { key: 'cerdas_desecho',    label: 'Cerdas — Desecho',     color: '#C0C0C0' },
  { key: 'verracos',          label: 'Verracos',             color: '#4A4A4A' },
];

interface Props {
  sesiones: SesionChartData[];
}

export function HistoricoChart({ sesiones }: Props) {
  const [selectedKey, setSelectedKey] = useState<string>(CATEGORIAS[0].key);
  const cat = CATEGORIAS.find(c => c.key === selectedKey) ?? CATEGORIAS[0];

  const labels = sesiones.map(s => s.fecha);
  const dataPoints = sesiones.map(s => s[selectedKey as keyof SesionChartData] as number | null);

  const chartData: ChartData<'line'> = {
    labels,
    datasets: [
      {
        label: cat.label,
        data: dataPoints,
        borderColor: cat.color,
        backgroundColor: 'transparent',
        borderWidth: 2,
        pointRadius: 4,
        pointBackgroundColor: cat.color,
        tension: 0.3,
        spanGaps: true,
      },
    ],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => `${(ctx.parsed.y as number)?.toFixed(2) ?? '—'} €`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: '#E2DDD7' },
        ticks: { font: { family: 'Inter, sans-serif', size: 11 } },
      },
      y: {
        grid: { color: '#E2DDD7' },
        ticks: {
          font: { family: 'Inter, sans-serif', size: 11 },
          callback: (v) => `${v} €`,
        },
      },
    },
  };

  return (
    <div class="chart-wrapper">
      <select
        className="chart-select"
        value={selectedKey}
        onChange={(e) => setSelectedKey(e.target.value)}
      >
        {CATEGORIAS.map(c => (
          <option key={c.key} value={c.key}>{c.label}</option>
        ))}
      </select>
      {sesiones.length >= 2 ? (
        <Line data={chartData} options={options} />
      ) : (
        <p style={{ color: '#6B6B6B', fontSize: '0.85rem' }}>
          Se necesitan al menos 2 sesiones para mostrar la evolución histórica.
        </p>
      )}
    </div>
  );
}
```

---

## Task 9: BlogCard component

**Files:**
- Create: `src/components/BlogCard.astro`

- [ ] **Step 1: Crear src/components/BlogCard.astro**

```astro
---
interface Props {
  slug: string;
  titulo: string;
  descripcion: string;
  fecha: string;
  tags: string[];
}

const { slug, titulo, descripcion, fecha, tags } = Astro.props;

function fmtFecha(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}
---

<a href={`/blog/${slug}`} class="blog-card">
  <p class="blog-date">{fmtFecha(fecha)}</p>
  <p class="blog-title">{titulo}</p>
  {descripcion && <p class="blog-desc">{descripcion}</p>}
  {tags.length > 0 && <span class="blog-tag">{tags[0]}</span>}
</a>
```

---

## Task 10: Astro content collection config

**Files:**
- Create: `src/content/config.ts`

- [ ] **Step 1: Crear src/content/config.ts**

```bash
mkdir -p src/content
```

```ts
import { defineCollection, z } from 'astro:content';

const posts = defineCollection({
  type: 'content',
  schema: z.object({
    titulo: z.string(),
    descripcion: z.string().optional().default(''),
    fecha: z.string().optional().default(''),
    draft: z.boolean().default(false),
    tags: z.array(z.string()).default([]),
  }),
});

export const collections = { posts };
```

---

## Task 11: Home page

**Files:**
- Create: `src/pages/index.astro`

- [ ] **Step 1: Crear directorios**

```bash
mkdir -p src/pages/blog src/pages/api/keystatic
```

- [ ] **Step 2: Crear src/pages/index.astro**

```astro
---
import Base from '../layouts/Base.astro';
import PreciosTable from '../components/PreciosTable.astro';
import BlogCard from '../components/BlogCard.astro';
import { createReader } from '@keystatic/core/reader';
import keystaticConfig from '../../keystatic.config';
import { getCollection } from 'astro:content';

const reader = createReader(process.cwd(), keystaticConfig);

const toNum = (v: string | null | undefined): number | null => {
  if (!v) return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
};

const allSesiones = await reader.collections.sesiones.all();
const sesion = allSesiones.sort((a, b) => b.slug.localeCompare(a.slug))[0];
const e = sesion?.entry;

const allPosts = await getCollection('posts', ({ data }) => !data.draft);
const posts = allPosts
  .sort((a, b) => (b.data.fecha ?? '').localeCompare(a.data.fecha ?? ''))
  .slice(0, 3);

function fmtFecha(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}
---

<Base title="Inicio">
  <section class="hero">
    {sesion ? (
      <p class="hero-label">Última sesión · {fmtFecha(sesion.slug)} · {e?.fuente ?? ''}</p>
    ) : (
      <p class="hero-label">Precios del mercado porcino</p>
    )}
    <h1>Precios del mercado<br />porcino en España</h1>
    <p class="hero-sub">Cotizaciones actualizadas semanalmente</p>
  </section>

  <hr class="divider" />

  <div class="container">
    {sesion ? (
      <>
        <p class="section-label">Precios actuales · {fmtFecha(sesion.slug)}</p>

        <PreciosTable
          titulo="Porcino Blanco — Cebo"
          rows={[
            { nombre: 'Cerdo Selecto', min: toNum(e?.blanco?.selecto_min), max: toNum(e?.blanco?.selecto_max), unidad: '€/kg canal' },
            { nombre: 'Cerdo Normal',  min: toNum(e?.blanco?.normal_min),  max: toNum(e?.blanco?.normal_max),  unidad: '€/kg canal' },
            { nombre: 'Cerdo Graso',   min: toNum(e?.blanco?.graso_min),   max: toNum(e?.blanco?.graso_max),   unidad: '€/kg canal' },
          ]}
        />

        <PreciosTable
          titulo="Lechones y Cochinillos"
          rows={[
            { nombre: 'Lechón Nacional (base 20 kg)',    min: toNum(e?.lechones?.lechon_nacional_min),    max: toNum(e?.lechones?.lechon_nacional_max),    unidad: '€/ud' },
            { nombre: 'Lechón Importación (base 20 kg)', min: toNum(e?.lechones?.lechon_importacion_min), max: toNum(e?.lechones?.lechon_importacion_max), unidad: '€/ud' },
            { nombre: 'Cochinillo con marca',            min: toNum(e?.lechones?.cochinillo_marca_min),   max: toNum(e?.lechones?.cochinillo_marca_max),   unidad: '€/kg' },
            { nombre: 'Cochinillo estándar',             min: toNum(e?.lechones?.cochinillo_estandar_min),max: toNum(e?.lechones?.cochinillo_estandar_max), unidad: '€/kg' },
          ]}
        />

        <PreciosTable
          titulo="Porcino Ibérico"
          rows={[
            { nombre: 'Bellota 100% pureza racial', min: toNum(e?.iberico?.bellota_100_min),       max: toNum(e?.iberico?.bellota_100_max),       unidad: '€/kg vivo' },
            { nombre: 'Bellota 75%',                min: toNum(e?.iberico?.bellota_75_min),        max: toNum(e?.iberico?.bellota_75_max),        unidad: '€/kg vivo' },
            { nombre: 'Bellota 50%',                min: toNum(e?.iberico?.bellota_50_min),        max: toNum(e?.iberico?.bellota_50_max),        unidad: '€/kg vivo' },
            { nombre: 'Cebo de Campo',              min: toNum(e?.iberico?.cebo_campo_min),        max: toNum(e?.iberico?.cebo_campo_max),        unidad: '€/kg vivo' },
            { nombre: 'Cebo',                       min: toNum(e?.iberico?.cebo_min),              max: toNum(e?.iberico?.cebo_max),              unidad: '€/kg vivo' },
            { nombre: 'Lechones Ibéricos',          min: toNum(e?.iberico?.lechones_ibericos_min), max: toNum(e?.iberico?.lechones_ibericos_max), unidad: '€/ud' },
            { nombre: 'Primales Ibéricos',          min: toNum(e?.iberico?.primales_ibericos_min), max: toNum(e?.iberico?.primales_ibericos_max), unidad: '€/kg vivo' },
          ]}
        />

        <PreciosTable
          titulo="Desvieje"
          rows={[
            { nombre: 'Cerdas — Única',   min: toNum(e?.desvieje?.cerdas_unica_min),   max: toNum(e?.desvieje?.cerdas_unica_max),   unidad: '€/kg canal' },
            { nombre: 'Cerdas — Extra',   min: toNum(e?.desvieje?.cerdas_extra_min),   max: toNum(e?.desvieje?.cerdas_extra_max),   unidad: '€/kg canal' },
            { nombre: 'Cerdas — Desecho', min: toNum(e?.desvieje?.cerdas_desecho_min), max: toNum(e?.desvieje?.cerdas_desecho_max), unidad: '€/kg canal' },
            { nombre: 'Verracos',         min: toNum(e?.desvieje?.verracos_min),        max: toNum(e?.desvieje?.verracos_max),        unidad: '€/kg canal' },
          ]}
        />
      </>
    ) : (
      <p style="color: var(--muted); padding: 2rem 0;">No hay sesiones de precios publicadas todavía.</p>
    )}

    {posts.length > 0 && (
      <>
        <p class="section-label">Últimos análisis</p>
        <div class="blog-grid">
          {posts.map(post => (
            <BlogCard
              slug={post.slug}
              titulo={post.data.titulo}
              descripcion={post.data.descripcion ?? ''}
              fecha={post.data.fecha ?? ''}
              tags={post.data.tags ?? []}
            />
          ))}
        </div>
      </>
    )}
  </div>
</Base>
```

---

## Task 12: Precios page

**Files:**
- Create: `src/pages/precios.astro`

- [ ] **Step 1: Crear src/pages/precios.astro**

```astro
---
import Base from '../layouts/Base.astro';
import PreciosTable from '../components/PreciosTable.astro';
import { HistoricoChart } from '../components/HistoricoChart';
import type { SesionChartData } from '../components/HistoricoChart';
import { createReader } from '@keystatic/core/reader';
import keystaticConfig from '../../keystatic.config';

const reader = createReader(process.cwd(), keystaticConfig);

const toNum = (v: string | null | undefined): number | null => {
  if (!v) return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
};

const avg = (min: number | null, max: number | null): number | null => {
  if (min === null && max === null) return null;
  if (min === null) return max;
  if (max === null) return min;
  return Math.round(((min + max) / 2) * 1000) / 1000;
};

const allSesiones = await reader.collections.sesiones.all();
const sorted = allSesiones.sort((a, b) => a.slug.localeCompare(b.slug));
const sesion = sorted[sorted.length - 1];
const e = sesion?.entry;

const chartData: SesionChartData[] = sorted.map(s => {
  const d = s.entry;
  return {
    fecha: s.slug,
    blanco_selecto:    avg(toNum(d.blanco?.selecto_min),           toNum(d.blanco?.selecto_max)),
    blanco_normal:     avg(toNum(d.blanco?.normal_min),            toNum(d.blanco?.normal_max)),
    blanco_graso:      avg(toNum(d.blanco?.graso_min),             toNum(d.blanco?.graso_max)),
    lechon_nacional:   avg(toNum(d.lechones?.lechon_nacional_min), toNum(d.lechones?.lechon_nacional_max)),
    lechon_importacion:avg(toNum(d.lechones?.lechon_importacion_min), toNum(d.lechones?.lechon_importacion_max)),
    cochinillo_marca:  avg(toNum(d.lechones?.cochinillo_marca_min),toNum(d.lechones?.cochinillo_marca_max)),
    cochinillo_estandar: avg(toNum(d.lechones?.cochinillo_estandar_min), toNum(d.lechones?.cochinillo_estandar_max)),
    bellota_100:       avg(toNum(d.iberico?.bellota_100_min),      toNum(d.iberico?.bellota_100_max)),
    bellota_75:        avg(toNum(d.iberico?.bellota_75_min),       toNum(d.iberico?.bellota_75_max)),
    bellota_50:        avg(toNum(d.iberico?.bellota_50_min),       toNum(d.iberico?.bellota_50_max)),
    cebo_campo:        avg(toNum(d.iberico?.cebo_campo_min),       toNum(d.iberico?.cebo_campo_max)),
    cebo:              avg(toNum(d.iberico?.cebo_min),             toNum(d.iberico?.cebo_max)),
    lechones_ibericos: avg(toNum(d.iberico?.lechones_ibericos_min),toNum(d.iberico?.lechones_ibericos_max)),
    primales_ibericos: avg(toNum(d.iberico?.primales_ibericos_min),toNum(d.iberico?.primales_ibericos_max)),
    cerdas_unica:      avg(toNum(d.desvieje?.cerdas_unica_min),   toNum(d.desvieje?.cerdas_unica_max)),
    cerdas_extra:      avg(toNum(d.desvieje?.cerdas_extra_min),   toNum(d.desvieje?.cerdas_extra_max)),
    cerdas_desecho:    avg(toNum(d.desvieje?.cerdas_desecho_min), toNum(d.desvieje?.cerdas_desecho_max)),
    verracos:          avg(toNum(d.desvieje?.verracos_min),        toNum(d.desvieje?.verracos_max)),
  };
});
---

<Base title="Precios" description="Precios completos del mercado porcino español con histórico">
  <section class="hero">
    <p class="hero-label">Precios del mercado porcino</p>
    <h1>Cotizaciones<br />semanales</h1>
    {sesion && <p class="hero-sub">Última sesión: {sesion.slug} · Fuente: {sesion.entry.fuente ?? '—'}</p>}
  </section>

  <hr class="divider" />

  <div class="container">
    {sesion ? (
      <>
        <p class="section-label">Precios actuales · {sesion.slug}</p>

        <PreciosTable
          titulo="Porcino Blanco — Cebo"
          rows={[
            { nombre: 'Cerdo Selecto', min: toNum(e?.blanco?.selecto_min), max: toNum(e?.blanco?.selecto_max), unidad: '€/kg canal' },
            { nombre: 'Cerdo Normal',  min: toNum(e?.blanco?.normal_min),  max: toNum(e?.blanco?.normal_max),  unidad: '€/kg canal' },
            { nombre: 'Cerdo Graso',   min: toNum(e?.blanco?.graso_min),   max: toNum(e?.blanco?.graso_max),   unidad: '€/kg canal' },
          ]}
        />

        <PreciosTable
          titulo="Lechones y Cochinillos"
          rows={[
            { nombre: 'Lechón Nacional (base 20 kg)',    min: toNum(e?.lechones?.lechon_nacional_min),    max: toNum(e?.lechones?.lechon_nacional_max),    unidad: '€/ud' },
            { nombre: 'Lechón Importación (base 20 kg)', min: toNum(e?.lechones?.lechon_importacion_min), max: toNum(e?.lechones?.lechon_importacion_max), unidad: '€/ud' },
            { nombre: 'Cochinillo con marca',            min: toNum(e?.lechones?.cochinillo_marca_min),   max: toNum(e?.lechones?.cochinillo_marca_max),   unidad: '€/kg' },
            { nombre: 'Cochinillo estándar',             min: toNum(e?.lechones?.cochinillo_estandar_min),max: toNum(e?.lechones?.cochinillo_estandar_max), unidad: '€/kg' },
          ]}
        />

        <PreciosTable
          titulo="Porcino Ibérico"
          rows={[
            { nombre: 'Bellota 100% pureza racial', min: toNum(e?.iberico?.bellota_100_min),       max: toNum(e?.iberico?.bellota_100_max),       unidad: '€/kg vivo' },
            { nombre: 'Bellota 75%',                min: toNum(e?.iberico?.bellota_75_min),        max: toNum(e?.iberico?.bellota_75_max),        unidad: '€/kg vivo' },
            { nombre: 'Bellota 50%',                min: toNum(e?.iberico?.bellota_50_min),        max: toNum(e?.iberico?.bellota_50_max),        unidad: '€/kg vivo' },
            { nombre: 'Cebo de Campo',              min: toNum(e?.iberico?.cebo_campo_min),        max: toNum(e?.iberico?.cebo_campo_max),        unidad: '€/kg vivo' },
            { nombre: 'Cebo',                       min: toNum(e?.iberico?.cebo_min),              max: toNum(e?.iberico?.cebo_max),              unidad: '€/kg vivo' },
            { nombre: 'Lechones Ibéricos',          min: toNum(e?.iberico?.lechones_ibericos_min), max: toNum(e?.iberico?.lechones_ibericos_max), unidad: '€/ud' },
            { nombre: 'Primales Ibéricos',          min: toNum(e?.iberico?.primales_ibericos_min), max: toNum(e?.iberico?.primales_ibericos_max), unidad: '€/kg vivo' },
          ]}
        />

        <PreciosTable
          titulo="Desvieje"
          rows={[
            { nombre: 'Cerdas — Única',   min: toNum(e?.desvieje?.cerdas_unica_min),   max: toNum(e?.desvieje?.cerdas_unica_max),   unidad: '€/kg canal' },
            { nombre: 'Cerdas — Extra',   min: toNum(e?.desvieje?.cerdas_extra_min),   max: toNum(e?.desvieje?.cerdas_extra_max),   unidad: '€/kg canal' },
            { nombre: 'Cerdas — Desecho', min: toNum(e?.desvieje?.cerdas_desecho_min), max: toNum(e?.desvieje?.cerdas_desecho_max), unidad: '€/kg canal' },
            { nombre: 'Verracos',         min: toNum(e?.desvieje?.verracos_min),        max: toNum(e?.desvieje?.verracos_max),        unidad: '€/kg canal' },
          ]}
        />

        {sesion.entry.notas && (
          <p style="font-size:0.85rem; color:var(--muted); margin-top:1rem; font-style:italic;">
            {sesion.entry.notas}
          </p>
        )}
      </>
    ) : (
      <p style="color: var(--muted); padding: 2rem 0;">No hay sesiones publicadas todavía.</p>
    )}

    <p class="section-label">Evolución histórica de precios</p>
    <HistoricoChart sesiones={chartData} client:load />
  </div>
</Base>
```

---

## Task 13: Blog pages

**Files:**
- Create: `src/pages/blog/index.astro`
- Create: `src/pages/blog/[slug].astro`

- [ ] **Step 1: Crear src/pages/blog/index.astro**

```astro
---
import Base from '../../layouts/Base.astro';
import BlogCard from '../../components/BlogCard.astro';
import { getCollection } from 'astro:content';

const posts = (await getCollection('posts', ({ data }) => !data.draft))
  .sort((a, b) => (b.data.fecha ?? '').localeCompare(a.data.fecha ?? ''));
---

<Base title="Blog" description="Análisis y noticias del mercado porcino español">
  <section class="hero">
    <p class="hero-label">Artículos</p>
    <h1>Análisis del<br />mercado porcino</h1>
  </section>

  <hr class="divider" />

  <div class="container">
    <p class="section-label">{posts.length} {posts.length === 1 ? 'artículo' : 'artículos'}</p>
    {posts.length > 0 ? (
      <div class="blog-grid">
        {posts.map(post => (
          <BlogCard
            slug={post.slug}
            titulo={post.data.titulo}
            descripcion={post.data.descripcion ?? ''}
            fecha={post.data.fecha ?? ''}
            tags={post.data.tags ?? []}
          />
        ))}
      </div>
    ) : (
      <p style="color: var(--muted);">No hay artículos publicados todavía.</p>
    )}
  </div>
</Base>
```

- [ ] **Step 2: Crear src/pages/blog/[slug].astro**

```astro
---
import Base from '../../layouts/Base.astro';
import { getCollection, render } from 'astro:content';

export async function getStaticPaths() {
  const posts = await getCollection('posts', ({ data }) => !data.draft);
  return posts.map(post => ({ params: { slug: post.slug }, props: { post } }));
}

const { post } = Astro.props;
const { Content } = await render(post);

function fmtFecha(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}
---

<Base title={post.data.titulo} description={post.data.descripcion ?? ''}>
  <div class="post-header">
    <p class="hero-label">{fmtFecha(post.data.fecha ?? '')}</p>
    <h1 style="font-family: var(--font-serif); font-size: 2rem; line-height: 1.2; margin-bottom: 0.75rem;">
      {post.data.titulo}
    </h1>
    {post.data.descripcion && (
      <p style="color: var(--muted); font-size: 1rem;">{post.data.descripcion}</p>
    )}
    {post.data.tags?.length > 0 && (
      <div style="margin-top: 0.75rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
        {post.data.tags.map((tag: string) => (
          <span class="blog-tag">{tag}</span>
        ))}
      </div>
    )}
  </div>

  <hr class="divider" />

  <article class="post-body">
    <Content />
  </article>
</Base>
```

---

## Task 14: Sobre page

**Files:**
- Create: `src/pages/sobre.astro`

- [ ] **Step 1: Crear src/pages/sobre.astro**

```astro
---
import Base from '../layouts/Base.astro';
import { createReader } from '@keystatic/core/reader';
import keystaticConfig from '../../keystatic.config';

const reader = createReader(process.cwd(), keystaticConfig);
const sobre = await reader.singletons.sobre.read();
---

<Base title="Sobre" description="Sobre Lonja Porcino — precios del mercado porcino español">
  <section class="hero">
    <p class="hero-label">Sobre el sitio</p>
    <h1>Lonja Porcino</h1>
  </section>

  <hr class="divider" />

  <div class="sobre-body">
    {sobre?.descripcion
      ? sobre.descripcion.split('\n').map((p: string) => p.trim()).filter(Boolean).map((p: string) => (
          <p>{p}</p>
        ))
      : <p>Sitio de publicación de precios del mercado porcino español.</p>
    }

    {sobre?.email && (
      <a href={`mailto:${sobre.email}`} class="contact-link">
        {sobre.email}
      </a>
    )}
  </div>
</Base>
```

---

## Task 15: Seed content

**Files:**
- Create: `src/content/sesiones/2026-05-19.yaml`
- Create: `src/content/posts/bienvenidos-a-lonja-porcino.md`
- Create: `src/content/sobre.yaml`

- [ ] **Step 1: Crear directorios de contenido**

```bash
mkdir -p src/content/sesiones src/content/posts
```

- [ ] **Step 2: Crear src/content/sesiones/2026-05-19.yaml**

```yaml
fecha: 2026-05-19
fuente: Mercolleida
notas: Semana de apertura. Precios estables en blanco, ligera presión bajista en ibérico de cebo.
blanco:
  selecto_min: '1.88'
  selecto_max: '1.94'
  normal_min: '1.82'
  normal_max: '1.88'
  graso_min: '1.70'
  graso_max: '1.78'
lechones:
  lechon_nacional_min: '42.00'
  lechon_nacional_max: '46.00'
  lechon_importacion_min: '38.00'
  lechon_importacion_max: '42.00'
  cochinillo_marca_min: '3.20'
  cochinillo_marca_max: '3.60'
  cochinillo_estandar_min: '2.80'
  cochinillo_estandar_max: '3.20'
iberico:
  bellota_100_min: '3.80'
  bellota_100_max: '4.20'
  bellota_75_min: '3.40'
  bellota_75_max: '3.80'
  bellota_50_min: '3.00'
  bellota_50_max: '3.40'
  cebo_campo_min: '2.20'
  cebo_campo_max: '2.50'
  cebo_min: '1.95'
  cebo_max: '2.20'
  lechones_ibericos_min: '55.00'
  lechones_ibericos_max: '65.00'
  primales_ibericos_min: '2.80'
  primales_ibericos_max: '3.10'
desvieje:
  cerdas_unica_min: '1.10'
  cerdas_unica_max: '1.22'
  cerdas_extra_min: '0.95'
  cerdas_extra_max: '1.10'
  cerdas_desecho_min: '0.75'
  cerdas_desecho_max: '0.95'
  verracos_min: '0.65'
  verracos_max: '0.85'
```

- [ ] **Step 3: Crear src/content/posts/bienvenidos-a-lonja-porcino.md**

```markdown
---
titulo: Bienvenidos a Lonja Porcino
descripcion: Primera publicación del sitio de referencia de precios del mercado porcino español.
fecha: '2026-05-19'
draft: false
tags:
  - mercado
  - presentación
---

# Bienvenidos a Lonja Porcino

Lonja Porcino nace con un objetivo claro: ofrecer un punto de referencia semanal para los precios del mercado porcino en España. Sin ruido, sin publicidad, sin complicaciones.

## Qué publicamos

Cada semana publicamos las cotizaciones de las principales lonjas españolas, organizadas en cuatro bloques:

- **Porcino Blanco (Cebo)**: cerdo selecto, normal y graso en €/kg canal
- **Lechones y Cochinillos**: lechón nacional e importado (base 20 kg) y cochinillo con y sin marca de garantía
- **Porcino Ibérico**: bellota 100%, 75% y 50%, cebo de campo, cebo, lechones y primales ibéricos
- **Desvieje**: cerdas por categoría (única, extra, desecho) y verracos

## Evolución histórica

En la página de [Precios](/precios) encontrarás también la gráfica de evolución histórica. Selecciona cualquier categoría para ver cómo ha evolucionado el precio medio a lo largo del tiempo.

## Cómo mantenerse al día

Los precios se actualizan cada semana. No hay newsletter, no hay suscripción. Solo una URL que consultar: **lonjaporcino.es**.
```

- [ ] **Step 4: Crear src/content/sobre.yaml**

```yaml
descripcion: |-
  Lonja Porcino es un sitio de consulta de precios del mercado porcino español. Publicamos cotizaciones semanales de las principales lonjas del país, organizadas por categoría.

  Los precios son orientativos y no tienen carácter contractual. Si tienes cualquier consulta o quieres colaborar, escríbenos.
email: contacto@lonjaporcino.es
```

---

## Task 16: .gitignore + .env.example

**Files:**
- Create: `.gitignore`
- Create: `.env.example`

- [ ] **Step 1: Crear .gitignore**

```
node_modules/
dist/
.astro/
.env
.env.local
.DS_Store
```

- [ ] **Step 2: Crear .env.example**

```bash
# Variables de entorno para Keystatic en producción (Vercel)
# Crear un GitHub App en: https://github.com/settings/apps/new
# Callback URL: https://www.lonjaporcino.es/api/keystatic/github/oauth/callback
#               https://lonjaporcino.es/api/keystatic/github/oauth/callback
# Activar: "Expire user authorization tokens"
# Permisos: Repository contents → Read and write

KEYSTATIC_GITHUB_CLIENT_ID=
KEYSTATIC_GITHUB_CLIENT_SECRET=
KEYSTATIC_SECRET=
# Generar con: openssl rand -hex 32
```

---

## Task 17: Build verification

- [ ] **Step 1: Verificar tipos con TypeScript**

```bash
npx astro check
```

Resultado esperado: 0 errores. Si hay errores de tipos, corregirlos antes de continuar.

- [ ] **Step 2: Build de producción**

```bash
npm run build
```

Resultado esperado: `dist/` generado sin errores. Las páginas estáticas están en `dist/`.

- [ ] **Step 3: Preview local**

```bash
npm run preview
```

Abrir en navegador y verificar:
- `/` → tabla de precios de la sesión seed + artículo seed
- `/precios` → tabla completa + gráfica (con 1 sesión muestra el aviso de "Se necesitan al menos 2 sesiones")
- `/blog` → listado con el artículo seed
- `/blog/bienvenidos-a-lonja-porcino` → artículo completo renderizado
- `/sobre` → descripción y email

---

## Task 18: Git init + commit inicial

- [ ] **Step 1: Inicializar repositorio git**

```bash
git init
git add .
git commit -m "feat: initial project setup — Astro + Keystatic + Vercel"
```

- [ ] **Step 2: Crear repositorio en GitHub y conectar**

Crear repo `lonjaporcino.es` en GitHub (puede ser privado o público). Luego:

```bash
git remote add origin https://github.com/TU_USUARIO/lonjaporcino.es.git
git branch -M main
git push -u origin main
```

---

## Checklist post-deploy (manual)

Tras el primer push a GitHub y la conexión con Vercel:

```
[ ] Crear GitHub App en https://github.com/settings/apps/new
    - Callback URL: https://www.lonjaporcino.es/api/keystatic/github/oauth/callback
    - Callback URL: https://lonjaporcino.es/api/keystatic/github/oauth/callback
    - "Expire user authorization tokens": ACTIVADO
    - Permissions → Contents: Read and write
    - Install App en el repositorio lonjaporcino.es

[ ] En Vercel → Settings → Environment Variables (entorno: Production):
    - KEYSTATIC_GITHUB_CLIENT_ID
    - KEYSTATIC_GITHUB_CLIENT_SECRET
    - KEYSTATIC_SECRET (openssl rand -hex 32)

[ ] Redesplegar en Vercel tras añadir las variables

[ ] Acceder a https://www.lonjaporcino.es/keystatic → Login with GitHub
```
