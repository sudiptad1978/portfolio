import { test, expect } from '@playwright/test';

/**
 * Contact API contract tests (Playwright request fixture — architecture §12).
 * Local/CI environment: no TURNSTILE_SECRET_KEY configured → dev-mode acceptance
 * with turnstile_verified = 0. Production runs these via tests/smoke instead.
 */
const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:8788';

test.describe('POST /api/contact', () => {
  test('accepts a valid submission', async ({ request }) => {
    const response = await request.post('/api/contact', {
      data: {
        name: 'Playwright E2E',
        email: 'e2e@example.com',
        message: 'Hello from the end-to-end suite — verifying the happy path.',
      },
    });
    expect(response.status()).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true });
  });

  test('rejects invalid payloads with 400 and details', async ({ request }) => {
    const response = await request.post('/api/contact', {
      data: { name: 'x', email: 'not-an-email', message: 'short' },
    });
    expect(response.status()).toBe(400);
    const payload = (await response.json()) as { error?: string; issues?: unknown[] };
    expect(payload.error).toBeTruthy();
    expect(payload.issues?.length).toBeGreaterThan(0);
  });

  test('blocks cross-site form-style posts (Astro CSRF protection)', async ({ request }) => {
    // text/plain without a same-origin Origin header — Astro's checkOrigin
    // rejects foreign form-style submissions before our handler runs.
    const response = await request.post('/api/contact', {
      headers: { 'Content-Type': 'text/plain' },
      data: 'name=x',
    });
    expect(response.status()).toBe(403);
  });

  test('rejects unsupported content types from same-origin requests', async ({ request }) => {
    const response = await request.post('/api/contact', {
      headers: { 'Content-Type': 'text/plain', Origin: BASE },
      data: 'name=x',
    });
    expect(response.status()).toBe(415);
  });
});
