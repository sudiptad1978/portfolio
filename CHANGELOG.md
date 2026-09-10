# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and
the project adheres to [Semantic Versioning](https://semver.org/).

## [0.1.0] — 2026-09-10

Initial platform skeleton (architecture blueprint Phases 1–8).

### Added
- **Foundation:** Astro 5 (server output) + `@astrojs/cloudflare` adapter,
  static-first prerendering for content pages, SSR for dynamic routes.
- **Config layer:** `config/site.config.ts` — Zod-validated at build time;
  identity, content, theme, template, accent (with auto-computed WCAG contrast).
- **Theme engine:** 4 token-only themes (`minimal`, `modern`, `terminal`,
  `professional`), each with light/dark palettes and a pre-paint mode resolver
  (no flash-of-wrong-theme).
- **Template presets:** `developer`, `qa-engineer`, `sdet`, `technical-lead`
  section orders rendered by shared components.
- **Data layer:** D1 schema + migrations (profile, experience, projects, skills,
  certifications, education, testimonials, blog_posts, contact_submissions,
  sync_log) with indexes; KV cache-aside for latest-posts; R2 binding for media.
- **Blog:** markdown content collection + D1 merge (dedupe by slug);
  `/blog/[slug]` renders D1-first (fresh posts without rebuild) with collection
  fallback; `GET /api/blog` (KV → D1 → collection); dynamic `sitemap.xml`
  including synced posts.
- **Blog syndication Worker:** cron (every 6h), Medium RSS + arbitrary
  RSS/Atom, retry with backoff, strict allow-list sanitizer, dedupe upserts,
  per-source failure isolation, `sync_log` audit trail, KV invalidation.
- **Contact form:** progressive enhancement (native POST + fetch), Zod
  validation, KV rate limiting (10/min per hashed IP), Turnstile server-side
  verification, D1 persistence.
- **APIs:** `GET /api/health` (per-binding status), `POST /api/contact`,
  `GET /api/blog`.
- **Security:** strict CSP (external scripts only + one hashed pre-paint
  snippet), HSTS, nosniff, Referrer-Policy, Permissions-Policy, COOP,
  frame-ancestors none; Astro checkOrigin CSRF protection left enabled.
- **Testing:** 39 unit tests (config schema, sanitizer, RSS parser, slugify,
  reading time, rate limiter, validation, color contrast), Playwright e2e
  (home, blog, contact) across desktop + mobile viewports, axe a11y gate
  (zero serious/critical), production smoke suite.
- **CI/CD:** GitHub Actions — quality gate → e2e/a11y/Lighthouse → Pages
  preview (PRs) → D1 migrations + production deploy + smoke (main); blog-sync
  worker deploy workflow; Dependabot (npm weekly, actions monthly, grouped).
- **Tooling:** `npm run doctor` pre-flight checks, `scripts/csp-hash.mjs`,
  `.env.example`, `.dev.vars.example`, issue/PR templates, MIT license.
