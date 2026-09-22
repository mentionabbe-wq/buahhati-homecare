import 'server-only';
import { prisma } from '@/lib/prisma';
import { dateKeyToDate, eachDayKey, todayKey, toDateKey, addDaysKey } from '@/lib/datetime';

const COUNTED_REVENUE_STATUSES = ['COMPLETED'];

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;

export async function getDashboardData() {
  const today = todayKey();
  const dayStart = dateKeyToDate(today);
  const dayEnd = new Date(dayStart.getTime() + 86_400_000);

  const monthStartKey = `${today.slice(0, 7)}-01`;
  const monthStart = dateKeyToDate(monthStartKey);
  const monthEnd = new Date(
    Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 1),
  );

  const [todayReservations, monthReservations, totalCustomers, totalBabies, services, therapists] =
    await Promise.all([
      prisma.reservation.findMany({
        where: { date: { gte: dayStart, lt: dayEnd } },
        include: {
          customer: { select: { name: true, phone: true } },
          baby: { select: { name: true } },
          service: { select: { name: true } },
          therapist: { select: { name: true } },
        },
        orderBy: { startTime: 'asc' },
      }),
      prisma.reservation.findMany({
        where: { date: { gte: monthStart, lt: monthEnd } },
        select: {
          id: true,
          date: true,
          status: true,
          total: true,
          serviceId: true,
          therapistId: true,
          customerId: true,
        },
      }),
      prisma.customer.count(),
      prisma.baby.count(),
      prisma.service.findMany({ select: { id: true, name: true } }),
      prisma.therapist.findMany({ select: { id: true, name: true } }),
    ]);

  const countBy = (list: { status: string }[], status: string) =>
    list.filter((r) => r.status === status).length;

  const todayRevenue = todayReservations
    .filter((r) => COUNTED_REVENUE_STATUSES.includes(r.status))
    .reduce((sum, r) => sum + r.total, 0);

  const monthRevenue = monthReservations
    .filter((r) => COUNTED_REVENUE_STATUSES.includes(r.status))
    .reduce((sum, r) => sum + r.total, 0);

  const serviceName = new Map(services.map((s) => [s.id, s.name]));
  const therapistName = new Map(therapists.map((t) => [t.id, t.name]));

  const byService = new Map<string, { count: number; revenue: number }>();
  for (const r of monthReservations) {
    const entry = byService.get(r.serviceId) ?? { count: 0, revenue: 0 };
    entry.count += 1;
    if (COUNTED_REVENUE_STATUSES.includes(r.status)) entry.revenue += r.total;
    byService.set(r.serviceId, entry);
  }

  const byTherapist = new Map<string, { count: number; revenue: number }>();
  for (const r of monthReservations) {
    if (!r.therapistId) continue;
    const entry = byTherapist.get(r.therapistId) ?? { count: 0, revenue: 0 };
    if (r.status === 'COMPLETED') {
      entry.count += 1;
      entry.revenue += r.total;
    }
    byTherapist.set(r.therapistId, entry);
  }

  // deret 14 hari terakhir untuk grafik
  const startKey = addDaysKey(today, -13);
  const days = eachDayKey(startKey, today);
  const rangeReservations = await prisma.reservation.findMany({
    where: { date: { gte: dateKeyToDate(startKey), lt: dayEnd } },
    select: { date: true, status: true, total: true },
  });
  const daily = days.map((key) => {
    const rows = rangeReservations.filter((r) => toDateKey(r.date) === key);
    return {
      date: key,
      label: key.slice(8) + '/' + key.slice(5, 7),
      reservations: rows.length,
      revenue: rows
        .filter((r) => COUNTED_REVENUE_STATUSES.includes(r.status))
        .reduce((sum, r) => sum + r.total, 0),
    };
  });

  return {
    today: {
      total: todayReservations.length,
      pending: countBy(todayReservations, 'PENDING'),
      confirmed: countBy(todayReservations, 'CONFIRMED'),
      inProgress: todayReservations.filter((r) =>
        ['ON_THE_WAY', 'ARRIVED', 'IN_SERVICE'].includes(r.status),
      ).length,
      completed: countBy(todayReservations, 'COMPLETED'),
      revenue: todayRevenue,
      list: todayReservations,
    },
    month: {
      label: monthStartKey,
      reservations: monthReservations.length,
      customers: totalCustomers,
      babies: totalBabies,
      revenue: monthRevenue,
      completed: countBy(monthReservations, 'COMPLETED'),
      cancelled: countBy(monthReservations, 'CANCELLED'),
      uniqueCustomers: new Set(monthReservations.map((r) => r.customerId)).size,
    },
    charts: {
      daily,
      byService: [...byService.entries()]
        .map(([id, v]) => ({ name: serviceName.get(id) ?? 'Lainnya', ...v }))
        .sort((a, b) => b.count - a.count),
      byTherapist: [...byTherapist.entries()]
        .map(([id, v]) => ({ name: therapistName.get(id) ?? 'Lainnya', ...v }))
        .sort((a, b) => b.count - a.count),
    },
  };
}

export async function getTherapistDashboard(therapistId: string) {
  const today = todayKey();
  const dayStart = dateKeyToDate(today);
  const dayEnd = new Date(dayStart.getTime() + 86_400_000);
  const monthStart = dateKeyToDate(`${today.slice(0, 7)}-01`);

  const [todayList, monthCount, completedCount] = await Promise.all([
    prisma.reservation.findMany({
      where: { therapistId, date: { gte: dayStart, lt: dayEnd } },
      include: {
        customer: { select: { name: true, phone: true } },
        baby: { select: { name: true, birthDate: true } },
        service: { select: { name: true, durationMinutes: true } },
      },
      orderBy: { startTime: 'asc' },
    }),
    prisma.reservation.count({ where: { therapistId, date: { gte: monthStart } } }),
    prisma.reservation.count({
      where: { therapistId, status: 'COMPLETED', date: { gte: monthStart } },
    }),
  ]);

  return { todayList, monthCount, completedCount };
}
