import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const prerender = true;

const SITE = 'https://lonjaporcino.es';

export const GET: APIRoute = async () => {
  const posts = await getCollection('posts', ({ data }) => !data.draft);

  const staticUrls = [
    { loc: `${SITE}/`,        changefreq: 'weekly', priority: '1.0' },
    { loc: `${SITE}/precios`, changefreq: 'weekly', priority: '0.9' },
    { loc: `${SITE}/blog`,    changefreq: 'weekly', priority: '0.7' },
    // /sobre tiene noindex — no incluir en sitemap para evitar señal contradictoria
  ];

  const postUrls = posts.map(post => ({
    loc:        `${SITE}/blog/${post.slug}`,
    lastmod:    post.data.fecha ?? '',
    changefreq: 'monthly',
    priority:   '0.6',
  }));

  const render = (url: { loc: string; lastmod?: string; changefreq: string; priority: string }) => `
  <url>
    <loc>${url.loc}</loc>${url.lastmod ? `\n    <lastmod>${url.lastmod}</lastmod>` : ''}
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...staticUrls, ...postUrls].map(render).join('')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
};
