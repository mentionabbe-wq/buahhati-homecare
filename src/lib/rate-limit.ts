import 'server-only';
import { AppError } from './api';

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/**
 * Rate limiter in-memory (cukup untuk deployment satu instance).
 * Untuk multi-instance, ganti implementasi ini dengan Redis/Upstash —
 * antarmuka `rateLimit()` tetap sama.
 */
export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { remaining: limit - 1, resetAt: now + windowMs };
  }
  bucket.count += 1;
  if (bucket.count > limit) {
    const seconds = Math.ceil((bucket.resetAt - now) / 1000);
    throw new AppError(
      `Terlalu banyak percobaan. Coba lagi dalam ${seconds} detik.`,
      429,
      'RATE_LIMITED',
    );
  }
  return { remaining: limit - bucket.count, resetAt: bucket.resetAt };
}

/** Bersihkan bucket kedaluwarsa sesekali agar memori tidak menumpuk. */
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) if (bucket.resetAt < now) buckets.delete(key);
}, 60_000).unref?.();
