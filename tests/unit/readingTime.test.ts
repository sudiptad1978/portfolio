import { describe, expect, it } from 'vitest';
import { readingTimeMinutes } from '../../src/lib/readingTime';

describe('readingTimeMinutes', () => {
  it('returns at least one minute', () => {
    expect(readingTimeMinutes('short text')).toBe(1);
    expect(readingTimeMinutes('')).toBe(1);
  });

  it('ignores HTML markup when counting words', () => {
    const html = '<p>' + 'word '.repeat(100) + '</p>';
    expect(readingTimeMinutes(html)).toBe(1); // 100 words / 200wpm
  });

  it('computes multi-minute reads at ~200wpm', () => {
    expect(readingTimeMinutes('word '.repeat(450))).toBe(2); // ~225 → 2 (rounded)
    expect(readingTimeMinutes('word '.repeat(800))).toBe(4);
  });
});
