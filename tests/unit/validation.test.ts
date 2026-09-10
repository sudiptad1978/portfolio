import { describe, expect, it } from 'vitest';
import { contactSchema } from '../../src/lib/validation';

describe('contactSchema (server-side input validation)', () => {
  it('accepts a well-formed submission', () => {
    const result = contactSchema.safeParse({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      message: 'Hello, I would like to talk about quality engineering.',
    });
    expect(result.success).toBe(true);
  });

  it('accepts an optional Turnstile token', () => {
    const result = contactSchema.safeParse({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      message: 'Hello, this is a valid message body.',
      'cf-turnstile-response': 'tok123',
    });
    expect(result.success).toBe(true);
  });

  it('rejects short names, bad emails, and short messages', () => {
    expect(contactSchema.safeParse({ name: 'A', email: 'nope', message: 'hi' }).success).toBe(
      false
    );
    expect(
      contactSchema.safeParse({
        name: 'Valid Name',
        email: 'not-an-email',
        message: 'long enough message',
      }).success
    ).toBe(false);
    expect(
      contactSchema.safeParse({ name: 'Valid Name', email: 'a@b.co', message: 'short' }).success
    ).toBe(false);
  });

  it('rejects missing fields outright', () => {
    expect(contactSchema.safeParse({}).success).toBe(false);
  });
});
