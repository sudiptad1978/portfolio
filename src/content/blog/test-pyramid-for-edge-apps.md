---
title: 'A Pragmatic Test Pyramid for Cloudflare Workers and Edge Apps'
description: 'The classic test pyramid assumes a monolith. Here is the layering I use for edge applications — unit, binding-level integration with Miniflare, and a thin end-to-end layer.'
pubDate: 2026-07-02
tags: ['cloudflare', 'testing', 'architecture']
canonicalUrl: 'https://medium.com/@your-handle/pragmatic-test-pyramid-edge-apps'
---

The classic test pyramid — many unit tests, fewer integration tests, a thin end-to-end layer — was drawn for monoliths with a database in the basement. Edge applications on Cloudflare Workers break several of its assumptions: your compute is ephemeral, your "database" is a binding (D1, KV, R2), and your runtime is V8 isolates, not a Node process.

Here is the layering I use instead:

**1. Unit (fast, no I/O).** Pure functions: slug generation, feed parsing, sanitization, validation schemas. These run in milliseconds under Vitest and catch the majority of logic bugs. If code needs a mock to be unit-testable, that's a design smell — extract the pure core.

**2. Binding-level integration (Miniflare).** The interesting edge bugs live between your code and its bindings: a D1 query that behaves differently in SQLite-at-the-edge, a KV TTL nuance, a migration that was never applied. `wrangler pages dev` gives you the real runtime locally — use it. Test the actual handler, against actual bindings.

**3. End-to-end (thin, critical paths only).** Playwright against the deployed-shaped local preview: does the homepage render, does the contact form persist, does a dynamic blog route fall back correctly? E2E is the most expensive layer; spend it where failure is existential, not where unit tests already prove the logic.

```ts
// Binding-level integration test — the shape that finds real bugs
const response = await fetch(
  new Request('http://local/api/contact', {
    method: 'POST',
    body: JSON.stringify({ name: 'E2E', email: 'a@b.co', message: 'hello world' }),
  })
);
const row = await env.DB.prepare('SELECT * FROM contact_submissions').first();
expect(row.email).toBe('a@b.co');
```

The ratio shifts, but the principle doesn't: push assertions as far down the stack as they remain meaningful, and reserve the top of the pyramid for proving journeys — not logic.
