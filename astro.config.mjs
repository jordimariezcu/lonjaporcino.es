import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel/serverless';
import keystatic from '@keystatic/astro';
export default defineConfig({
  site: 'https://lonjaporcino.es',
  output: 'hybrid',
  trailingSlash: 'never',
  adapter: vercel(),
  integrations: [react(), keystatic()],
  redirects: {
    // Blog posts migrados a la colección /lonjas/
    // Nota: Vercel normaliza trailing slashes con 308 antes de llegar a Astro,
    // así que solo es necesaria la versión sin slash.
    '/blog/mercolleida-lonja-porcino-lleida': { status: 301, destination: '/lonjas/mercolleida' },
    '/blog/lonja-agropecuaria-binefar':       { status: 301, destination: '/lonjas/binefar' },
  },
});
