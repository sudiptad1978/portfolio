/**
 * WCAG-aware accent helpers.
 * A configurable accent (site.config.ts) needs a contrast color that adapts —
 * dark text on light accents, white text on dark accents.
 */
function channelToLinear(channel: number): number {
  return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

/** WCAG 2.x relative luminance of a #rrggbb hex color. */
export function relativeLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return 0.2126 * channelToLinear(r) + 0.7152 * channelToLinear(g) + 0.0722 * channelToLinear(b);
}

/** Pick black-ish or white-ish text for a given accent background (4.5:1 target). */
export function accentContrastColor(hex: string): string {
  return relativeLuminance(hex) > 0.32 ? '#0c0a09' : '#ffffff';
}
