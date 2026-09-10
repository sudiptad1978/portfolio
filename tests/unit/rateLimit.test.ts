import { describe, expect, it } from 'vitest';
import { checkRateLimit } from '../../src/lib/rateLimit';

function fakeKv(store = new Map<string, string>()) {
  return {
    get: async (key: string) => store.get(key) ?? null,
    put: async (key: string, value: string) => {
      store.set(key, value);
    },
    delete: async (key: string) => {
      store.delete(key);
    },
  } as unknown as KVNamespace;
}

describe('checkRateLimit (contact form abuse protection)', () => {
  it('allows requests under the limit and reports remaining', async () => {
    const kv = fakeKv();
    const first = await checkRateLimit(kv, 'rl:contact:abc', 3, 60);
    expect(first.allowed).toBe(true);
    expect(first.remaining).toBe(2);
  });

  it('blocks after the limit is reached', async () => {
    const kv = fakeKv();
    for (let i = 0; i < 3; i++) {
      await checkRateLimit(kv, 'rl:contact:abc', 3, 60);
    }
    const result = await checkRateLimit(kv, 'rl:contact:abc', 3, 60);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('tracks keys independently', async () => {
    const kv = fakeKv();
    await checkRateLimit(kv, 'rl:contact:a', 1, 60);
    const blocked = await checkRateLimit(kv, 'rl:contact:a', 1, 60);
    const other = await checkRateLimit(kv, 'rl:contact:b', 1, 60);
    expect(blocked.allowed).toBe(false);
    expect(other.allowed).toBe(true);
  });
});
