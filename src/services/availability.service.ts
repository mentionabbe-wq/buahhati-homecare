import 'server-only';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/api';
import {
  addMinutesToTime,
  businessNow,
  combineDateTime,
  dateKeyToDate,
  dayOfWeek,
  timeToMinutes,
  todayKey,
} from '@/lib/datetime';
import { getSettings } from './settings.service';

/** Status reservasi yang masih memakai slot. */
export const ACTIVE_STATUSES = ['PENDING', 'CONFIRMED', 'ON_THE_WAY', 'ARRIVED', 'IN_SERVICE'];

export type SlotInfo = {
  time: string;
  endTime: string;
  available: boolean;
  reason?: string;
  availableTherapistIds: string[];
  booked: number;
  capacity: number;
};

type Db = Prisma.TransactionClient | typeof prisma;

type TherapistWithSchedule = Prisma.TherapistGetPayload<{
  include: { schedules: true; timeOffs: true };
}>;

/** Apakah terapis bekerja pada rentang jam tertentu di hari itu? */
export function therapistWorksAt(
  therapist: TherapistWithSchedule,
  dateKey: string,
  startTime: string,
  endTime: string,
) {
  if (!therapist.isActive) return false;
  const dow = dayOfWeek(dateKey);
  const schedule = therapist.schedules.find((s) => s.dayOfWeek === dow);
  if (!schedule || schedule.isDayOff) return false;
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  if (start < timeToMinutes(schedule.startTime) || end > timeToMinutes(schedule.endTime)) {
    return false;
  }
  const dayStart = dateKeyToDate(dateKey).getTime();
  return !therapist.timeOffs.some((off) => off.date.getTime() === dayStart);
}

export async function getSlots(params: {
  dateKey: string;
  serviceId: string;
  therapistId?: string | null;
  excludeReservationId?: string | null;
}): Promise<{ slots: SlotInfo[]; serviceName: string; durationMinutes: number }> {
  const settings = await getSettings();
  const service = await prisma.service.findUnique({ where: { id: params.serviceId } });
  if (!service) throw new AppError('Layanan tidak ditemukan', 404, 'SERVICE_NOT_FOUND');
  if (!service.isActive) throw new AppError('Layanan sedang tidak tersedia', 400, 'SERVICE_INACTIVE');

  const therapists = await prisma.therapist.findMany({
    where: { isActive: true, ...(params.therapistId ? { id: params.therapistId } : {}) },
    include: { schedules: true, timeOffs: true },
  });

  const dayStart = dateKeyToDate(params.dateKey);
  const dayEnd = new Date(dayStart.getTime() + 86_400_000);
  const reservations = await prisma.reservation.findMany({
    where: {
      startAt: { gte: dayStart, lt: dayEnd },
      status: { in: ACTIVE_STATUSES },
      ...(params.excludeReservationId ? { id: { not: params.excludeReservationId } } : {}),
    },
    select: { id: true, therapistId: true, serviceId: true, startAt: true, endAt: true },
  });

  const now = businessNow();
  const minBookable = new Date(now.getTime() + settings.minLeadHours * 3_600_000);
  const maxBookable = new Date(
    dateKeyToDate(todayKey()).getTime() + settings.maxAdvanceDays * 86_400_000,
  );

  const slots: SlotInfo[] = settings.slotTimes.map((time) => {
    const endTime = addMinutesToTime(time, service.durationMinutes);
    const startAt = combineDateTime(params.dateKey, time);
    const endAt = new Date(startAt.getTime() + service.durationMinutes * 60_000);

    const overlapping = reservations.filter((r) => r.startAt < endAt && r.endAt > startAt);
    const sameService = overlapping.filter((r) => r.serviceId === service.id).length;

    const freeTherapists = therapists
      .filter((t) => therapistWorksAt(t, params.dateKey, time, endTime))
      .filter((t) => !overlapping.some((r) => r.therapistId === t.id))
      .map((t) => t.id);

    let available = true;
    let reason: string | undefined;

    if (startAt < minBookable) {
      available = false;
      reason = `Minimal pemesanan ${settings.minLeadHours} jam sebelum treatment`;
    } else if (startAt > maxBookable) {
      available = false;
      reason = `Maksimal pemesanan ${settings.maxAdvanceDays} hari ke depan`;
    } else if (timeToMinutes(endTime) > timeToMinutes(settings.closeHour)) {
      available = false;
      reason = 'Melebihi jam operasional';
    } else if (timeToMinutes(time) < timeToMinutes(settings.openHour)) {
      available = false;
      reason = 'Di luar jam operasional';
    } else if (sameService >= service.maxPerSlot) {
      available = false;
      reason = 'Kuota layanan pada jam ini penuh';
    } else if (freeTherapists.length === 0) {
      available = false;
      reason = params.therapistId ? 'Terapis tidak tersedia' : 'Semua terapis sudah terisi';
    }

    return {
      time,
      endTime,
      available,
      reason,
      availableTherapistIds: freeTherapists,
      booked: overlapping.length,
      capacity: therapists.length,
    };
  });

  return { slots, serviceName: service.name, durationMinutes: service.durationMinutes };
}

