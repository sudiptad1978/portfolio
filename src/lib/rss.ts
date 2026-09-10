/**
 * Minimal, dependency-free RSS 2.0 / Atom parser for the blog-sync Worker.
 * Feeds are trusted only as far as this parser + the sanitizer allow:
 * every field is treated as untrusted input.
 */
import { decodeEntities } from './sanitize';

export interface FeedItem {
  guid: string;
  title: string;
  link: string;
  publishedAt: string; // ISO 8601
  contentHtml: string;
}

function pickTag(block: string, tag: string): string | null {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}\\s*>`, 'i');
  const m = block.match(re);
  return m ? m[1].trim() : null;
}

function unxml(value: string): string {
  // CDATA-wrapped values are common in Medium feeds
  const cdata = value.match(/^<!\[CDATA\[([\s\S]*)\]\]>$/);
  return decodeEntities((cdata ? cdata[1] : value).trim());
}

function toIso(dateLike: string | null): string {
  if (!dateLike) return new Date().toISOString();
  const date = new Date(unxml(dateLike));
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

/** Extract the first <img src="https://…"> from an HTML blob (feed cover images). */
export function firstImage(html: string): string | null {
  const m = html.match(/<img[^>]+src\s*=\s*("([^"]*)"|'([^']*)')/i);
  const src = m ? (m[2] ?? m[3] ?? '') : '';
  return /^https:\/\//i.test(src) ? src : null;
}

export function parseFeed(xml: string): FeedItem[] {
  const feed = xml.replace(/^\uFEFF/, '');
  const items: FeedItem[] = [];

  // RSS 2.0
  const rssItems = feed.match(/<item[\s>][\s\S]*?<\/item\s*>/gi) ?? [];
  for (const raw of rssItems) {
    const link = unxml(pickTag(raw, 'link') ?? '');
    const guid = unxml(pickTag(raw, 'guid') ?? link);
    const content = pickTag(raw, 'content:encoded') ?? pickTag(raw, 'description') ?? '';
    if (!guid && !link) continue;
    items.push({
      guid: guid || link,
      title: unxml(pickTag(raw, 'title') ?? 'Untitled'),
      link,
      publishedAt: toIso(pickTag(raw, 'pubDate')),
      contentHtml: unxml(content),
    });
  }
  if (items.length > 0) return items;

  // Atom
  const atomEntries = feed.match(/<entry[\s>][\s\S]*?<\/entry\s*>/gi) ?? [];
  for (const raw of atomEntries) {
    const hrefMatch = raw.match(/<link[^>]*href\s*=\s*("([^"]*)"|'([^']*)')/i);
    const link = hrefMatch ? decodeEntities(hrefMatch[2] ?? hrefMatch[3] ?? '') : '';
    const guid = unxml(pickTag(raw, 'id') ?? link);
    const content = pickTag(raw, 'content') ?? pickTag(raw, 'summary') ?? '';
    if (!guid && !link) continue;
    items.push({
      guid: guid || link,
      title: unxml(pickTag(raw, 'title') ?? 'Untitled'),
      link,
      publishedAt: toIso(pickTag(raw, 'published') ?? pickTag(raw, 'updated')),
      contentHtml: unxml(content),
    });
  }

  return items;
}
