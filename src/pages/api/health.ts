import type { APIRoute } from 'astro';

/**
 * GET /api/health — synthetic-monitoring + post-deploy smoke target.
 * Reports per-binding status; returns 503 only when a *configured* binding
 * is failing. Unbound bindings mean the zero-database fork path (static mode).
 */
export const GET: APIRoute = async ({ locals }) => {
  const env = locals.runtime?.env;
  const checks: Record<string, string> = {};

  if (!env?.DB) {
    checks.d1 = 'unbound';
  } else {
    try {
      await env.DB.prepare('SELECT 1').first();
      checks.d1 = 'ok';
    } catch {
      checks.d1 = 'error';
    }
  }

  if (!env?.CACHE) {
    checks.kv = 'unbound';
  } else {
    try {
      await env.CACHE.get('healthcheck-probe');
      checks.kv = 'ok';
    } catch {
      checks.kv = 'error';
    }
  }

  const degraded = Object.values(checks).includes('error');

  return new Response(
    JSON.stringify({
      status: degraded ? 'degraded' : 'ok',
      checks,
      timestamp: new Date().toISOString(),
    }),
    {
      status: degraded ? 503 : 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    }
  );
};