/** Terapis yang benar-benar bebas pada tanggal+jam tertentu. */
export async function getAvailableTherapists(params: {
  dateKey: string;
  startTime: string;
  serviceId: string;
  excludeReservationId?: string | null;
}) {
  const service = await prisma.service.findUnique({ where: { id: params.serviceId } });
  if (!service) throw new AppError('Layanan tidak ditemukan', 404);
  const endTime = addMinutesToTime(params.startTime, service.durationMinutes);
  const startAt = combineDateTime(params.dateKey, params.startTime);
  const endAt = new Date(startAt.getTime() + service.durationMinutes * 60_000);

  const therapists = await prisma.therapist.findMany({
    where: { isActive: true },
    include: { schedules: true, timeOffs: true },
    orderBy: { name: 'asc' },
  });

  const busy = await prisma.reservation.findMany({
    where: {
      status: { in: ACTIVE_STATUSES },
      startAt: { lt: endAt },
      endAt: { gt: startAt },
      ...(params.excludeReservationId ? { id: { not: params.excludeReservationId } } : {}),
    },
    select: { therapistId: true },
  });
  const busyIds = new Set(busy.map((b) => b.therapistId).filter(Boolean) as string[]);

  return therapists
    .filter((t) => therapistWorksAt(t, params.dateKey, params.startTime, endTime))
    .filter((t) => !busyIds.has(t.id))
    .map((t) => ({
      id: t.id,
      name: t.name,
      photoUrl: t.photoUrl,
      skills: t.skills,
      bio: t.bio,
    }));
}

/**
 * Validasi final di dalam transaksi. Dipanggil tepat sebelum insert/update
 * reservasi sehingga dua permintaan bersamaan tidak bisa merebut slot sama.
 */
