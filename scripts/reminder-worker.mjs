#!/usr/bin/env node
/**
 * Worker pengingat untuk deployment self-host tanpa cron eksternal.
 * Memanggil /api/cron/reminders setiap REMINDER_INTERVAL_MINUTES (default 15).
 *
 *   node scripts/reminder-worker.mjs
 *
 * Alternatif tanpa worker: jadwalkan cron server / Vercel Cron ke endpoint yang sama.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// muat .env sederhana bila variabel belum tersedia di environment
const envPath = resolve(root, '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  }
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const secret = process.env.CRON_SECRET;
const intervalMinutes = Number(process.env.REMINDER_INTERVAL_MINUTES ?? 15);

if (!secret) {
  console.error('CRON_SECRET belum diset di .env — worker dihentikan.');
  process.exit(1);
}

async function tick() {
  try {
    const response = await fetch(`${baseUrl}/api/cron/reminders`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}` },
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error(`[reminder] HTTP ${response.status}`, body?.message ?? '');
      return;
    }
    const data = body?.data ?? {};
    console.log(
      `[reminder] ${new Date().toISOString()} — H-1: ${data.h1 ?? 0}, H-2 jam: ${data.h2h ?? 0}, dilewati: ${data.skipped ?? 0}`,
    );
  } catch (error) {
    console.error('[reminder] gagal memanggil endpoint:', error.message);
  }
}

console.log(`Worker reminder berjalan setiap ${intervalMinutes} menit → ${baseUrl}`);
await tick();
setInterval(tick, intervalMinutes * 60_000);
