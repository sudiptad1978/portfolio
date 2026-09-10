/** Plain-text excerpt derived from (possibly HTML) content. */
export function excerptFrom(html: string, maxLength = 180): string {
  const text = html
    .replace(/<[^>]+>/g, ' ')
    .replace(
      /&(amp|lt|gt|quot|#39|#x27|nbsp);/g,
      (m) =>
        ({
          '&amp;': '&',
          '&lt;': '<',
          '&gt;': '>',
          '&quot;': '"',
          '&#39;': "'",
          '&#x27;': "'",
          '&nbsp;': ' ',
        })[m] ?? m
    )
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).replace(/\s+\S*$/, '')}…`;
}
