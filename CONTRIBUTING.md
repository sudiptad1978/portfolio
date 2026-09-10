# Contributing

Thanks for helping improve the portfolio platform! This project is intentionally
small in scope (see the Non-Goals section of
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)) — keep PRs aligned with it.

## Development setup

```bash
npm install
npm run dev            # Astro dev server (bindings proxied locally)
npm run db:migrate     # local D1 schema (needed for contact/blog API work)
npm run test           # unit tests
npm run preview:cf     # production-shaped preview (wrangler pages dev)
```

## Before opening a PR

All CI gates must pass locally:

```bash
npm run lint           # Prettier (run `npm run format` to fix)
npm run typecheck      # astro check
npm run test           # Vitest
npm run build          # Astro + Cloudflare adapter build
npm run test:e2e       # Playwright (boots a local preview + local bindings)
npm run test:a11y      # axe — zero serious/critical violations allowed
```

## Ground rules

- **Config-driven:** new user-facing content belongs in `config/site.config.ts`
  (with Zod schema) or a content collection — not hard-coded in components.
- **Themes are tokens:** components must consume CSS custom properties only;
  never hard-code colors/radii/fonts in components or `global.css` layout rules.
- **Static-first:** new pages should prerender unless they genuinely need
  per-request data. Dynamic routes read via `src/lib/blog.ts` (KV → D1 →
  collection) — don't query D1 directly from components.
- **Prepared statements only.** No string-concatenated SQL, ever.
- **Security:** new inline scripts need a CSP hash in `public/_headers`
  (`node scripts/csp-hash.mjs`); prefer external bundled scripts.
- **Tests ship with the change:** behavior changes need unit coverage; new
  routes need e2e + a11y coverage.

## Commit style

[Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`,
`chore:`, `docs:` …) — releases and the changelog are driven by them.
