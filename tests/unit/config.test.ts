import { describe, expect, it } from 'vitest';
import { siteConfig, siteConfigSchema } from '../../config/site.config';

describe('site.config', () => {
  it('ships a valid, parseable config', () => {
    expect(siteConfig.name).toBeTruthy();
    expect(siteConfig.role).toBeTruthy();
    expect(siteConfig.email).toMatch(/@/);
    expect(siteConfig.capabilities.length).toBeGreaterThan(0);
  });

  it('applies documented defaults', () => {
    expect(siteConfig.blog.canonicalToSource).toBe(true);
    expect(siteConfig.seo.ogImage).toBe('/og/default.png');
    expect(siteConfig.snapshot).toBeDefined();
  });

  it('fails fast on malformed config (blueprint §10: Zod build-time validation)', () => {
    expect(() => siteConfigSchema.parse({ name: 'x' })).toThrow();
  });

  it('rejects an invalid accent color', () => {
    expect(() => siteConfigSchema.parse({ ...minimalValidConfig(), accent: 'orange' })).toThrow();
  });

  it('rejects unknown section ids', () => {
    expect(() => siteConfigSchema.parse({ ...minimalValidConfig(), sections: ['nope'] })).toThrow();
  });
});

function minimalValidConfig() {
  return {
    name: 'Test Person',
    role: 'QA',
    headline: 'Testing',
    bio: 'I test things.',
    email: 'test@example.com',
    url: 'https://example.com',
    pov: { title: 'T', body: ['b'] },
    capabilities: [{ title: 'C', description: 'D' }],
    stack: [{ group: 'G', items: ['x'] }],
  };
}
