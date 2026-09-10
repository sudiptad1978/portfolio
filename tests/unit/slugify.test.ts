import { describe, expect, it } from 'vitest';
import { slugify } from '../../src/lib/slugify';

describe('slugify', () => {
  it('produces stable kebab-case slugs', () => {
    expect(slugify('Shift-Left Testing! (2026)')).toBe('shift-left-testing-2026');
    expect(slugify('A Pragmatic Test Pyramid for Workers')).toBe(
      'a-pragmatic-test-pyramid-for-workers'
    );
  });

  it('strips diacritics', () => {
    expect(slugify('Café Quality')).toBe('cafe-quality');
  });

  it('handles punctuation-only input gracefully', () => {
    expect(slugify('???')).toBe('');
    expect(slugify('   ')).toBe('');
  });

  it('truncates very long titles', () => {
    const result = slugify('a'.repeat(200));
    expect(result.length).toBeLessThanOrEqual(80);
  });
});
