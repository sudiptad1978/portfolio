/**
 * KV-backed fixed-window rate limiter (per key, e.g. hashed IP).
 * Simple by design: a counter with a TTL window. Good enough for
 * contact-form abuse protection at portfolio scale; Cloudflare's native
 * rate-limiting rules act as the second layer.
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
}

export async function checkRateLimit(
  kv: KVNamespace,
  key: string,
  limit = 10,
  windowSeconds = 60
): Promise<RateLimitResult> {
  const current = Number((await kv.get(key)) ?? '0');
  if (Number.isNaN(current) || current >= limit) {
    return { allowed: false, remaining: 0, limit };
  }
  // Note: the put() resets the TTL each hit — a pragmatic approximation of a
  // fixed window. For stricter semantics use a Durable Object; overkill here.
  await kv.put(key, String(current + 1), { expirationTtl: windowSeconds });
  return { allowed: true, remaining: limit - current - 1, limit };
}
