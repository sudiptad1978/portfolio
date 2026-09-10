import type { APIRoute } from 'astro';
import { getLatestPosts } from '../../lib/blog';

/**
 * GET /api/blog?limit=3 — live blog list with KV cache-aside over D1
 * (architecture §5: KV first, D1 on miss, content-collection fallback).
 * Used between scheduled rebuilds so fresh posts are available immediately.
 */
export const GET: APIRoute = async ({ request, locals }) => {
  const limitParam = Number(new URL(request.url).searchParams.get('limit') ?? '3');
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(Math.trunc(limitParam), 1), 50) : 3;

  const posts = await getLatestPosts(locals.runtime?.env, limit);

  return new Response(JSON.stringify({ posts }), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
};
