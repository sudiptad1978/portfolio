import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Accessibility gate (architecture §12): fail the build on serious/critical
 * axe violations across every top-level route.
 */
const routes = ['/', '/blog'];

for (const route of routes) {
  test(`no serious or critical a11y violations on ${route}`, async ({ page }) => {
    await page.goto(route);

    const results = await new AxeBuilder({ page }).analyze();

    const serious = results.violations.filter((violation) =>
      ['serious', 'critical'].includes(violation.impact ?? '')
    );

    if (serious.length > 0) {
      console.error(
        JSON.stringify(
          serious.map((violation) => ({
            id: violation.id,
            impact: violation.impact,
            nodes: violation.nodes.length,
            help: violation.helpUrl,
          })),
          null,
          2
        )
      );
    }

    expect(serious).toEqual([]);
  });
}
