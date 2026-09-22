import 'server-only';
import { prisma } from '@/lib/prisma';
import { businessNow, dateKeyToDate, toDateKey } from '@/lib/datetime';
import { getSettings } from './settings.service';
import { notifyReservation } from './whatsapp';

const ACTIVE = ['PENDING', 'CONFIRMED'];

/**
 * Dijalankan berkala (cron/worker).
 * - H-1  : semua reservasi besok yang belum pernah dikirimi reminder harian.
 * - H-2j : reservasi hari ini yang akan dimulai 90–150 menit lagi.
 * Duplikasi dicegah dengan memeriksa tabel Notification.
 */
export async function runReminders() {
  const settings = await getSettings();
  const now = businessNow();
  const results = { h1: 0, h2h: 0, skipped: 0 };

  if (settings.reminderH1) {
    const tomorrow = dateKeyToDate(toDateKey(new Date(now.getTime() + 86_400_000)));
    const list = await prisma.reservation.findMany({
      where: {
        status: { in: ACTIVE },
        date: { gte: tomorrow, lt: new Date(tomorrow.getTime() + 86_400_000) },
      },
      select: { id: true },
    });
    for (const item of list) {
      const exists = await prisma.notification.count({
        where: { reservationId: item.id, template: 'REMINDER_H1' },
      });
      if (exists > 0) {
        results.skipped += 1;
        continue;
      }
      await notifyReservation(item.id, 'REMINDER_H1').catch(() => undefined);
      results.h1 += 1;
    }
  }

  if (settings.reminderH2h) {
    const from = new Date(now.getTime() + 90 * 60_000);
    const to = new Date(now.getTime() + 150 * 60_000);
    const list = await prisma.reservation.findMany({
      where: { status: { in: ACTIVE }, startAt: { gte: from, lte: to } },
      select: { id: true },
    });
    for (const item of list) {
      const exists = await prisma.notification.count({
        where: { reservationId: item.id, template: 'REMINDER_H2H' },
      });
      if (exists > 0) {
        results.skipped += 1;
        continue;
      }
      await notifyReservation(item.id, 'REMINDER_H2H').catch(() => undefined);
      results.h2h += 1;
    }
  }

  return results;
}
