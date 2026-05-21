import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel/serverless';
import keystatic from '@keystatic/astro';
export default defineConfig({
  site: 'https://lonjaporcino.es',
  output: 'hybrid',
  adapter: vercel(),
  integrations: [react(), keystatic()],
});
