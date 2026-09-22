#!/usr/bin/env node
/**
 * Mengisi data awal HANYA bila database masih kosong.
 * Seed bersifat destruktif (menghapus lalu menulis ulang), jadi tidak boleh
 * berjalan otomatis pada container yang sudah berisi data sungguhan.
 *
 * Set SEED_DATABASE=false untuk mematikan perilaku ini sepenuhnya.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';

if (process.env.SEED_DATABASE === 'false') {
  console.log('› Seed dilewati (SEED_DATABASE=false).');
  process.exit(0);
}

const seedFile = 'dist-seed/seed.js';
if (!existsSync(seedFile)) {
  console.log('› Berkas seed tidak ditemukan, dilewati.');
  process.exit(0);
}

const prisma = new PrismaClient();
let userCount = 0;
try {
  userCount = await prisma.user.count();
} catch (error) {
  console.error('✗ Gagal memeriksa isi database:', error.message);
  await prisma.$disconnect();
  process.exit(1);
} finally {
  await prisma.$disconnect();
}

if (userCount > 0) {
  console.log(`› Database sudah berisi ${userCount} pengguna, seed dilewati.`);
  process.exit(0);
}

console.log('› Database kosong, mengisi data awal…');
const result = spawnSync(process.execPath, [seedFile], { stdio: 'inherit' });
process.exit(result.status ?? 1);
