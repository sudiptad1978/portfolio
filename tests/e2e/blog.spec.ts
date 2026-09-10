import { test, expect } from '@playwright/test';

test.describe('blog', () => {
  test('index lists published posts', async ({ page }) => {
    await page.goto('/blog');
    await expect(page.getByRole('heading', { name: 'All posts' })).toBeVisible();
    const count = await page.locator('.post-item').count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('post page renders title and body', async ({ page }) => {
    await page.goto('/blog');
    await page.locator('.post-item').first().click();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('.article-body')).toContainText(/\w/);
    await expect(page.locator('.post-meta')).toContainText(/min read/);
  });

  test('unknown slug shows the 404 page', async ({ page }) => {
    await page.goto('/blog/this-post-does-not-exist/');
    await expect(page.locator('main')).toContainText('404');
  });
});
