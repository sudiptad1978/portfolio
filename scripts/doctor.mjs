#!/usr/bin/env node
/**
 * `npm run doctor` — advisory pre-flight checks (architecture §22:
 * "a npm run doctor script that checks required bindings before build").
 *
 * Never destructive: prints a report; exits 1 only on hard errors
 * (missing files / wrong Node version), not on advisories.
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const warnings = [];
const ok = [];

/* Node version */
const [major] = process.versions.node.split('.').map(Number);
if (major >= 20) ok.push(`Node ${process.versions.node} (>= 20)`);
else errors.push(`Node ${major}.x found — this project requires Node >= 20`);

/* The single file a forker edits */
const siteConfigPath = join(root, 'config', 'site.config.ts');
if (existsSync(siteConfigPath)) ok.push('config/site.config.ts present (Zod-validated at build)');
else errors.push('config/site.config.ts is missing');

/* Placeholder Cloudflare binding IDs */
const wranglerPath = join(root, 'wrangler.toml');
if (existsSync(wranglerPath)) {
  const wrangler = readFileSync(wranglerPath, 'utf8');
  const hasPlaceholder =
    wrangler.includes('00000000-0000-0000-0000-000000000000') || wrangler.includes('REPLACE_ME');
  if (hasPlaceholder) {
    warnings.push(
      'wrangler.toml still contains placeholder D1/KV IDs — the site runs in zero-database mode until you run:\n' +
        '    wrangler d1 create portfolio-db && wrangler kv namespace create CACHE\n' +
        '    (then paste the returned IDs into wrangler.toml and workers/wrangler.toml)'
    );
  } else {
    ok.push('wrangler.toml bindings look provisioned (no placeholder IDs)');
  }
}

/* Local secrets */
if (existsSync(join(root, '.dev.vars'))) {
  ok.push('.dev.vars present (local Pages Function secrets)');
} else if (existsSync(join(root, '.env'))) {
  ok.push('.env present');
} else {
  warnings.push(
    'no .dev.vars / .env found — copy .env.example and fill in what you need (Turnstile keys optional in dev)'
  );
}

/* Build output */
if (existsSync(join(root, 'dist', '_worker.js'))) {
  ok.push('dist/ contains a Workers build (npm run build succeeded previously)');
} else {
  warnings.push('no build output yet — run npm run build (or npm run dev for live development)');
}

/* Report */
console.log('\n📋 Portfolio platform doctor\n');
for (const item of ok) console.log(`  ✅ ${item}`);
for (const item of warnings) console.log(`  ⚠️  ${item}`);
for (const item of errors) console.log(`  ❌ ${item}`);
console.log('');

if (errors.length > 0) {
  console.error(`${errors.length} hard error(s) must be fixed.\n`);
  process.exit(1);
}
console.log(
  warnings.length > 0
    ? `${warnings.length} advisory warning(s) — fine for local dev / zero-database mode.\n`
    : 'All checks green.\n'
);
