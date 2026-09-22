import 'server-only';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/api';
import { dateKeyToDate, todayKey } from '@/lib/datetime';
import { parseJsonArray } from '@/lib/utils';

type Db = Prisma.TransactionClient | typeof prisma;

export type PromoResult = {
  promoId: string | null;
  code: string | null;
  discount: number;
  label: string | null;
};

/**
 * Validasi kode promo terhadap subtotal & layanan.
 * Melempar AppError bila kode tidak berlaku sehingga customer mendapat pesan jelas.
 */
export async function applyPromo(
  db: Db,
  params: { code?: string | null; subtotal: number; serviceId: string },
): Promise<PromoResult> {
  const empty: PromoResult = { promoId: null, code: null, discount: 0, label: null };
  const code = params.code?.trim().toUpperCase();
  if (!code) return empty;

  const promo = await db.promo.findUnique({ where: { code } });
  if (!promo || !promo.isActive) throw new AppError('Kode promo tidak ditemukan', 404, 'PROMO_NOT_FOUND');

  const today = dateKeyToDate(todayKey());
  if (today < promo.startDate) throw new AppError('Promo belum berlaku', 400, 'PROMO_NOT_STARTED');
  if (today > promo.endDate) throw new AppError('Promo sudah berakhir', 400, 'PROMO_EXPIRED');
  if (promo.quota !== null && promo.usedCount >= promo.quota) {
    throw new AppError('Kuota promo sudah habis', 409, 'PROMO_QUOTA');
  }
  if (params.subtotal < promo.minTransaction) {
    throw new AppError('Transaksi belum memenuhi minimal promo', 400, 'PROMO_MIN');
  }
  const allowed = parseJsonArray(promo.serviceIds);
  if (allowed.length > 0 && !allowed.includes(params.serviceId)) {
    throw new AppError('Promo tidak berlaku untuk layanan ini', 400, 'PROMO_SERVICE');
  }

  let discount =
    promo.discountType === 'PERCENT'
      ? Math.floor((params.subtotal * promo.discountValue) / 100)
      : promo.discountValue;
  if (promo.maxDiscount) discount = Math.min(discount, promo.maxDiscount);
  discount = Math.max(0, Math.min(discount, params.subtotal));

  return {
    promoId: promo.id,
    code: promo.code,
    discount,
    label:
      promo.discountType === 'PERCENT'
        ? `${promo.name} (${promo.discountValue}%)`
        : promo.name,
  };
}
