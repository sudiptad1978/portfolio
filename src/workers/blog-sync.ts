/**
 * Blog syndication cron Worker (architecture §9).
 *
 * Deployed separately from Pages (Pages Functions cannot host Cron Triggers):
 *   npm run deploy:sync-worker          (workers/wrangler.toml, every 6h)
 *
 * Flow per source: fetch (retry ×3, backoff) → parse RSS/Atom → dedupe by
 * (source, external_id) via upsert → sanitize HTML (strict allow-list) →
 * derive slug/excerpt/reading-time/cover → write to D1 → invalidate KV.
 * Per-source failures are isolated in sync_log — one bad feed never fails
 * the whole run.
 */
import { parseFeed, firstImage } from '../lib/rss';
import { sanitizeHtml } from '../lib/sanitize';
import { excerptFrom } from '../lib/excerpt';
import { slugify } from '../lib/slugify';
import { readingTimeMinutes } from '../lib/readingTime';

interface SyncSource {
  type: string;
  url: string;
}

interface ScheduledController {
  cron: string;
  scheduledTime: number;
}

interface ExecutionContextLike {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

/** Cache keys invalidated after every run (see src/lib/blog.ts cache-aside). */
const CACHE_KEYS = [1, 3, 5, 10, 50].map((limit) => `latest-posts:${limit}`);

function collectSources(env: Env): SyncSource[] {
  const sources: SyncSource[] = [];
  if (env.MEDIUM_RSS_URL) sources.push({ type: 'medium', url: env.MEDIUM_RSS_URL });
  if (env.SYNC_SOURCES) {
    for (const url of env.SYNC_SOURCES.split(',')) {
      const trimmed = url.trim();
      if (trimmed) sources.push({ type: 'rss', url: trimmed });
    }
  }
  return sources;
}

async function fetchWithRetry(url: string, attempts = 3): Promise<string> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'portfolio-blog-sync/0.1 (+https://github.com/sudiptad1978/portfolio)',
        },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    } catch (error) {
      lastError = error;
      if (attempt < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
      }
    }
  }
  throw lastError;
}

async function logRun(
  env: Env,
  source: string,
  status: 'success' | 'partial' | 'failed',
  itemsFetched: number,
  itemsUpserted: number,
  errorMessage?: string
): Promise<void> {
  if (!env.DB) return;
  try {
    await env.DB.prepare(
      `INSERT INTO sync_log (source, status, items_fetched, items_upserted, error_message)
       VALUES (?, ?, ?, ?, ?)`
    )
      .bind(source, status, itemsFetched, itemsUpserted, errorMessage ?? null)
      .run();
  } catch (error) {
    console.error('sync_log write failed:', error);
  }
}

async function syncSource(env: Env, source: SyncSource): Promise<void> {
  const xml = await fetchWithRetry(source.url);
  const items = parseFeed(xml);
  let upserted = 0;

  for (const item of items) {
    const sanitized = sanitizeHtml(item.contentHtml);
    const excerpt = excerptFrom(item.contentHtml);
    const readingTime = readingTimeMinutes(item.contentHtml);
    const coverImage = firstImage(item.contentHtml);
    const slug = slugify(item.title) || `post-${Date.now()}`;

    await env
      .DB!.prepare(
        `INSERT INTO blog_posts
         (source, external_id, canonical_url, title, slug, excerpt, content_html,
          cover_image, reading_time_minutes, published_at, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published')
       ON CONFLICT(source, external_id) DO UPDATE SET
         title = excluded.title,
         excerpt = excluded.excerpt,
         content_html = excluded.content_html,
         cover_image = excluded.cover_image,
         reading_time_minutes = excluded.reading_time_minutes,
         synced_at = datetime('now')`
        // slug is intentionally NOT updated on conflict — stable URLs
      )
      .bind(
        source.type,
        item.guid,
        item.link,
        item.title,
        slug,
        excerpt,
        sanitized,
        coverImage,
        readingTime,
        item.publishedAt
      )
      .run();
    upserted++;
  }

  await logRun(env, source.type, 'success', items.length, upserted);
}

export default {
  async scheduled(
    _controller: ScheduledController,
    env: Env,
    _ctx: ExecutionContextLike
  ): Promise<void> {
    const sources = collectSources(env);

    if (sources.length === 0) {
      await logRun(
        env,
        'none',
        'success',
        0,
        0,
        'No sources configured (set MEDIUM_RSS_URL or SYNC_SOURCES)'
      );
      return;
    }

    for (const source of sources) {
      try {
        await syncSource(env, source);
      } catch (error) {
        // Isolate per-source failures — never fail the whole run for one bad feed.
        await logRun(env, source.type, 'failed', 0, 0, String(error));
      }
    }

    // Invalidate latest-posts caches so the next homepage read picks up fresh data.
    if (env.CACHE) {
      for (const key of CACHE_KEYS) {
        try {
          await env.CACHE.delete(key);
        } catch {
          /* best-effort */
        }
      }
    }
  },
};
