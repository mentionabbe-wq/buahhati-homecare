import 'server-only';
import type { Prisma } from '@prisma/client';
import { prisma, isSqlite } from '@/lib/prisma';
import { AppError } from '@/lib/api';
import { BABY_CONDITIONS, STATUS_TRANSITIONS, type ReservationStatus } from '@/lib/constants';
import {
  addMinutesToTime,
  combineDateTime,
  dateKeyToDate,
  toDateKey,
  todayKey,
} from '@/lib/datetime';
import { normalizePhone } from '@/lib/utils';
import type { SessionUser } from '@/lib/auth';
import { recordAudit } from '@/lib/audit';
import { assertSlotAvailable, pickTherapistAutomatically } from './availability.service';
import { applyPromo } from './promo.service';
import { getSettings } from './settings.service';
import { notifyReservation } from './whatsapp';
import type { CreateReservationInput } from '@/lib/validation';

type Db = Prisma.TransactionClient;

/**
 * Nomor reservasi yang ditampilkan ke customer: HC-YYYYMMDD-0001.
 * Sengaja bukan id database, dan urut per tanggal treatment.
 */
export async function generateReservationCode(db: Db, dateKey: string) {
  const compact = dateKey.replace(/-/g, '');
  const prefix = `HC-${compact}-`;
  const last = await db.reservation.findFirst({
    where: { reservationCode: { startsWith: prefix } },
    orderBy: { reservationCode: 'desc' },
    select: { reservationCode: true },
  });
  const nextNumber = last ? Number(last.reservationCode.slice(prefix.length)) + 1 : 1;
  return `${prefix}${String(nextNumber).padStart(4, '0')}`;
}

export function conditionsNeedReview(conditions: string[]) {
  return conditions.some((value) => BABY_CONDITIONS.find((c) => c.value === value)?.flag);
}

export type CreateReservationResult = Prisma.ReservationGetPayload<{
  include: { customer: true; baby: true; service: true; therapist: true };
}>;

/**
 * Alur utama pembuatan reservasi.
 * Seluruh langkah kritis (cek slot, cek terapis, kuota promo, insert)
 * berjalan dalam satu transaksi agar dua customer tidak bisa merebut slot sama.
 */
export async function createReservation(
  input: CreateReservationInput,
  actor?: SessionUser | null,
): Promise<CreateReservationResult> {
  const settings = await getSettings();
  const phone = normalizePhone(input.parent.phone);
  if (!phone) throw new AppError('Nomor WhatsApp tidak valid', 422);

  const created = await prisma.$transaction(
    async (tx) => {
      const { service, endTime, startAt, endAt } = await assertSlotAvailable(tx, {
        dateKey: input.date,
        startTime: input.startTime,
        serviceId: input.serviceId,
        therapistId: input.therapistId || null,
      });

      // customer: pakai yang ada (berdasarkan nomor WA) atau buat baru
      const customer = await tx.customer.upsert({
        where: { phone },
        update: {
          name: input.parent.name,
          email: input.parent.email || undefined,
          address: input.address.address,
          district: input.address.district || undefined,
          village: input.address.village || undefined,
          landmark: input.address.landmark || undefined,
          locationNote: input.address.locationNote || undefined,
          mapsUrl: input.address.mapsUrl || undefined,
        },
        create: {
          name: input.parent.name,
          phone,
          email: input.parent.email || null,
          address: input.address.address,
          district: input.address.district || null,
          village: input.address.village || null,
          landmark: input.address.landmark || null,
          locationNote: input.address.locationNote || null,
          mapsUrl: input.address.mapsUrl || null,
        },
      });

      // bayi: pakai profil yang dipilih atau buat profil baru
      let babyId = input.baby.id || null;
      if (babyId) {
        const existing = await tx.baby.findFirst({
          where: { id: babyId, customerId: customer.id },
        });
        if (!existing) babyId = null;
      }
      if (!babyId) {
        const baby = await tx.baby.create({
          data: {
            customerId: customer.id,
            name: input.baby.name,
            birthDate: dateKeyToDate(input.baby.birthDate),
            gender: input.baby.gender,
            weightKg: input.baby.weightKg ?? null,
            notes: input.baby.notes || null,
          },
        });
        babyId = baby.id;
      } else {
        await tx.baby.update({
          where: { id: babyId },
          data: {
            weightKg: input.baby.weightKg ?? undefined,
            notes: input.baby.notes || undefined,
          },
        });
      }

      // terapis: bila customer tidak memilih, sistem menugaskan otomatis
      let therapistId = input.therapistId || null;
      if (!therapistId) {
        const picked = await pickTherapistAutomatically(tx, {
          dateKey: input.date,
          startTime: input.startTime,
          serviceId: input.serviceId,
        });
        therapistId = picked?.id ?? null;
      }

      const transportFee = settings.transportFee;
      const subtotal = service.price + transportFee;
      const promo = await applyPromo(tx, {
        code: input.promoCode,
        subtotal,
        serviceId: service.id,
      });
      const total = Math.max(0, subtotal - promo.discount);

      const needsReview = conditionsNeedReview(input.conditions);
      const code = await generateReservationCode(tx, input.date);

      const reservation = await tx.reservation.create({
        data: {
          reservationCode: code,
          customerId: customer.id,
          babyId,
          serviceId: service.id,
          therapistId,
          date: dateKeyToDate(input.date),
          startTime: input.startTime,
          endTime,
          startAt,
          endAt,
          address: input.address.address,
          district: input.address.district || null,
          village: input.address.village || null,
          landmark: input.address.landmark || null,
          locationNote: input.address.locationNote || null,
          mapsUrl: input.address.mapsUrl || null,
          babyConditions: JSON.stringify(input.conditions ?? []),
          conditionNote: input.conditionNote || null,
          needsReview,
          servicePrice: service.price,
          transportFee,
          discount: promo.discount,
          total,
          promoId: promo.promoId,
          status: 'PENDING',
          paymentStatus: 'UNPAID',
          customerNote: input.customerNote || null,
        },
        include: { customer: true, baby: true, service: true, therapist: true },
      });

      await tx.reservationStatusHistory.create({
        data: {
          reservationId: reservation.id,
          status: 'PENDING',
          note: needsReview
            ? 'Reservasi dibuat — kondisi bayi perlu ditinjau admin/terapis'
            : 'Reservasi dibuat oleh customer',
          changedBy: actor?.name ?? customer.name,
        },
      });

      await tx.payment.create({
        data: {
          reservationId: reservation.id,
          method: input.paymentMethod,
          status: input.paymentMethod === 'CASH' ? 'UNPAID' : 'PENDING',
          amount: total,
        },
      });

      if (promo.promoId) {
        await tx.promo.update({
          where: { id: promo.promoId },
          data: { usedCount: { increment: 1 } },
        });
      }

      await tx.customer.update({
        where: { id: customer.id },
        data: { totalReservations: { increment: 1 } },
      });

      return reservation;
    },
    // SQLite (mode demo) tidak mendukung isolation level eksplisit
    isSqlite ? { timeout: 15_000 } : { isolationLevel: 'Serializable', timeout: 15_000 },
  );

  await notifyReservation(created.id, 'RESERVATION_CREATED').catch(() => undefined);
  await recordAudit({
    actor,
    action: 'reservation.create',
    entity: 'Reservation',
    entityId: created.id,
    after: { code: created.reservationCode, total: created.total, status: created.status },
  });

  return created;
}

