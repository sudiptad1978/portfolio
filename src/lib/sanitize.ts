/**
 * Strict allow-list HTML sanitizer for syndicated feed content.
 * Runs inside the Worker (no Node/DOM dependencies — WASM/edge compatible).
 *
 * Design: remove dangerous subtrees first (script/style/iframe/…), then
 * rebuild every remaining tag, keeping only allowed tags and a minimal,
 * validated attribute set. Anything unrecognized is dropped, keeping the
 * inner text.
 *
 * NOTE: For high-volume, fully untrusted feeds consider swapping this for a
 * battle-tested sanitizer library that runs on Workers — this implementation
 * is deliberately simple and unit-tested, but regex-based sanitizers are
 * inherently best-effort.
 */
const BLOCKED_SUBTREES =
  /<(script|style|iframe|object|embed|svg|math|template|form|link|meta|noscript|frameset)\b[\s\S]*?<\/\1\s*>/gi;

const ALLOWED_TAGS = new Set([
  'p',
  'a',
  'ul',
  'ol',
  'li',
  'em',
  'strong',
  'b',
  'i',
  'code',
  'pre',
  'h2',
  'h3',
  'h4',
  'blockquote',
  'br',
  'hr',
  'figure',
  'figcaption',
  'img',
]);

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&#x27;': "'",
  '&nbsp;': ' ',
};

export function decodeEntities(input: string): string {
  return input.replace(/&(amp|lt|gt|quot|#39|#x27|nbsp);/g, (m) => ENTITIES[m] ?? m);
}

function safeHref(value: string): string | null {
  const href = decodeEntities(value.trim());
  if (/^(https?:|mailto:)/i.test(href)) return href;
  return null;
}

function safeSrc(value: string): string | null {
  const src = decodeEntities(value.trim());
  return /^https:\/\//i.test(src) ? src : null; // https only — no http/data/srcset tricks
}

export function sanitizeHtml(input: string): string {
  let html = input;

  // 1. Drop comments and blocked subtrees entirely.
  html = html.replace(/<!--[\s\S]*?-->/g, '');
  html = html.replace(BLOCKED_SUBTREES, '');
  // Self-closing / unclosed variants of blocked elements.
  html = html.replace(
    /<(script|style|iframe|object|embed|svg|math|template|form|link|meta|noscript|frameset)\b[^>]*\/?>/gi,
    ''
  );

  // 2. Rebuild every remaining tag with a strict allow-list.
  html = html.replace(
    /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[^>]*)?)\/?>/g,
    (_m, slash, rawTag, rawAttrs) => {
      const tag = String(rawTag).toLowerCase();
      if (!ALLOWED_TAGS.has(tag)) return ''; // drop disallowed markup, keep text flow
      if (slash) return `</${tag}>`;

      const attrs = String(rawAttrs);
      switch (tag) {
        case 'a': {
          const href = attrs.match(/href\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i);
          const url = href ? safeHref(href[2] ?? href[3] ?? href[4] ?? '') : null;
          return url ? `<a href="${url}" rel="noopener noreferrer" target="_blank">` : '<a>';
        }
        case 'img': {
          const src = attrs.match(/src\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i);
          const alt = attrs.match(/alt\s*=\s*("([^"]*)"|'([^']*)')/i);
          const url = src ? safeSrc(src[2] ?? src[3] ?? src[4] ?? '') : null;
          if (!url) return '';
          const altText = alt ? (alt[2] ?? alt[3] ?? '') : '';
          return `<img src="${url}" alt="${altText}" loading="lazy" decoding="async">`;
        }
        default:
          return `<${tag}>`; // all attributes stripped on other allowed tags
      }
    }
  );

  // 3. Neutralize any stray angle brackets that survived.
  html = html.replace(
    /<(?!\/?(?:p|a|ul|ol|li|em|strong|b|i|code|pre|h2|h3|h4|blockquote|br|hr|figure|figcaption|img)\b)[a-zA-Z/]/g,
    '&lt;'
  );

  return html;
}

/** Plain text from HTML — for excerpts and reading-time calculation. */
export function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}
