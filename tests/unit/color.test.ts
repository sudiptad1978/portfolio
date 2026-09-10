import { describe, expect, it } from 'vitest';
import { relativeLuminance, accentContrastColor } from '../../src/lib/color';

describe('accent contrast helpers', () => {
  it('computes relative luminance sanely', () => {
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 5);
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5);
  });

  it('picks dark text for light accents (e.g. orange #f97316)', () => {
    expect(accentContrastColor('#f97316')).toBe('#0c0a09');
    expect(accentContrastColor('#4ade80')).toBe('#0c0a09');
  });

  it('picks white text for dark accents (e.g. blue #1d4ed8)', () => {
    expect(accentContrastColor('#1d4ed8')).toBe('#ffffff');
    expect(accentContrastColor('#111827')).toBe('#ffffff');
  });
});
