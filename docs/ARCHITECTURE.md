# Quality-Engineer Portfolio Platform — Technical Architecture Blueprint

**Subject:** sudipta-dutta-portfolio.pages.dev → open-source, Cloudflare-native portfolio platform
**Audience:** senior engineer implementing this as a real backlog
**Author role:** Principal Cloudflare Architect / DevOps / Full-stack / OSS Architect

---

## 1. Executive Summary

The current site is a well-designed, content-rich, single-owner static portfolio already deployed on Cloudflare Pages. It does not need a rewrite of its visual design — it needs a **platformization**: separating personal content from code, adding a real data layer for the blog and contact form, and packaging the whole thing so any QA/dev professional can fork it and ship their own instance in under an hour.

**Recommended stack:** **Astro** (islands architecture) + **Cloudflare Pages (Workers runtime)** + **D1** (structured content) + **KV** (config/cache) + **R2** (media) + **Cron Triggers** (blog sync) + **GitHub Actions** (CI/CD). No Next.js, no SvelteKit, no client-side SPA framework as the default — Astro ships near-zero JS by default and adopts Cloudflare's Workers-based SSR adapter natively.

This document treats the live site as ground truth for the audit (fetched directly), and everything beyond that is a stated recommendation, not an observed fact.

---

## 2. Existing Portfolio Audit

### 2.1 Observed facts (from the live site and its linked GitHub repo)

- Single-page portfolio at `sudipta-dutta-portfolio.pages.dev`, deployed on **Cloudflare Pages**.
- A second, apparently earlier, repo `sudiptad1978.github.io` exists (Apache-2.0 licensed, 1 commit, README+LICENSE only — no visible source tree), suggesting the live site's actual source lives in a different, non-public or differently-named repo. This is a gap: **the production source is not clearly discoverable from the public GitHub profile.**
- Sections present: hero, "point of view," capabilities ("what I bring"), working stack, selected GitHub repos, experience timeline, career snapshot (domains/languages), education, blog teaser list (6 posts), contact block with Cal.com embed, and an **AI portfolio assistant widget** (chat-style, scoped to public portfolio content).
- Blog exists at `/blog` with individual post routes (`/blog/<slug>/`), each showing publish date and reading time — implying either a static generator with per-post pages or an edge-rendered listing.
- Assets are served as **content-hashed WebP** (e.g. `profile-360.4393835d99.webp`), which is a strong signal of a modern static-site build pipeline (Astro, Next.js static export, or 11ty all produce this pattern) rather than hand-rolled HTML.
- Theme toggle exists: Dark / Light / System, plus an "Accent" control — client-side personalization already implemented.
- Metadata is thorough: Open Graph, Twitter Card, meta description, theme-color — good baseline SEO hygiene already in place.
- Contact paths: direct `mailto:`, Cal.com booking widget, phone `tel:` link, LinkedIn. No visible native contact form (i.e., no first-party POST endpoint observed on the page).
- "PERSONAL PORTFOLIO 2026" and footer copyright confirm active 2026 maintenance.

### 2.2 Facts I cannot verify from a static fetch (explicitly unknown, not assumed)

- Actual framework/bundler (Astro vs. Next static export vs. custom) — inferred, not confirmed, from the hashed-asset pattern and clean semantic markup.
- Whether the AI assistant widget calls a Cloudflare Worker, a third-party API, or is purely client-side/mocked.
- Real Core Web Vitals — would require Lighthouse/CrUX data, which this audit did not run.
- Actual current use of D1/KV/R2 (page fetch cannot detect this).

### 2.3 Evaluation

| Dimension                | Assessment                                                                                                                                                                                                                                |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UX/UI                    | Strong, intentional visual design; clear narrative structure (proof → capability → evidence → CTA). Retain as design language reference.                                                                                                  |
| Information architecture | Logical single-page scroll with anchor nav; blog is correctly split into its own route. Good.                                                                                                                                             |
| Mobile responsiveness    | Cannot fully verify without rendering, but markup uses standard responsive patterns (viewport meta, semantic sections). Assume acceptable, verify with Playwright + real devices in Phase 6.                                              |
| Accessibility            | "Skip to content" link present (good sign). No ARIA audit possible from raw fetch — must be verified with axe-core.                                                                                                                       |
| SEO                      | Above-average for a personal site: OG/Twitter tags, descriptive titles, per-post metadata implied by blog list. Missing (unconfirmed): JSON-LD structured data, sitemap.xml/robots.txt verification, canonical tags.                      |
| Performance              | Hashed, optimized WebP images and what looks like a static-first build are good signals. Real risk is the embedded Cal.com iframe/script and any chat-assistant JS — these are the most likely LCP/TBT offenders and must be lazy-loaded. |
| Content structure        | Currently **hard-coded into the page**, not data-driven — experience, skills, projects, blog teasers all appear baked into markup/build rather than pulled from a config or database. This is the central limitation for reuse.           |
| Maintainability          | Low for third parties: no visible config layer, unclear source repo, content and code intertwined. High for the original owner, since it's their own hand-tuned site.                                                                     |
| Security                 | Contact happens via mailto/Cal.com (offloads spam/security risk to third parties — actually a reasonable current choice). No visible form endpoint to attack.                                                                             |
| Deployment               | Cloudflare Pages confirmed. CI/CD pipeline not visible publicly.                                                                                                                                                                          |

### 2.4 Retain / Refactor / Replace / Remove

