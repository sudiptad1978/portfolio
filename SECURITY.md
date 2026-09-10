# Security Policy

## Supported versions

Only the latest release on `main` is supported.

## Reporting a vulnerability

Please open a private security advisory:
**https://github.com/sudiptad1978/portfolio/security/advisories/new**
(or contact the maintainer via the site's email). Please do **not** open public
issues for suspected vulnerabilities. You will hear back within a few days.

## Security model (what this template ships with)

| Layer            | Implementation                                                                                                                                    |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bot protection   | Cloudflare Turnstile, verified **server-side** before any D1 write                                                                                |
| Rate limiting    | KV counter per **hashed** IP (raw IPs are never stored), 10 req/min on `/api/contact`                                                             |
| Input validation | Zod schemas on every API payload; never trust client validation                                                                                   |
| XSS              | Strict allow-list sanitizer for all syndicated HTML before storage; Astro auto-escaping elsewhere; `set:html` used only for pre-sanitized content |
| SQL injection    | D1 prepared statements (`.bind()`) exclusively                                                                                                    |
| CSRF             | Astro `checkOrigin` (enabled) blocks cross-site form-style POSTs                                                                                  |
| CSP              | `script-src 'self'` + hash for the pre-paint snippet; no `unsafe-inline` for scripts; `object-src 'none'`; `frame-ancestors 'none'`               |
| Transport        | HSTS with preload                                                                                                                                 |
| Secrets          | GitHub Actions secrets + `wrangler secret put` only; `.env`/`.dev.vars` gitignored; `.env.example` ships placeholders                             |

## Known trade-offs (documented, deliberate)

- The syndication sanitizer (`src/lib/sanitize.ts`) is a compact, unit-tested
  regex allow-list. For high-volume, fully untrusted feeds, prefer a
  battle-tested sanitizer library that runs on Workers.
- When `TURNSTILE_SECRET_KEY` is not configured (e.g. local dev), contact
  submissions are accepted with `turnstile_verified = 0`. Production
  deployments must set the secret.
- The rate limiter is a best-effort fixed window (KV), not a strict quota;
  Cloudflare's native rate-limiting rules are the recommended second layer.