const STATUS_TIMESTAMP: Partial<Record<ReservationStatus, string>> = {
  CONFIRMED: 'confirmedAt',
  ON_THE_WAY: 'onTheWayAt',
  ARRIVED: 'arrivedAt',
  IN_SERVICE: 'startedAt',
  COMPLETED: 'completedAt',
  CANCELLED: 'cancelledAt',
};

export async function changeStatus(params: {
  reservationId: string;
  status: ReservationStatus;
  actor: SessionUser;
  note?: string | null;
  reason?: string | null;
  force?: boolean;
}) {
  const current = await prisma.reservation.findUnique({
    where: { id: params.reservationId },
    include: { customer: true, service: true, therapist: true, baby: true },
  });
  if (!current) throw new AppError('Reservasi tidak ditemukan', 404);

  const from = current.status as ReservationStatus;
  if (from === params.status) return current;
  const allowed = STATUS_TRANSITIONS[from] ?? [];
  if (!params.force && !allowed.includes(params.status)) {
    throw new AppError(
      `Status tidak dapat diubah dari ${from} ke ${params.status}`,
      409,
      'INVALID_TRANSITION',
    );
  }
  if (params.status === 'IN_SERVICE' && !current.therapistId) {
    throw new AppError('Tugaskan terapis terlebih dahulu', 400, 'NO_THERAPIST');
  }

  const data: Prisma.ReservationUpdateInput = { status: params.status };
  const field = STATUS_TIMESTAMP[params.status];
  if (field) (data as Record<string, unknown>)[field] = new Date();
  if (params.status === 'CANCELLED') data.cancelReason = params.reason ?? null;
  if (params.status === 'COMPLETED' && current.paymentStatus === 'UNPAID') {
    // pembayaran tunai umumnya diterima saat treatment selesai
    data.paymentStatus = 'PENDING';
  }

  const updated = await prisma.$transaction(async (tx) => {
    const res = await tx.reservation.update({ where: { id: current.id }, data });
    await tx.reservationStatusHistory.create({
      data: {
        reservationId: current.id,
        status: params.status,
        note: params.note ?? params.reason ?? null,
        changedBy: params.actor.name,
      },
    });
    if (params.status === 'CANCELLED' && current.promoId) {
      await tx.promo.update({
        where: { id: current.promoId },
        data: { usedCount: { decrement: 1 } },
      });
    }
    if (params.status === 'COMPLETED') {
      await tx.customer.update({
        where: { id: current.customerId },
        data: { totalSpent: { increment: current.total } },
      });
    }
    return res;
  });

  const templateByStatus: Partial<Record<ReservationStatus, Parameters<typeof notifyReservation>[1]>> =
    {
      CONFIRMED: 'RESERVATION_CONFIRMED',
      ON_THE_WAY: 'THERAPIST_ON_THE_WAY',
      COMPLETED: 'RESERVATION_COMPLETED',
      CANCELLED: 'RESERVATION_CANCELLED',
    };
  const template = templateByStatus[params.status];
  if (template) {
    await notifyReservation(current.id, template, {
      reason: params.reason ?? undefined,
    }).catch(() => undefined);
  }

  await recordAudit({
    actor: params.actor,
    action: 'reservation.status',
    entity: 'Reservation',
    entityId: current.id,
    before: { status: from },
    after: { status: params.status, note: params.note ?? params.reason ?? null },
  });

  return updated;
}