- **Retain:** overall visual design system, narrative IA, theme/accent switcher UX, hashed-asset build pipeline pattern, Cloudflare Pages as the hosting target, Cal.com for scheduling (don't reinvent booking).
- **Refactor:** content (experience, skills, projects, blog teasers) out of markup and into a config/data layer; blog from (assumed) static-only into a syndication-capable system; metadata into a systematic SEO layer (JSON-LD, sitemap, robots.txt as generated artifacts, not hand-written).
- **Replace:** ad hoc single-repo structure → monorepo-style OSS template with `themes/`, `templates/`, `config/`; unclear/undocumented deployment → explicit GitHub Actions pipeline with preview/prod environments.
- **Remove/reconsider:** nothing user-facing needs removal — the AI assistant widget and Cal.com embed should be **deferred/lazy-loaded**, not removed, to protect Core Web Vitals.

### 2.5 Architectural limitations

1. Content is coupled to code — a fork requires editing markup, not config, to change identity.
2. No visible data layer — blog posts, if written by hand per route, don't scale to automated syndication from Medium/RSS.
3. No visible automated testing or CI gates from the public surface.
4. Unclear canonical source repo undermines the "open-source template" goal — a template must have one obvious, well-documented home.

---

## 3. Goals and Non-Goals

**Goals:** reusable OSS template; Cloudflare-native; static-first with edge dynamism only where it earns its keep; automated blog syndication; strong testing/CI story (this _is_ a QA portfolio, so the pipeline is itself a demo artifact); fast fork-to-deploy path.

**Non-goals:** this is not a CMS product, not a multi-tenant SaaS, not a framework-agnostic abstraction layer. It targets one deployment target (Cloudflare) and one primary framework (Astro) on purpose — flexibility across hosts/frameworks would triple the maintenance burden for a personal-portfolio-scale project. Do not build a plugin marketplace, a WYSIWYG admin UI, or multi-language i18n in v1 — these are legitimate v2 ideas, not day-one scope.

---

## 4. Architecture Decision

Cloudflare Pages (with the Workers/Functions runtime, not the legacy static-only mode) as the single deployment target, Astro as the framework, D1 for structured content, KV for hot-path config/cache, R2 for media, Cron Triggers for scheduled blog sync, and Queues _only_ if sync volume or contact-form fan-out ever justifies it (it won't, initially — see §7).

Rationale in one line: **Astro + Cloudflare gives static-first HTML with selectively hydrated islands, first-class D1/KV/R2 bindings, and a GitHub Actions deploy story that a solo contributor can maintain without becoming a full-time platform engineer.**

---

## 5. Architecture Diagram

```
                              User (browser)
                                    │
                     Cloudflare DNS + CDN + Cache
                                    │
                    Cloudflare Pages (Astro build output)
                          ┌─────────┴─────────┐
                          │   Static assets    │  ← HTML/CSS/JS, R2-backed images
                          │  (edge-cached)     │
                          └─────────┬─────────┘
                                    │  dynamic routes / API
                         Cloudflare Pages Functions
                              (Workers runtime)
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          │                         │                         │
          ▼                         ▼                         ▼
   Cloudflare D1              Cloudflare KV              Cloudflare R2
   (profile, experience,      (site config cache,        (images, resume PDF,
   projects, blog cache,      theme tokens, rate-limit    OG images, downloadable
   contact submissions)       counters, feature flags)    assets)
          │
          ▼
   Cron Trigger Worker (scheduled, e.g. every 6h)
          │
   ┌──────┴──────┬────────────────┐
   ▼              ▼                ▼
 Medium RSS   External RSS/Atom   Headless CMS (optional)
```

External integrations sitting alongside this: **GitHub** (source + Actions deploy), **Cal.com** (booking, third-party iframe — no data touches your infra), **Cloudflare Turnstile** (contact-form bot protection), **Cloudflare Web Analytics** (privacy-respecting, no cookie banner needed).

### Data flow summaries

- **Initial page load:** DNS → CDN edge cache hit (HTML pre-rendered at build time for most routes) → if miss, Pages Function renders/streams → static assets served from cache/R2.
- **Dynamic content (e.g., "latest 3 blog posts" on homepage):** rendered at build time normally; if truly dynamic, a Pages Function reads from **KV cache** first, falls back to **D1** on cache miss, repopulates KV with a short TTL.
- **Blog retrieval:** reader hits `/blog/[slug]` → statically pre-rendered at build time for published posts (ISR-style rebuild on content change) OR, for freshly-synced posts before the next build, served dynamically from D1 via a Pages Function until the next deploy bakes it in.
- **Blog synchronization:** Cron Trigger Worker fires on schedule → fetches Medium RSS / other feeds → dedupes by canonical URL/GUID → sanitizes HTML → writes normalized rows to D1 → invalidates the relevant KV cache keys.
- **Contact form submission:** browser → Turnstile challenge → Pages Function validates token + input → writes to D1 `contact_submissions` (or forwards to email via a transactional provider) → rate-limited by KV counters per IP/session.
- **Theme configuration:** resolved client-side from `localStorage`/`prefers-color-scheme` for instant paint, with the _default_ theme and accent driven by `site.config.ts` at build time (no flash-of-wrong-theme because the default is baked into the static HTML).
- **Portfolio/project updates:** author edits `site.config.ts` or D1-seeded content → PR → CI validates schema → merge → GitHub Actions rebuilds and redeploys to Cloudflare Pages.
- **CI/CD deployment:** push/PR → GitHub Actions (lint/type-check/test/build) → Wrangler deploy to a **preview** Pages environment → manual/auto promote to **production** on merge to `main`.

---

## 6. Technology Comparison

| Criterion                   | Astro                                                                                            | Next.js                                                                                              | React (CRA/Vite SPA)                              | SvelteKit                                                   | Plain TS/static                         |
| --------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------------- | --------------------------------------- |
| Cloudflare compatibility    | Excellent — official Cloudflare adapter, first-class Pages Functions support                     | Good — `@cloudflare/next-on-pages` works but adds build complexity and has edge-runtime feature gaps | Good but pure SPA loses SSR/SEO benefits          | Excellent — official Cloudflare adapter                     | Excellent, but you hand-roll everything |
| Performance / JS shipped    | Best-in-class — zero JS by default, islands only where needed                                    | Ships a React runtime even for mostly-static pages                                                   | Ships full SPA bundle regardless of interactivity | Very good — small runtime, compiles away framework overhead | Best possible, but no ergonomics        |
| SEO                         | Excellent (static HTML by default)                                                               | Excellent (SSR/SSG)                                                                                  | Weak unless SSR is added                          | Excellent                                                   | Excellent                               |
| Developer experience        | High — content collections, MDX, component islands from any framework (React/Svelte/Vue)         | High, but heavier mental model (RSC, routing conventions)                                            | High for pure UI work, weak for content sites     | High, smaller ecosystem than React                          | Low — no batteries included             |
| Dynamic content support     | Good via Pages Functions/API routes + islands                                                    | Excellent, arguably over-featured for this use case                                                  | Requires you to build your own data layer         | Good via endpoints                                          | Manual                                  |
| Serverless compatibility    | Native (Workers)                                                                                 | Requires an adapter layer; some Next features unsupported on Workers                                 | N/A (client-only) unless paired with a backend    | Native (Workers)                                            | Native                                  |
| Maintainability for forkers | High — content collections + config are easy to reason about                                     | Medium — more moving parts to learn                                                                  | Medium                                            | High                                                        | Low                                     |
| Open-source reuse           | High — this exact pattern (theme folders + content collections) is common in the Astro ecosystem | Medium                                                                                               | Low                                               | High                                                        | Low                                     |
| Deployment complexity       | Low                                                                                              | Medium                                                                                               | Low (but limited)                                 | Low                                                         | Low                                     |

**Selected: Astro**, using the official `@astrojs/cloudflare` adapter in Workers/SSR mode (not `output: static`), so that the same project can pre-render most pages at build time _and_ serve a handful of genuinely dynamic routes (contact API, live "latest post" widget) through Pages Functions without a second framework or a separate backend.

---

## 7. Cloudflare Architecture

| Service                                | Use it?                                  | Why                                                                                                                                                                                                                                                   |
| -------------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Pages**                              | Yes                                      | Primary hosting + CI-integrated deploys + Functions runtime                                                                                                                                                                                           |
| **Workers (via Pages Functions)**      | Yes                                      | Contact API, blog-sync cron handler, cache-aside reads                                                                                                                                                                                                |
| **D1**                                 | Yes                                      | Source of truth for structured content: profile, experience, skills, projects, blog post metadata/body, contact submissions                                                                                                                           |
| **KV**                                 | Yes                                      | Hot config (site.config resolved values), short-TTL blog list cache, rate-limit counters, feature flags                                                                                                                                               |
| **R2**                                 | Yes                                      | Images, resume PDF, OG images, any user-uploaded media if a headless CMS path is used                                                                                                                                                                 |
| **Cache API / edge cache**             | Yes                                      | Default Cloudflare CDN caching for static routes; explicit `Cache-Control` tuning for dynamic API responses                                                                                                                                           |
| **Cron Triggers**                      | Yes                                      | Scheduled blog syndication (e.g. every 6 hours)                                                                                                                                                                                                       |
| **Web Analytics**                      | Yes                                      | Free, privacy-respecting, no cookie banner required — better fit than GA for a portfolio                                                                                                                                                              |
| **Turnstile**                          | Yes                                      | Free bot protection for the contact form, no CAPTCHA UX tax                                                                                                                                                                                           |
| **Cloudflare DNS**                     | Yes, if the domain is Cloudflare-managed | Needed for full stack (Pages custom domain, WAF rules)                                                                                                                                                                                                |
| **WAF (managed rules)**                | Light use                                | A personal portfolio isn't a high-value target, but a free-tier managed ruleset + rate limiting on `/api/contact` is cheap insurance                                                                                                                  |
| **Queues**                             | **Not initially**                        | Blog sync volume (a handful of feeds, checked every few hours) doesn't need a message queue; a single Cron Worker doing fetch→dedupe→write is simpler and easier to debug. Revisit only if you add many feeds/webhooks with retry/backpressure needs. |
| **Durable Objects**                    | **No**                                   | No need for strongly-consistent stateful coordination (no multiplayer/session-critical logic here)                                                                                                                                                    |
| **Images (Cloudflare Images product)** | **Optional, not default**                | R2 + Astro's built-in image optimization at build time covers this project's needs without an extra paid product; revisit only if user-uploaded images at scale become common across forks                                                            |

---

## 8. Data Model (D1)

**Design principle:** D1 holds anything that is _structured, queryable, or written to at runtime_ (blog cache, contact submissions). KV holds anything that is a _small, hot, read-mostly value_ (resolved config, counters). R2 holds _binary media_. Static files/`site.config.ts` in the repo hold anything that is _identity/config the owner edits directly and doesn't need runtime mutation_ (theme choice, social links, base profile) — this keeps a fork usable with **zero database setup** for the common case, and D1 becomes additive for blog sync + contact form only.

### 8.1 Schema (SQLite/D1 dialect)

```sql
-- profile: singleton row, optional — most sites will keep this in site.config.ts instead.
CREATE TABLE profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  full_name TEXT NOT NULL,
  headline TEXT NOT NULL,
  bio TEXT,
  avatar_r2_key TEXT,
  location TEXT,
  email TEXT,
  phone TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE social_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform TEXT NOT NULL,        -- 'linkedin' | 'github' | 'x' | 'medium' ...
  url TEXT NOT NULL,
  display_order INTEGER DEFAULT 0
);

CREATE TABLE experience (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company TEXT NOT NULL,
  role TEXT NOT NULL,
  location TEXT,
  start_date TEXT NOT NULL,      -- ISO 8601, day precision
  end_date TEXT,                 -- NULL = current
  summary TEXT,
  highlights_json TEXT,          -- JSON array of bullet strings
  tags_json TEXT,                -- JSON array
  display_order INTEGER DEFAULT 0
);

CREATE TABLE skills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT,                 -- 'automation' | 'cloud' | 'security' ...
  proficiency INTEGER,           -- 1-5, optional
  display_order INTEGER DEFAULT 0
);

CREATE TABLE projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  repo_url TEXT,
  live_url TEXT,
  cover_image_r2_key TEXT,
  tags_json TEXT,
  featured INTEGER DEFAULT 0,
  display_order INTEGER DEFAULT 0
);

CREATE TABLE certifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  issuer TEXT,
  issue_date TEXT,
  expiry_date TEXT,
  credential_url TEXT
);

CREATE TABLE education (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  institution TEXT NOT NULL,
  degree TEXT,
  start_date TEXT,
  end_date TEXT
);

CREATE TABLE testimonials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  author_name TEXT NOT NULL,
  author_role TEXT,
  quote TEXT NOT NULL,
  display_order INTEGER DEFAULT 0
);

-- blog_posts: the syndication cache. This is the table that matters most for §9.
CREATE TABLE blog_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,             -- 'medium' | 'rss' | 'cms'
  external_id TEXT NOT NULL,        -- GUID from feed, used for dedup
  canonical_url TEXT NOT NULL,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  excerpt TEXT,
  content_html TEXT,                -- sanitized HTML snapshot
  cover_image_r2_key TEXT,
  author_name TEXT,
  tags_json TEXT,
  reading_time_minutes INTEGER,
  status TEXT NOT NULL DEFAULT 'published',  -- 'draft' | 'published' | 'failed'
  published_at TEXT NOT NULL,
  synced_at TEXT DEFAULT (datetime('now')),
  UNIQUE(source, external_id)
);

CREATE TABLE contact_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  turnstile_verified INTEGER DEFAULT 0,
  ip_hash TEXT,                     -- store a hash, never raw IP long-term
  status TEXT DEFAULT 'new',        -- 'new' | 'read' | 'archived' | 'spam'
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE sync_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  status TEXT NOT NULL,             -- 'success' | 'partial' | 'failed'
  items_fetched INTEGER,
  items_upserted INTEGER,
  error_message TEXT,
  run_at TEXT DEFAULT (datetime('now'))
);
```

### 8.2 Indexes

```sql
CREATE INDEX idx_blog_posts_published_at ON blog_posts(published_at DESC);
CREATE INDEX idx_blog_posts_status ON blog_posts(status);
CREATE INDEX idx_projects_featured ON projects(featured);
CREATE INDEX idx_experience_start_date ON experience(start_date DESC);
CREATE INDEX idx_contact_status ON contact_submissions(status);
```

### 8.3 Migration strategy

Use **Wrangler's built-in D1 migrations** (`wrangler d1 migrations create/apply`) — no need for Drizzle/Prisma at this scale, though Drizzle ORM is a reasonable optional add for type-safe queries if the maintainer wants it. Keep migrations as numbered SQL files in `db/migrations/`, applied in CI against a preview D1 database before merge, and against production D1 on deploy to `main`.

### 8.4 Example queries

```sql
-- Homepage: latest 3 published posts
SELECT title, slug, excerpt, published_at, reading_time_minutes
FROM blog_posts WHERE status = 'published'
ORDER BY published_at DESC LIMIT 3;

-- Full experience timeline
SELECT * FROM experience ORDER BY start_date DESC;

-- Dedup check during sync
SELECT id FROM blog_posts WHERE source = ? AND external_id = ?;
```

### 8.5 What goes where

- **D1:** blog post cache, contact submissions, sync logs, and optionally experience/projects/skills if the owner wants runtime editing without a redeploy.
- **KV:** resolved `site.config` (fast reads on every request), a `latest-posts` cache with a 5–15 min TTL, per-IP rate-limit counters for the contact endpoint, feature flags.
- **R2:** all images, the resume PDF, generated OG images.
- **Static files/GitHub:** the _default_ content for a fresh fork (`site.config.ts`, theme files, template choice) — this is what makes "clone → edit config → deploy" possible with no database provisioning required for a minimal viable fork. D1 is opt-in for dynamic blog sync and the contact form.

---

## 9. Blog Syndication Architecture

**Recommendation: cache-in-D1, don't render-on-demand from the external source.** Rendering directly from Medium on every request is slow, fragile (rate limits, layout drift, no control over sanitization) and breaks SEO ownership (you don't control canonical tags on someone else's markup). Storing only in R2 as flat files is workable but loses queryability (tags, status, pagination) that D1 gives you almost for free.

**Flow:**

1. Cron Trigger Worker runs on a schedule (default: every 6 hours; configurable).
2. For each configured source (Medium RSS URL, generic RSS/Atom URL, optional headless CMS webhook/API), fetch the feed.
3. Parse entries; compute a stable `external_id` (feed GUID, or a hash of canonical URL if the feed lacks one).
4. **Dedupe** via the `UNIQUE(source, external_id)` constraint — upsert semantics (`INSERT ... ON CONFLICT DO UPDATE`).
5. **Sanitize** HTML content with a strict allow-list sanitizer (e.g. `sanitize-html` run inside the Worker, or a WASM-compatible equivalent) before storing — never trust raw feed HTML.
6. Compute **reading time** (word count / 200wpm heuristic), extract/derive an **excerpt** if the feed doesn't supply one, and resolve/cache a **featured image** (fetch once, store a copy in R2 so you're not hot-linking third-party CDNs long-term).
7. Set **canonical_url** to the original Medium/source URL by default (protects the original SEO ownership; a config flag can instead set it to your own portfolio URL if you want the portfolio copy to be canonical — document the SEO trade-off either way).
8. On failure: log to `sync_log` with an error message, **do not fail the whole run** for one bad feed — isolate per-source try/catch, and retry with exponential backoff (max 3 attempts) within the same invocation before marking `failed`.
9. Invalidate the relevant KV cache key (`latest-posts`) so the next homepage read picks up fresh data immediately rather than waiting out the TTL.

Rendering: pre-rendered static pages are regenerated on the **next scheduled build** (nightly rebuild via a second, lighter Cron-triggered GitHub Actions workflow, or a `deploy hook` fired by the sync Worker when new posts appear) for maximum performance; until that rebuild happens, a Pages Function serves the post dynamically straight from D1 so new content is never more than a few hours from being live, and never more than one CDN purge away from being static-fast.

---

## 10. Theme/Template Architecture

```
portfolio/
├── src/
│   ├── themes/
│   │   ├── minimal/tokens.css
│   │   ├── modern/tokens.css
│   │   ├── terminal/tokens.css
│   │   └── professional/tokens.css
│   ├── templates/
│   │   ├── developer/
│   │   ├── qa-engineer/
│   │   ├── sdet/
│   │   └── technical-lead/
│   ├── components/           # shared, template-agnostic Astro/React islands
│   ├── content/               # Astro content collections (fallback content, schema)
│   └── pages/
├── config/
│   └── site.config.ts         # THE single file a forker edits first
├── db/migrations/
└── public/
```

Themes are **pure CSS custom-property token sets** (colors, spacing scale, font stack, radii) loaded via a `data-theme` attribute — no component code changes needed to switch themes, matching the existing site's dark/light/system + accent pattern. Templates are **section-order and section-visibility presets** (a QA-engineer template emphasizes automation coverage stats and test-framework tags; a technical-lead template emphasizes team size and org impact) implemented as different `sections: [...]` arrays in `site.config.ts`, rendered by the same shared components — not forked component trees. This avoids the classic "template sprawl" failure mode where every template becomes its own maintenance burden.

`site.config.ts` (schema-validated with Zod at build time) controls: active theme, active template, accent color, typography scale, nav items, which sections are enabled, and all identity content (name, bio, links) for forks that don't want to touch D1 at all. This is how a fork customizes everything **without touching core application code** — the build fails fast with a clear Zod error if the config is malformed, which doubles as free documentation.

---

## 11. CI/CD Architecture

**Branch strategy:** trunk-based on `main`, feature branches + PRs, required status checks before merge, no long-lived `develop` branch (unnecessary overhead for this project size).

**Pipeline:**

```
PR opened
  → Lint (ESLint) + Format check (Prettier)
  → Type check (astro check / tsc)
  → Unit tests (Vitest)
  → Build (astro build, Cloudflare adapter)
  → Accessibility tests (axe via Playwright) against build preview
  → Lighthouse CI (perf/SEO/best-practices budgets)
  → Security scan (npm audit / Dependabot alerts, CodeQL)
  → Deploy to Cloudflare Pages PREVIEW environment (Wrangler)
  → Bot comments PR with preview URL
  → Human review + approval
  → Merge to main
  → Deploy to Cloudflare Pages PRODUCTION
  → Smoke tests (Playwright, prod URL, critical paths only)
  → Deployment notification (GitHub deployment status + optional Slack/Discord webhook)
```

**Secrets/environments:** `CLOUDFLARE_API_TOKEN` (scoped to Pages:Edit + D1:Edit only, never account-wide), `CLOUDFLARE_ACCOUNT_ID`, and any feed/API keys, stored as **GitHub Environment secrets** split between a `preview` and `production` environment so a compromised PR from a fork can't exfiltrate production credentials (PRs from forks never get access to `production`-scoped secrets by default in GitHub Actions — keep it that way, don't override with `pull_request_target` carelessly).

