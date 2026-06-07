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
    '/blog/mercolleida-lonja-porcino-lleida': { status: 301, destination: '/lonjas/mercolleida' },
    '/blog/lonja-agropecuaria-binefar':       { status: 301, destination: '/lonjas/binefar' },
  },
});
