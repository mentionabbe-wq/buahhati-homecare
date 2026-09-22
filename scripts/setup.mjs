#!/usr/bin/env node
/**
 * Setup sekali jalan: menyiapkan .env, mendorong schema ke database,
 * lalu mengisi data awal.
 *
 *   npm run setup            # memakai DATABASE_URL yang ada (atau SQLite bila kosong)
 *   npm run setup -- sqlite  # paksa mode demo SQLite
 */
import { execSync } from 'node:child_process';
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = resolve(root, '.env');
const forceSqlite = process.argv.includes('sqlite');

function run(command) {
  console.log(`\n› ${command}`);
  execSync(command, { cwd: root, stdio: 'inherit' });
}

if (!existsSync(envPath)) {
  copyFileSync(resolve(root, '.env.example'), envPath);
  console.log('✓ .env dibuat dari .env.example');
}

let env = readFileSync(envPath, 'utf8');
if (/AUTH_SECRET="ganti-dengan/.test(env)) {
  env = env.replace(/AUTH_SECRET=.*/, `AUTH_SECRET="${randomBytes(32).toString('hex')}"`);
  console.log('✓ AUTH_SECRET diacak');
}
if (/CRON_SECRET="ganti-dengan/.test(env)) {
  env = env.replace(/CRON_SECRET=.*/, `CRON_SECRET="${randomBytes(24).toString('hex')}"`);
  console.log('✓ CRON_SECRET diacak');
}
writeFileSync(envPath, env);

if (forceSqlite) run('node scripts/switch-db.mjs sqlite');

run('npx prisma generate');
run('npx prisma db push');
run('npx prisma db seed');
run('node scripts/generate-icons.mjs');

console.log('\n✓ Setup selesai. Jalankan: npm run dev');