**Rollbacks:** Cloudflare Pages keeps immutable per-deploy URLs; rollback = re-promote a previous deployment via the Cloudflare dashboard or `wrangler pages deployment list` + redeploy — no custom rollback tooling needed.

**Dependency updates:** Dependabot (built into GitHub, zero infra) with weekly cadence for npm and monthly for GitHub Actions versions; group minor/patch updates to reduce PR noise.

---

## 12. Testing Strategy

Given this is explicitly a QA-engineering portfolio, the pipeline itself is a credibility artifact — it should be real, not decorative.

- **Unit testing:** Vitest for utility functions, config schema validation (Zod), sanitization logic, reading-time calculation.
- **API testing:** Playwright's `request` fixture (or a lightweight `undici`-based test) hitting Pages Functions endpoints directly (`/api/contact`, `/api/blog-sync` in dry-run mode) — assert status codes, validation errors, rate-limit behavior.
- **Integration testing:** spin up `wrangler dev` with a local D1/KV binding (Miniflare-backed) in CI; test that the sync Worker correctly dedupes on repeated runs and that the contact endpoint correctly writes to D1.
- **End-to-end (Playwright):** navigation across all anchor sections; responsive breakpoints (mobile/tablet/desktop viewports); theme switching persists across reload; blog list loads and individual post renders; contact form happy-path + validation-error path; simulated API failure (mock 500) renders a graceful error state; mobile-specific tap targets and menu behavior.
- **Accessibility:** `@axe-core/playwright` run against every top-level route as a CI gate (fail build on "serious"/"critical" violations); Lighthouse accessibility score tracked over time.
- **Performance gates (Lighthouse CI):** budgets enforced in CI, e.g. LCP < 2.0s, CLS < 0.05, TBT < 150ms, JS bundle < 100KB gzipped for the homepage, performance score ≥ 95. Fail the build if a PR regresses below budget.

