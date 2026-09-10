import { test, expect } from '@playwright/test';

/**
 * Post-deploy smoke tests — run against production with:
 *   E2E_BASE_URL=https://your-domain.com npx playwright test tests/smoke
 * Critical paths only (architecture §11).
 */
test.describe('production smoke', () => {
  test('homepage responds and renders identity', async ({ request }) => {
    const response = await request.get('/');
    expect(response.ok()).toBeTruthy();
    const html = await response.text();
    expect(html).toContain('Sudipta Dutta');
  });

  test('health endpoint reports a healthy status', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.ok()).toBeTruthy();
    const payload = (await response.json()) as { status: string; checks: Record<string, string> };
    expect(payload.status).toBe('ok');
  });

  test('blog and sitemap respond', async ({ request }) => {
    expect((await request.get('/blog')).ok()).toBeTruthy();

    const sitemap = await request.get('/sitemap.xml');
    expect(sitemap.ok()).toBeTruthy();
    expect(await sitemap.text()).toContain('<urlset');
  });

  test('security headers are present', async ({ request }) => {
    const response = await request.get('/');
    const csp = response.headers()['content-security-policy'];
    expect(csp).toBeTruthy();
    expect(csp).toContain("default-src 'self'");
    expect(response.headers()['x-content-type-options']).toBe('nosniff');
  });
});
