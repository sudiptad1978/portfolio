/// <reference types="astro/client" />

/**
 * Minimal structural types for the Cloudflare bindings used by this project.
 * (Hand-rolled instead of importing @cloudflare/workers-types to avoid
 * clashing with Astro's DOM lib under `astro check` — the runtime objects
 * are the real Cloudflare bindings.)
 */
interface D1Result<T = unknown> {
  results: T[];
  success: boolean;
  meta: Record<string, unknown>;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(): Promise<T | null>;
  all<T = unknown>(): Promise<D1Result<T>>;
  run(): Promise<D1Result<unknown>>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<unknown>;
}

interface KVNamespace {
  get(key: string): Promise<string | null>;
  get<T = unknown>(key: string, type: 'json'): Promise<T | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

/** Bindings available to Pages Functions / SSR routes (wrangler.toml + secrets). */
interface Env {
  DB?: D1Database;
  CACHE?: KVNamespace;
  MEDIA?: R2BucketLike;
  TURNSTILE_SECRET_KEY?: string;
  MEDIUM_RSS_URL?: string;
  SYNC_SOURCES?: string;
}

interface R2BucketLike {
  get(key: string): Promise<unknown>;
  put(key: string, value: unknown, options?: Record<string, unknown>): Promise<unknown>;
  delete(key: string): Promise<void>;
}

declare namespace App {
  interface Locals {
    /** Present for SSR requests (Pages Functions runtime); absent at build. */
    runtime?: { env: Env };
  }
}