---

## 13. Security

- **Turnstile** on the contact form — invisible/managed challenge, verified server-side in the Pages Function before any D1 write.
- **Rate limiting:** KV-backed counter per IP-hash + Cloudflare's native rate-limiting rules on `/api/*` routes as a second layer.
- **CORS:** API routes restricted to the site's own origin; no wildcard `Access-Control-Allow-Origin` on the contact endpoint.
- **CSP:** strict default-src 'self', explicit allow-list for Cal.com's embed domain and any analytics/font origins; no `unsafe-inline` for scripts — use nonces/hashes for any inline snippet the theme system needs.
- **Security headers:** `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` trimmed to only what's used — set via a `_headers` file (Pages' native mechanism) or a Functions middleware.
- **Input validation:** Zod schemas validate every API payload server-side; never trust client validation alone.
- **XSS:** sanitize all syndicated blog HTML before storage (§9); Astro escapes by default in templates — avoid `set:html` except for the pre-sanitized blog body.
- **CSRF:** low risk for a stateless contact-form POST with Turnstile, but same-site cookies (if any session mechanism is ever added) should default to `SameSite=Strict`.
- **SQL injection:** D1's prepared-statement bindings (`.bind()`) used exclusively — no string-concatenated SQL, ever.
- **Secrets management:** Cloudflare API tokens and any third-party keys live only in GitHub Actions secrets and `wrangler secret put` (never in `wrangler.toml`, never in `.env` committed to the repo). `.env.example` ships with placeholder keys only.
- **Never expose:** Cloudflare API tokens or account ID in frontend JS; D1 database contents beyond what's intentionally queried by public routes; contact submitter emails/messages in any public API response; raw IPs (store hashed); Actions logs must never `echo` a secret (GitHub auto-masks known secret values, but avoid printing tokens regardless).

