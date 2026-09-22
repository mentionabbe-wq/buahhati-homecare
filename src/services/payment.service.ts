import 'server-only';
import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/api';
import { recordAudit } from '@/lib/audit';
import type { SessionUser } from '@/lib/auth';
import type { PaymentMethod, PaymentStatus } from '@/lib/constants';
import { notifyReservation } from './whatsapp';

/**
 * Abstraksi payment gateway. Provider `mock` mengembalikan instruksi manual
 * sehingga modul pembayaran tetap berfungsi tanpa kredensial gateway.
 * Tambahkan implementasi Midtrans/Xendit di sini tanpa mengubah pemanggil.
 */
export interface PaymentProvider {
  name: string;
  createCharge(input: {
    reservationCode: string;
    amount: number;
    method: PaymentMethod;
    customerName: string;
    customerPhone: string;
  }): Promise<{ ok: boolean; reference?: string; instructions?: string; redirectUrl?: string; error?: string }>;
}

const mockGateway: PaymentProvider = {
  name: 'mock',
  async createCharge(input) {
    return {
      ok: true,
      reference: `MOCK-${input.reservationCode}`,
      instructions:
        input.method === 'QRIS'
          ? 'Scan QRIS yang tersedia di halaman pembayaran, lalu unggah bukti transfer.'
          : 'Silakan lakukan transfer ke rekening yang tertera, lalu konfirmasi ke admin.',
    };
  },
};

const REGISTRY: Record<string, PaymentProvider> = { mock: mockGateway };

export function getPaymentProvider(name?: string): PaymentProvider {
  const key = (name || process.env.PAYMENT_PROVIDER || 'mock').toLowerCase();
  return REGISTRY[key] ?? mockGateway;
}

export async function createPayment(input: {
  reservationId: string;
  method: PaymentMethod;
  amount: number;
  status?: PaymentStatus;
  reference?: string | null;
  proofUrl?: string | null;
  note?: string | null;
  actor?: SessionUser | null;
}) {
  const reservation = await prisma.reservation.findUnique({
    where: { id: input.reservationId },
    include: { customer: true },
  });
  if (!reservation) throw new AppError('Reservasi tidak ditemukan', 404);

  const provider = getPaymentProvider();
  let reference = input.reference ?? null;
  let instructions: string | undefined;

  if (input.method === 'GATEWAY' || input.method === 'QRIS') {
    const charge = await provider.createCharge({
      reservationCode: reservation.reservationCode,
      amount: input.amount,
      method: input.method,
      customerName: reservation.customer.name,
      customerPhone: reservation.customer.phone,
    });
    if (!charge.ok) throw new AppError(charge.error ?? 'Gagal membuat tagihan', 502);
    reference = reference ?? charge.reference ?? null;
    instructions = charge.instructions;
  }

  const payment = await prisma.payment.create({
    data: {
      reservationId: reservation.id,
      method: input.method,
      status: input.status ?? 'PENDING',
      amount: input.amount,
      reference,
      proofUrl: input.proofUrl ?? null,
      note: input.note ?? instructions ?? null,
    },
  });

  await syncReservationPaymentStatus(reservation.id);
  await recordAudit({
    actor: input.actor,
    action: 'payment.create',
    entity: 'Payment',
    entityId: payment.id,
    after: { amount: payment.amount, method: payment.method, status: payment.status },
  });

  return { payment, instructions };
}

export async function updatePaymentStatus(params: {
  paymentId: string;
  status: PaymentStatus;
  actor: SessionUser;
  note?: string | null;
}) {
  const payment = await prisma.payment.findUnique({ where: { id: params.paymentId } });
  if (!payment) throw new AppError('Pembayaran tidak ditemukan', 404);

  const updated = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: params.status,
      note: params.note ?? payment.note,
      paidAt: params.status === 'PAID' ? new Date() : null,
      confirmedBy: params.actor.name,
    },
  });

  await syncReservationPaymentStatus(payment.reservationId);
  if (params.status === 'PAID') {
    await notifyReservation(payment.reservationId, 'PAYMENT_CONFIRMED').catch(() => undefined);
  }
  await recordAudit({
    actor: params.actor,
    action: 'payment.status',
    entity: 'Payment',
    entityId: payment.id,
    before: { status: payment.status },
    after: { status: params.status },
  });

  return updated;
}

/** Status pembayaran reservasi = ringkasan seluruh transaksi pembayarannya. */
export async function syncReservationPaymentStatus(reservationId: string) {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: { payments: true },
  });
  if (!reservation) return;

  const paid = reservation.payments
    .filter((p) => p.status === 'PAID')
    .reduce((sum, p) => sum + p.amount, 0);
  const hasPending = reservation.payments.some((p) => p.status === 'PENDING');
  const refunded = reservation.payments.some((p) => p.status === 'REFUNDED');

  let status: PaymentStatus = 'UNPAID';
  if (refunded) status = 'REFUNDED';
  else if (paid >= reservation.total && reservation.total > 0) status = 'PAID';
  else if (hasPending || paid > 0) status = 'PENDING';

  if (status !== reservation.paymentStatus) {
    await prisma.reservation.update({ where: { id: reservationId }, data: { paymentStatus: status } });
  }
  return status;
}
