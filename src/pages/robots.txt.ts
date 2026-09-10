import { siteConfig } from '../../config/site.config';

export const prerender = true;

/** GET /robots.txt — generated at build time from the config. */
export const GET = () =>
  new Response(`User-agent: *\nAllow: /\n\nSitemap: ${siteConfig.url}/sitemap.xml\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
