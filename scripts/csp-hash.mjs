#!/usr/bin/env node
/**
 * `node scripts/csp-hash.mjs` — prints the sha256/base64 CSP hash of the
 * pre-paint theme script as served in dist/index.html.
 *
 * After editing the inline script in src/layouts/BaseLayout.astro:
 *   1. npm run build
 *   2. node scripts/csp-hash.mjs
 *   3. paste the output into public/_headers (script-src 'sha256-…')
 *   4. npm run build   (so dist/_headers picks up the change)
 */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const html = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf-8');
const match = html.match(/<script>([\s\S]*?)<\/script>/);

if (!match) {
  console.error('No bare <script> found in dist/index.html — did the build run?');
  process.exit(1);
}

const hash = createHash('sha256').update(match[1], 'utf-8').digest('base64');
console.log(`sha256-${hash}`);
