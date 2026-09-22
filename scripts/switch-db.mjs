#!/usr/bin/env node
/**
 * Menukar datasource Prisma antara PostgreSQL (default/produksi) dan SQLite
 * (demo offline tanpa server database). Schema sengaja ditulis portable
 * sehingga tidak ada perubahan model yang diperlukan.
 *
 *   node scripts/switch-db.mjs sqlite
 *   node scripts/switch-db.mjs postgresql
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const target = (process.argv[2] || '').toLowerCase();

if (!['sqlite', 'postgresql', 'postgres'].includes(target)) {
  console.error('Pemakaian: node scripts/switch-db.mjs <sqlite|postgresql>');
  process.exit(1);
}

const provider = target === 'sqlite' ? 'sqlite' : 'postgresql';
const schemaPath = resolve(root, 'prisma/schema.prisma');
const schema = readFileSync(schemaPath, 'utf8');
const next = schema.replace(/provider\s*=\s*"(postgresql|sqlite|mysql)"/, `provider = "${provider}"`);
writeFileSync(schemaPath, next);

const envPath = resolve(root, '.env');
const defaultUrl =
  provider === 'sqlite'
    ? 'file:./dev.db'
    : 'postgresql://postgres:postgres@localhost:5432/buahhati?schema=public';

let env = existsSync(envPath) ? readFileSync(envPath, 'utf8') : '';
if (!env.trim()) {
  const example = resolve(root, '.env.example');
  env = existsSync(example) ? readFileSync(example, 'utf8') : 'DATABASE_URL=""\n';
}
if (/^DATABASE_URL=.*$/m.test(env)) {
  env = env.replace(/^DATABASE_URL=.*$/m, `DATABASE_URL="${defaultUrl}"`);
} else {
  env += `\nDATABASE_URL="${defaultUrl}"\n`;
}
if (!/^AUTH_SECRET=/m.test(env)) {
  const secret = [...crypto.getRandomValues(new Uint8Array(32))]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  env += `AUTH_SECRET="${secret}"\n`;
}
writeFileSync(envPath, env);

console.log(`Datasource Prisma sekarang: ${provider}`);
console.log(`DATABASE_URL diset ke: ${defaultUrl}`);
console.log('Lanjutkan dengan: npm run db:push && npm run db:seed');
