import { test, expect } from '@playwright/test';

test.describe('homepage', () => {
  test('renders identity and primary sections', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Sudipta Dutta/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // Sections dictated by the active template (qa-engineer preset)
    for (const id of [
      'pov',
      'capabilities',
      'stack',
      'projects',
      'experience',
      'blog',
      'contact',
    ]) {
      await expect(page.locator(`#${id}`)).toBeVisible();
    }
  });

  test('has a working skip-to-content link', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => document.activeElement?.className);
    expect(focused).toContain('skip-link');
  });

  test('theme preference persists across reloads', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('mode', 'dark'));
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-mode', 'dark');

    await page.evaluate(() => localStorage.setItem('mode', 'light'));
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-mode', 'light');
  });

  test('theme toggle cycles modes', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('mode', 'light'));
    await page.reload();
    await page.locator('#theme-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-mode', 'dark');
  });

  test('nav links scroll to their sections', async ({ page }) => {
    await page.goto('/');
    await page.locator('.nav-links a[href="#contact"]').click();
    await expect(page.locator('#contact')).toBeInViewport({ ratio: 0.1 });
  });
});
