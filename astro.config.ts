import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import { siteConfig } from './config/site.config';

// Cloudflare-native portfolio platform.
// - output: 'server' (Workers runtime) so Pages Functions (src/pages/api/**)
//   and dynamic routes (src/pages/blog/[slug].astro) run at the edge.
// - Most content pages opt back into static prerendering via
//   `export const prerender = true` — static-first, dynamic only where earned.
export default defineConfig({
  site: siteConfig.url,
  output: 'server',
  adapter: cloudflare({
    imageService: 'passthrough',
    platformProxy: {
      enabled: true,
    },
  }),
  // Keep bundled scripts + styles EXTERNAL (dist/_astro/*.js) so the strict CSP
  // in public/_headers (script-src 'self', no unsafe-inline) is satisfiable.
  vite: {
    build: {
      assetsInlineLimit: 0,
    },
  },
});