export async function assertSlotAvailable(
  db: Db,
  params: {
    dateKey: string;
    startTime: string;
    serviceId: string;
    therapistId?: string | null;
    excludeReservationId?: string | null;
  },
) {
  const settings = await getSettings();
  const service = await db.service.findUnique({ where: { id: params.serviceId } });
  if (!service) throw new AppError('Layanan tidak ditemukan', 404, 'SERVICE_NOT_FOUND');
  if (!service.isActive) throw new AppError('Layanan sedang tidak aktif', 400, 'SERVICE_INACTIVE');

  const endTime = addMinutesToTime(params.startTime, service.durationMinutes);
  const startAt = combineDateTime(params.dateKey, params.startTime);
  const endAt = new Date(startAt.getTime() + service.durationMinutes * 60_000);

  if (!settings.slotTimes.includes(params.startTime)) {
    throw new AppError('Jam yang dipilih bukan slot yang tersedia', 400, 'INVALID_SLOT');
  }
  if (
    timeToMinutes(params.startTime) < timeToMinutes(settings.openHour) ||
    timeToMinutes(endTime) > timeToMinutes(settings.closeHour)
  ) {
    throw new AppError('Jam berada di luar jam operasional', 400, 'OUT_OF_HOURS');
  }

  const overlapping = await db.reservation.findMany({
    where: {
      status: { in: ACTIVE_STATUSES },
      startAt: { lt: endAt },
      endAt: { gt: startAt },
      ...(params.excludeReservationId ? { id: { not: params.excludeReservationId } } : {}),
    },
    select: { therapistId: true, serviceId: true },
  });

  const sameService = overlapping.filter((r) => r.serviceId === service.id).length;
  if (sameService >= service.maxPerSlot) {
    throw new AppError('Slot pada jam tersebut sudah penuh', 409, 'SLOT_FULL');
  }

  const busyIds = new Set(overlapping.map((r) => r.therapistId).filter(Boolean) as string[]);

  if (params.therapistId) {
    const therapist = await db.therapist.findUnique({
      where: { id: params.therapistId },
      include: { schedules: true, timeOffs: true },
    });
    if (!therapist) throw new AppError('Terapis tidak ditemukan', 404, 'THERAPIST_NOT_FOUND');
    if (!therapist.isActive) throw new AppError('Terapis sedang nonaktif', 400, 'THERAPIST_INACTIVE');
    if (!therapistWorksAt(therapist, params.dateKey, params.startTime, endTime)) {
      throw new AppError('Terapis tidak bertugas pada jam tersebut', 409, 'THERAPIST_OFF');
    }
    if (busyIds.has(therapist.id)) {
      throw new AppError('Terapis sudah memiliki jadwal pada jam tersebut', 409, 'THERAPIST_BUSY');
    }
    const dayStart = dateKeyToDate(params.dateKey);
    const dailyCount = await db.reservation.count({
      where: {
        therapistId: therapist.id,
        status: { in: ACTIVE_STATUSES },
        startAt: { gte: dayStart, lt: new Date(dayStart.getTime() + 86_400_000) },
        ...(params.excludeReservationId ? { id: { not: params.excludeReservationId } } : {}),
      },
    });
    if (dailyCount >= therapist.maxDailyBooking) {
      throw new AppError('Kuota harian terapis sudah penuh', 409, 'THERAPIST_QUOTA');
    }
  } else {
    const therapists = await db.therapist.findMany({
      where: { isActive: true },
      include: { schedules: true, timeOffs: true },
    });
    const free = therapists
      .filter((t) => therapistWorksAt(t, params.dateKey, params.startTime, endTime))
      .filter((t) => !busyIds.has(t.id));
    if (free.length === 0) {
      throw new AppError('Tidak ada terapis yang tersedia pada jam tersebut', 409, 'NO_THERAPIST');
    }
  }

  return { service, endTime, startAt, endAt };
}

/** Pilih terapis otomatis dengan beban kerja paling ringan pada hari itu. */
export async function pickTherapistAutomatically(
  db: Db,
  params: { dateKey: string; startTime: string; serviceId: string },
) {
  const candidates = await getAvailableTherapists(params);
  if (candidates.length === 0) return null;
  const dayStart = dateKeyToDate(params.dateKey);
  const counts = await db.reservation.groupBy({
    by: ['therapistId'],
    where: {
      status: { in: ACTIVE_STATUSES },
      startAt: { gte: dayStart, lt: new Date(dayStart.getTime() + 86_400_000) },
    },
    _count: { _all: true },
  });
  const load = new Map(counts.map((c) => [c.therapistId, c._count._all]));
  return candidates.sort((a, b) => (load.get(a.id) ?? 0) - (load.get(b.id) ?? 0))[0];
}
