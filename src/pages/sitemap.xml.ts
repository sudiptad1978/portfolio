import type { APIRoute } from 'astro';
import { siteConfig } from '../../config/site.config';
import { getAllPostSlugs } from '../lib/blog';

/**
 * GET /sitemap.xml — generated at request time from config + content
 * collection + D1-synced posts, so freshly syndicated posts are included
 * immediately (no rebuild required). Edge-cached for an hour.
 */
export const GET: APIRoute = async ({ locals }) => {
  const base = siteConfig.url.replace(/\/$/, '');
  const slugs = await getAllPostSlugs(locals.runtime?.env);

  const urls = [`${base}/`, `${base}/blog`, ...slugs.map((slug) => `${base}/blog/${slug}/`)];

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((url) => `  <url><loc>${url}</loc></url>`).join('\n') +
    '\n</urlset>';

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