---

## 14. Performance

**Targets:** LCP < 2.0s (p75, mobile), CLS < 0.05, INP < 200ms, TTFB < 200ms at edge, homepage JS < 100KB gzipped, Lighthouse Performance ≥ 95.

**How the architecture achieves it:** static-first HTML from Astro means most routes need zero server compute per request (served straight from Cloudflare's edge cache); the theme/accent switcher is a tiny inline script, not a framework hydration; Cal.com and the AI-assistant widget are lazy-loaded on interaction (click-to-load), not on initial paint; images are pre-optimized to WebP/AVIF at build time via Astro's image pipeline and served from R2 through the CDN with long `Cache-Control` + content-hashed filenames (already validated as a pattern on the current site); fonts are self-hosted, subsetted, and preloaded with `font-display: swap`; API responses (blog list) are cached in KV with short TTLs so dynamic routes still hit the edge cache almost as often as static ones.

---

## 15. SEO

Sitemap (`sitemap.xml`) and `robots.txt` generated at build time from the route manifest (Astro's official sitemap integration). Canonical URLs set explicitly per page, with syndicated blog posts defaulting to the original source as canonical (§9). JSON-LD for `Person` (profile), `WebSite`, and `Article`/`BlogPosting` per post, generated from the same config/D1 data that drives the visible content — no duplicate hand-maintained metadata.

Example `Person` JSON-LD:

```json
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "Full Name",
  "jobTitle": "Quality Engineering Leader",
  "url": "https://example.pages.dev",
  "sameAs": ["https://www.linkedin.com/in/handle", "https://github.com/handle"]
}
```

Example `BlogPosting` JSON-LD (per post, values from `blog_posts` row): `headline`, `datePublished`, `author`, `image`, `mainEntityOfPage` — all mechanically derived, never hand-written per post.

---

## 16. Observability

- **Cloudflare's built-in Pages/Workers logs** (real-time tail via `wrangler tail`) for ad hoc debugging.
- **Workers Logs / Logpush** (if volume justifies it) for structured, queryable logs — likely unnecessary at personal-portfolio scale; start without it.
- **Error tracking:** a lightweight, free-tier-friendly option (e.g. Sentry's free tier) wired into the Pages Functions for contact-form and sync-worker errors only — not for every static page view.
- **Cloudflare Web Analytics** for real-user traffic/CWV, no cookies, no consent banner needed.
- **Synthetic checks:** a scheduled GitHub Actions job (or a free uptime monitor like UptimeRobot/Better Stack free tier) hitting a `/api/health` endpoint every few minutes.
- **CI/CD monitoring:** GitHub's native deployment status + Actions run history is sufficient; optionally push deploy events to a Slack/Discord webhook.
- **Health endpoint example:** `GET /api/health` returns `{ status: "ok", d1: "ok", kv: "ok", timestamp }` after cheap connectivity checks — used by both synthetic monitoring and post-deploy smoke tests.

---

## 17. Cost Analysis

Verify current numbers against Cloudflare's official pricing page before committing budget, as these figures can change — as of this writing, Cloudflare Pages, Workers (100k requests/day free), D1 (5GB storage / 5M reads free tier), KV, and R2 (10GB storage free) all have generous free tiers well-suited to this project. A personal-portfolio-scale deployment (low thousands of monthly visits, a handful of blog syncs a day, occasional contact submissions) should run **entirely within Cloudflare's free tier**, i.e. effectively $0/month infrastructure cost, with the only external cost being the domain registration itself. Moderate traffic (tens of thousands of monthly visits) is still very likely to stay free given current published limits. High traffic (sustained hundreds of thousands+ requests/month, heavy D1 read volume) is the point at which Workers Paid ($5/mo base + usage) and D1/KV overage costs would start to apply — at that scale, re-verify current tier limits directly on Cloudflare's pricing documentation rather than relying on this document, since limits and pricing are subject to change.

---

## 18. Repository Structure

```
portfolio-platform/
├── .github/
│   ├── workflows/ (ci.yml, blog-sync.yml, dependabot.yml)
│   ├── ISSUE_TEMPLATE/
│   └── pull_request_template.md
├── src/
│   ├── themes/  templates/  components/  content/  pages/  workers/
├── config/site.config.ts
├── db/migrations/
├── tests/ (unit, e2e, a11y)
├── public/
├── wrangler.toml
├── .env.example
├── README.md
├── CONTRIBUTING.md
└── LICENSE
```

**README structure:** what this is → live demo link → 5-minute quickstart (clone/install/config/dev/deploy) → feature list → architecture diagram → configuration reference → contributing link → license.
**License:** MIT (maximizes reuse for a template meant to be forked broadly; the current repo already uses Apache-2.0, which is also acceptable — either is fine, just be explicit and consistent across both repos).
**Versioning:** SemVer with tagged GitHub Releases; a `CHANGELOG.md` maintained via Conventional Commits + an automated release-notes action.

---

## 19. Implementation Examples

**`.env.example`:**

```
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_API_TOKEN=
TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
MEDIUM_RSS_URL=https://medium.com/feed/@yourhandle
```

**`wrangler.toml` (excerpt):**

```toml
name = "portfolio"
compatibility_date = "2026-09-01"
pages_build_output_dir = "dist"

[[d1_databases]]
binding = "DB"
database_name = "portfolio-db"
database_id = "REPLACE_ME"

[[kv_namespaces]]
binding = "CACHE"
id = "REPLACE_ME"

[[r2_buckets]]
binding = "MEDIA"
bucket_name = "portfolio-media"

[triggers]
crons = ["0 */6 * * *"]
```

**Blog-sync Worker (core logic, simplified):**

```ts
export default {
  async scheduled(event: ScheduledEvent, env: Env) {
    const sources = [{ type: 'medium', url: env.MEDIUM_RSS_URL }];
    for (const src of sources) {
      try {
        const res = await fetch(src.url);
        const xml = await res.text();
        const items = parseFeed(xml); // GUID, title, link, pubDate, content
        let upserted = 0;
        for (const item of items) {
          const sanitized = sanitizeHtml(item.content);
          await env.DB.prepare(
            `INSERT INTO blog_posts (source, external_id, canonical_url, title, slug, content_html, published_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(source, external_id) DO UPDATE SET
               content_html = excluded.content_html, synced_at = datetime('now')`
          )
            .bind(
              src.type,
              item.guid,
              item.link,
              item.title,
              slugify(item.title),
              sanitized,
              item.pubDate
            )
            .run();
          upserted++;
        }
        await env.CACHE.delete('latest-posts');
        await env.DB.prepare(
          `INSERT INTO sync_log (source, status, items_fetched, items_upserted) VALUES (?, 'success', ?, ?)`
        )
          .bind(src.type, items.length, upserted)
          .run();
      } catch (err) {
        await env.DB.prepare(
          `INSERT INTO sync_log (source, status, error_message) VALUES (?, 'failed', ?)`
        )
          .bind(src.type, String(err))
          .run();
      }
    }
  },
};
```

**Health-check endpoint (`src/pages/api/health.ts`):**

```ts
export async function GET({ locals }) {
  const { DB, CACHE } = locals.runtime.env;
  try {
    await DB.prepare('SELECT 1').first();
    await CACHE.get('healthcheck-probe');
    return new Response(JSON.stringify({ status: 'ok', timestamp: Date.now() }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ status: 'degraded' }), { status: 503 });
  }
}
```

**Playwright a11y test:**

```ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('homepage has no serious a11y violations', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter((v) =>
    ['serious', 'critical'].includes(v.impact ?? '')
  );
  expect(serious).toEqual([]);
});
```

**Lighthouse CI config (`lighthouserc.json`):**

```json
{
  "ci": {
    "collect": { "url": ["http://localhost:4321/"], "numberOfRuns": 3 },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.95 }],
        "categories:accessibility": ["error", { "minScore": 0.95 }]
      }
    }
  }
}
```

---

## 20. Phased Implementation Roadmap

| Phase                      | Objective                                                         | Key deliverables                            | Complexity  |
| -------------------------- | ----------------------------------------------------------------- | ------------------------------------------- | ----------- |
| 0 — Audit & architecture   | This document + confirm canonical source repo                     | Blueprint, repo consolidation decision      | Low         |
| 1 — Repo & foundation      | Scaffold Astro + Cloudflare adapter, `site.config.ts`, Zod schema | Buildable skeleton, `wrangler dev` working  | Low         |
| 2 — Frontend redesign      | Port existing visual design into componentized Astro sections     | All current sections rendering from config  | Medium      |
| 3 — Theme/template engine  | `themes/` + `templates/` folders, token-driven switcher           | 4 themes, 4 templates functional            | Medium      |
| 4 — Cloudflare backend     | D1 schema + migrations, KV cache-aside, R2 media pipeline         | Contact form persists to D1; images from R2 | Medium      |
| 5 — Blog syndication       | Cron Worker, Medium/RSS sync, dedupe/sanitize                     | Automated sync with sync_log visibility     | Medium-High |
| 6 — Testing                | Vitest, Playwright e2e, axe, Lighthouse CI                        | Green CI on all suites                      | Medium      |
| 7 — CI/CD                  | GitHub Actions preview/prod pipeline                              | PR previews + gated prod deploys            | Medium      |
| 8 — Security & performance | Turnstile, CSP/headers, rate limiting, perf budgets               | Security headers verified, CWV targets met  | Medium      |
| 9 — Production deployment  | Cutover from current site, DNS, monitoring                        | Live on custom domain, health checks green  | Low-Medium  |
| 10 — Open-source release   | README, CONTRIBUTING, issue/PR templates, v1.0.0 tag              | Public template usable by third parties     | Low         |

Dependencies run top-to-bottom; Phase 3 can run in parallel with Phase 4; Phase 6 (testing) should start incrementally from Phase 1 onward rather than being bolted on at the end, despite being listed as its own phase for milestone clarity.

---

## 21. Definition of Done

A phase (and the project overall) is done when: CI is fully green (lint, types, unit, e2e, a11y, Lighthouse budgets); a fresh `git clone` → `npm install` → edit `config/site.config.ts` → `npm run dev` produces a working personalized site with **no D1/KV/R2 provisioning required** for the static-only path; the documented `npm run build && wrangler pages deploy` path succeeds against a clean Cloudflare account; and the contact form + blog sync work end-to-end against provisioned D1/KV/R2 in a preview environment.

---

## 22. Risks and Mitigations

| Risk                                                                                                   | Mitigation                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Medium/RSS feed structure changes or rate-limits the sync Worker                                       | Isolate per-source failures in `sync_log`; alert (not silently fail); cache last-known-good content so a feed outage doesn't blank the blog |
| Astro/Cloudflare adapter has an edge-runtime API gap                                                   | Pin adapter version in CI, keep a fallback `output: static` build path as a documented escape hatch                                         |
| Forkers misconfigure Cloudflare bindings and hit confusing errors                                      | Zod-validated config with clear error messages; a `npm run doctor` script that checks required bindings before build                        |
| Contact form becomes a spam vector                                                                     | Turnstile + KV rate limiting + `status = 'spam'` triage field from day one                                                                  |
| Two divergent GitHub repos (`sudiptad1978.github.io` vs. the actual Pages source) confuse contributors | Consolidate to a single canonical repo before the open-source release (Phase 10 blocker)                                                    |

---

## 23. Final Recommended Architecture

1. **Stack:** Astro (Workers/SSR adapter) + TypeScript + Zod-validated config.
2. **Cloudflare services:** Pages, Pages Functions (Workers runtime), D1, KV, R2, Cron Triggers, Web Analytics, Turnstile, Cloudflare-managed DNS/WAF basics.
3. **Avoid initially:** Queues, Durable Objects, Cloudflare Images product, any headless-CMS dependency (keep it optional/pluggable, not required).
4. **Repository structure:** single canonical monorepo per §18, `themes/` + `templates/` + `config/site.config.ts` as the customization surface.
5. **Data architecture:** static config for identity by default; D1 for blog cache + contact submissions; KV for hot cache/config/rate-limits; R2 for media (§8.5).
6. **Blog architecture:** Cron-triggered sync into D1, sanitize + dedupe + canonical-URL-preserving, static rebuild on a schedule with dynamic D1 fallback in between (§9).
7. **CI/CD:** GitHub Actions, lint/type/test/build → preview deploy → gated prod deploy → smoke tests (§11).
8. **Testing:** Vitest + Playwright (e2e + a11y via axe) + Lighthouse CI budgets as hard gates (§12).
9. **Security:** Turnstile + KV rate limiting + strict CSP/headers + Zod input validation + prepared statements only (§13).
10. **Performance:** static-first rendering, lazy-loaded third-party widgets, image/font optimization, KV cache-aside for dynamic reads, targets in §14.
11. **Open-source strategy:** MIT or Apache-2.0 (pick one, apply consistently), SemVer releases, `.env.example`-driven onboarding, zero-DB-required minimal fork path.
12. **Estimated implementation effort:** a focused solo engineer, working incrementally, should reach a production-ready v1.0.0 in roughly **6–10 working days** of effort spread across the phases above (Phases 1–4 are the bulk of the work; 5–10 are comparatively fast once the foundation exists) — treat this as a rough planning estimate, not a commitment.
