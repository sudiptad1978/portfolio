import type { APIRoute } from 'astro';
import { contactSchema } from '../../lib/validation';
import { checkRateLimit } from '../../lib/rateLimit';
import { hashIp } from '../../lib/hash';

/**
 * POST /api/contact — Turnstile-verified, rate-limited, persisted to D1.
 * Security layers (architecture §13): Zod validation → KV rate limit →
 * Turnstile server-side verification → prepared statements only.
 *
 * Dev mode: when TURNSTILE_SECRET_KEY is not configured the submission is
 * accepted with turnstile_verified = 0 (documented; production must set it).
 */

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

const RATE_LIMIT = 10; // messages per minute per IP hash
const RATE_WINDOW_SECONDS = 60;

export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime?.env;

  if (!env?.DB) {
    return json(
      { error: 'Contact form is not configured on this deployment (D1 binding missing).' },
      503
    );
  }

  // 1. Parse (JSON from the fetch client, or form-encoded for the no-JS path)
  const contentType = request.headers.get('content-type') ?? '';
  let raw: Record<string, unknown>;
  try {
    if (contentType.includes('application/json')) {
      raw = (await request.json()) as Record<string, unknown>;
    } else if (
      contentType.includes('application/x-www-form-urlencoded') ||
      contentType.includes('multipart/form-data')
    ) {
      raw = Object.fromEntries((await request.formData()).entries());
    } else {
      return json({ error: 'Unsupported content type.' }, 415);
    }
  } catch {
    return json({ error: 'Invalid request body.' }, 400);
  }

  // 2. Validate (Zod — never trust client validation alone)
  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success) {
    return json(
      {
        error: parsed.error.issues[0]?.message ?? 'Invalid input.',
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
      400
    );
  }

  // 3. Rate limit (KV counter per hashed IP — raw IPs are never stored)
  const ip = request.headers.get('cf-connecting-ip') ?? '127.0.0.1';
  const ipHash = await hashIp(ip);
  if (env.CACHE) {
    const rateLimit = await checkRateLimit(
      env.CACHE,
      `rl:contact:${ipHash}`,
      RATE_LIMIT,
      RATE_WINDOW_SECONDS
    );
    if (!rateLimit.allowed) {
      return json({ error: 'Too many messages — please try again in a minute.' }, 429);
    }
  }

  // 4. Turnstile verification (server-side, before any D1 write)
  let turnstileVerified = 0;
  const secret = env.TURNSTILE_SECRET_KEY;
  if (secret) {
    const token = parsed.data['cf-turnstile-response'];
    if (!token) {
      return json(
        { error: 'Bot verification missing — please reload the page and try again.' },
        400
      );
    }
    try {
      const verify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        body: new URLSearchParams({ secret, response: token, remoteip: ip }),
      });
      const outcome = (await verify.json().catch(() => null)) as { success?: boolean } | null;
      if (!outcome?.success) {
        return json({ error: 'Bot verification failed.' }, 400);
      }
      turnstileVerified = 1;
    } catch {
      return json({ error: 'Could not reach the verification service — please try again.' }, 502);
    }
  }

  // 5. Persist (prepared statements only)
  try {
    await env.DB.prepare(
      `INSERT INTO contact_submissions (name, email, message, turnstile_verified, ip_hash)
       VALUES (?, ?, ?, ?, ?)`
    )
      .bind(parsed.data.name, parsed.data.email, parsed.data.message, turnstileVerified, ipHash)
      .run();
    return json({ ok: true }, 200);
  } catch (error) {
    console.error('contact insert failed:', error);
    return json({ error: 'Could not save your message — please use the email link instead.' }, 500);
  }
};