/** Reschedule + penugasan ulang terapis, tetap melalui validasi slot. */
export async function rescheduleReservation(params: {
  reservationId: string;
  dateKey?: string;
  startTime?: string;
  therapistId?: string | null;
  actor: SessionUser;
}) {
  const current = await prisma.reservation.findUnique({ where: { id: params.reservationId } });
  if (!current) throw new AppError('Reservasi tidak ditemukan', 404);
  if (['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(current.status)) {
    throw new AppError('Reservasi yang sudah selesai/dibatalkan tidak dapat diubah', 409);
  }

  const dateKey = params.dateKey ?? toDateKey(current.date);
  const startTime = params.startTime ?? current.startTime;
  const therapistId =
    params.therapistId === undefined ? current.therapistId : params.therapistId || null;

  const updated = await prisma.$transaction(
    async (tx) => {
      const { service } = await assertSlotAvailable(tx, {
        dateKey,
        startTime,
        serviceId: current.serviceId,
        therapistId,
        excludeReservationId: current.id,
      });
      const endTime = addMinutesToTime(startTime, service.durationMinutes);
      const startAt = combineDateTime(dateKey, startTime);
      const endAt = new Date(startAt.getTime() + service.durationMinutes * 60_000);

      const res = await tx.reservation.update({
        where: { id: current.id },
        data: {
          date: dateKeyToDate(dateKey),
          startTime,
          endTime,
          startAt,
          endAt,
          therapistId,
        },
      });
      await tx.reservationStatusHistory.create({
        data: {
          reservationId: current.id,
          status: res.status,
          note: `Jadwal diubah ke ${dateKey} ${startTime}`,
          changedBy: params.actor.name,
        },
      });
      return res;
    },
    isSqlite ? { timeout: 15_000 } : { isolationLevel: 'Serializable', timeout: 15_000 },
  );

  await recordAudit({
    actor: params.actor,
    action: 'reservation.reschedule',
    entity: 'Reservation',
    entityId: current.id,
    before: { date: toDateKey(current.date), startTime: current.startTime, therapistId: current.therapistId },
    after: { date: dateKey, startTime, therapistId },
  });

  return updated;
}

/** Aturan pembatalan mandiri oleh customer. */
export async function assertCustomerCanModify(reservation: {
  status: string;
  startAt: Date;
}) {
  const settings = await getSettings();
  if (!['PENDING', 'CONFIRMED'].includes(reservation.status)) {
    throw new AppError('Reservasi pada status ini tidak dapat diubah sendiri. Hubungi admin.', 409);
  }
  const limitMs = settings.cancelPolicyHours * 3_600_000;
  const nowUtcAdjusted = Date.now() + Number(process.env.BUSINESS_TZ_OFFSET ?? 420) * 60_000;
  if (reservation.startAt.getTime() - nowUtcAdjusted < limitMs) {
    throw new AppError(
      `Perubahan hanya dapat dilakukan minimal ${settings.cancelPolicyHours} jam sebelum jadwal. Silakan hubungi admin.`,
      409,
      'CANCEL_WINDOW',
    );
  }
}

export function reservationTimeline(
  history: { status: string; createdAt: Date; note: string | null; changedBy: string | null }[],
  currentStatus: string,
) {
  const steps: { key: ReservationStatus; label: string }[] = [
    { key: 'PENDING', label: 'Reservasi dibuat' },
    { key: 'CONFIRMED', label: 'Reservasi dikonfirmasi' },
    { key: 'ON_THE_WAY', label: 'Terapis menuju lokasi' },
    { key: 'ARRIVED', label: 'Terapis tiba di lokasi' },
    { key: 'IN_SERVICE', label: 'Treatment berlangsung' },
    { key: 'COMPLETED', label: 'Selesai' },
  ];
  const done = new Map(history.map((h) => [h.status, h]));
  return steps.map((step) => ({
    ...step,
    done: done.has(step.key) || step.key === currentStatus,
    at: done.get(step.key)?.createdAt ?? null,
    by: done.get(step.key)?.changedBy ?? null,
  }));
}

export function todayBoundaries() {
  const start = dateKeyToDate(todayKey());
  return { start, end: new Date(start.getTime() + 86_400_000) };
}
