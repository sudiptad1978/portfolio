/**
 * Blog data access — the D1/KV cache-aside layer from the architecture doc:
 *
 *   KV (short TTL) → D1 (synced posts) → Astro content collection (fallback)
 *
 * The content-collection fallback keeps every fork working with ZERO database
 * provisioning; D1 is additive for cron-synced syndication.
 */
import { getCollection, getEntry, type CollectionEntry } from 'astro:content';
import { readingTimeMinutes } from './readingTime';

export interface PostSummary {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string; // ISO 8601
  readingTimeMinutes: number;
  canonicalUrl: string | null;
  tags: string[];
}

export interface D1Post extends PostSummary {
  contentHtml: string; // pre-sanitized at sync time (src/lib/sanitize.ts)
  coverImage: string | null;
}

interface D1Row {
  slug: string;
  title: string;
  excerpt: string | null;
  content_html: string;
  canonical_url: string;
  cover_image: string | null;
  tags_json: string | null;
  reading_time_minutes: number | null;
  published_at: string;
}

function fromD1Row(row: D1Row): D1Post {
  return {
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt ?? '',
    publishedAt: row.published_at,
    readingTimeMinutes: row.reading_time_minutes ?? readingTimeMinutes(row.content_html),
    canonicalUrl: row.canonical_url,
    tags: row.tags_json ? safeParseTags(row.tags_json) : [],
    contentHtml: row.content_html,
    coverImage: row.cover_image,
  };
}

function safeParseTags(json: string): string[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === 'string') : [];
  } catch {
    return [];
  }
}

function fromEntry(entry: CollectionEntry<'blog'>): PostSummary {
  const { title, description, pubDate, tags, canonicalUrl } = entry.data;
  return {
    slug: entry.id.replace(/\.md$/, ''),
    title,
    excerpt: description,
    publishedAt: pubDate.toISOString(),
    readingTimeMinutes: readingTimeMinutes(entry.body ?? ''),
    canonicalUrl: canonicalUrl ?? null,
    tags,
  };
}

/* ── Cache-aside list (KV → D1 → collection) ──────────────────────────────── */

export async function getLatestPosts(env: Env | undefined, limit = 3): Promise<PostSummary[]> {
  const cacheKey = `latest-posts:${limit}`;

  if (env?.CACHE) {
    try {
      const cached = await env.CACHE.get<PostSummary[]>(cacheKey, 'json');
      if (cached && Array.isArray(cached) && cached.length > 0) return cached;
    } catch {
      /* cache read is always best-effort */
    }
  }

  if (env?.DB) {
    try {
      const { results } = await env.DB.prepare(
        `SELECT slug, title, excerpt, canonical_url, tags_json, reading_time_minutes, published_at
         FROM blog_posts WHERE status = 'published'
         ORDER BY published_at DESC LIMIT ?`
      )
        .bind(limit)
        .all<D1Row>();

      // Merge synced posts with the static collection (D1 wins on slug
      // collision) so the live list is the union of both sources.
      const merged = new Map<string, PostSummary>();
      for (const entry of await getCollection('blog', ({ data }) => !data.draft)) {
        const summary = fromEntry(entry);
        merged.set(summary.slug, summary);
      }
      for (const row of results ?? []) {
        const post = fromD1Row(row);
        merged.set(post.slug, post);
      }

      const posts = [...merged.values()]
        .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
        .slice(0, limit);

      if (env.CACHE) {
        try {
          await env.CACHE.put(cacheKey, JSON.stringify(posts), { expirationTtl: 900 });
        } catch {
          /* best-effort */
        }
      }
      return posts;
    } catch {
      /* fall through to the static collection */
    }
  }

  const entries = await getCollection('blog', ({ data }) => !data.draft);
  return entries
    .map(fromEntry)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, limit);
}

/* ── Single post (D1 first — freshly synced posts appear without a rebuild) ── */

export type PostResult =
  | { source: 'd1'; post: D1Post }
  | { source: 'collection'; entry: CollectionEntry<'blog'>; summary: PostSummary }
  | null;

export async function getPostBySlug(env: Env | undefined, slug: string): Promise<PostResult> {
  if (env?.DB) {
    try {
      const row = await env.DB.prepare(
        `SELECT slug, title, excerpt, content_html, canonical_url, cover_image, tags_json,
                reading_time_minutes, published_at
         FROM blog_posts WHERE slug = ? AND status = 'published'`
      )
        .bind(slug)
        .first<D1Row>();
      if (row) return { source: 'd1', post: fromD1Row(row) };
    } catch {
      /* fall through to the collection */
    }
  }

  const entry = await getEntry('blog', slug);
  if (entry && !entry.data.draft) {
    return { source: 'collection', entry, summary: fromEntry(entry) };
  }
  return null;
}

/** All known slugs for the sitemap (D1 synced + static collection, deduped). */
export async function getAllPostSlugs(env: Env | undefined): Promise<string[]> {
  const slugs = new Set<string>();

  if (env?.DB) {
    try {
      const { results } = await env.DB.prepare(
        `SELECT slug FROM blog_posts WHERE status = 'published'`
      ).all<{ slug: string }>();
      for (const row of results ?? []) slugs.add(row.slug);
    } catch {
      /* best-effort */
    }
  }

  const entries = await getCollection('blog', ({ data }) => !data.draft);
  for (const entry of entries) slugs.add(entry.id.replace(/\.md$/, ''));

  return [...slugs];
}
