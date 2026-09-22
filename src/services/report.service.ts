import 'server-only';
import { prisma } from '@/lib/prisma';
import { dateKeyToDate, toDateKey, eachDayKey } from '@/lib/datetime';

export type ReportRange = { from: string; to: string };

function rangeFilter(range: ReportRange) {
  return {
    gte: dateKeyToDate(range.from),
    lt: new Date(dateKeyToDate(range.to).getTime() + 86_400_000),
  };
}

export async function reservationReport(range: ReportRange) {
  const rows = await prisma.reservation.findMany({
    where: { date: rangeFilter(range) },
    include: {
      customer: { select: { name: true, phone: true } },
      baby: { select: { name: true } },
      service: { select: { name: true } },
      therapist: { select: { name: true } },
    },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
  });

  const summary = {
    total: rows.length,
    completed: rows.filter((r) => r.status === 'COMPLETED').length,
    cancelled: rows.filter((r) => r.status === 'CANCELLED').length,
    noShow: rows.filter((r) => r.status === 'NO_SHOW').length,
    pending: rows.filter((r) => r.status === 'PENDING').length,
  };

  return { rows, summary };
}

export async function revenueReport(range: ReportRange) {
  const rows = await prisma.reservation.findMany({
    where: { date: rangeFilter(range), status: 'COMPLETED' },
    select: {
      date: true,
      reservationCode: true,
      servicePrice: true,
      transportFee: true,
      discount: true,
      total: true,
      paymentStatus: true,
      service: { select: { name: true } },
    },
    orderBy: { date: 'asc' },
  });

  const gross = rows.reduce((s, r) => s + r.servicePrice, 0);
  const transport = rows.reduce((s, r) => s + r.transportFee, 0);
  const discount = rows.reduce((s, r) => s + r.discount, 0);
  const net = rows.reduce((s, r) => s + r.total, 0);
  const paid = rows.filter((r) => r.paymentStatus === 'PAID').reduce((s, r) => s + r.total, 0);

  const daily = eachDayKey(range.from, range.to).map((key) => {
    const day = rows.filter((r) => toDateKey(r.date) === key);
    return {
      date: key,
      label: `${key.slice(8)}/${key.slice(5, 7)}`,
      count: day.length,
      revenue: day.reduce((s, r) => s + r.total, 0),
    };
  });

  return {
    rows,
    summary: { gross, transport, discount, net, paid, outstanding: net - paid, count: rows.length },
    daily,
  };
}

export async function therapistReport(range: ReportRange) {
  const therapists = await prisma.therapist.findMany({ orderBy: { name: 'asc' } });
  const rows = await prisma.reservation.findMany({
    where: { date: rangeFilter(range), status: 'COMPLETED' },
    select: { therapistId: true, total: true, servicePrice: true },
  });

  return therapists.map((t) => {
    const own = rows.filter((r) => r.therapistId === t.id);
    const revenue = own.reduce((s, r) => s + r.total, 0);
    const serviceRevenue = own.reduce((s, r) => s + r.servicePrice, 0);
    const commission =
      t.commissionType === 'PERCENT'
        ? Math.round((serviceRevenue * t.commissionValue) / 100)
        : Math.round(t.commissionValue * own.length);
    return {
      id: t.id,
      name: t.name,
      treatments: own.length,
      revenue,
      commissionType: t.commissionType,
      commissionValue: t.commissionValue,
      commission,
    };
  });
}

export async function serviceReport(range: ReportRange) {
  const services = await prisma.service.findMany({ orderBy: { sortOrder: 'asc' } });
  const rows = await prisma.reservation.findMany({
    where: { date: rangeFilter(range) },
    select: { serviceId: true, total: true, status: true },
  });
  const totalBookings = rows.length || 1;

  return services.map((s) => {
    const own = rows.filter((r) => r.serviceId === s.id);
    const completed = own.filter((r) => r.status === 'COMPLETED');
    return {
      id: s.id,
      name: s.name,
      price: s.price,
      bookings: own.length,
      completed: completed.length,
      revenue: completed.reduce((sum, r) => sum + r.total, 0),
      share: Math.round((own.length / totalBookings) * 1000) / 10,
    };
  });
}

export type ReportKind = 'reservasi' | 'pendapatan' | 'terapis' | 'layanan';

/** Bentuk tabular seragam untuk semua jenis laporan — dipakai oleh exporter. */
export async function buildReportTable(kind: ReportKind, range: ReportRange) {
  if (kind === 'reservasi') {
    const { rows } = await reservationReport(range);
    return {
      title: 'Laporan Reservasi',
      headers: ['Kode', 'Tanggal', 'Jam', 'Pelanggan', 'Bayi', 'Layanan', 'Terapis', 'Status', 'Bayar', 'Total'],
      body: rows.map((r) => [
        r.reservationCode,
        toDateKey(r.date),
        r.startTime,
        r.customer.name,
        r.baby.name,
        r.service.name,
        r.therapist?.name ?? '-',
        r.status,
        r.paymentStatus,
        r.total,
      ]),
    };
  }
  if (kind === 'pendapatan') {
    const { rows } = await revenueReport(range);
    return {
      title: 'Laporan Pendapatan',
      headers: ['Kode', 'Tanggal', 'Layanan', 'Harga Layanan', 'Transport', 'Diskon', 'Total', 'Status Bayar'],
      body: rows.map((r) => [
        r.reservationCode,
        toDateKey(r.date),
        r.service.name,
        r.servicePrice,
        r.transportFee,
        r.discount,
        r.total,
        r.paymentStatus,
      ]),
    };
  }
  if (kind === 'terapis') {
    const rows = await therapistReport(range);
    return {
      title: 'Laporan Terapis',
      headers: ['Terapis', 'Jumlah Treatment', 'Revenue', 'Skema Komisi', 'Nilai', 'Komisi'],
      body: rows.map((r) => [
        r.name,
        r.treatments,
        r.revenue,
        r.commissionType,
        r.commissionValue,
        r.commission,
      ]),
    };
  }
  const rows = await serviceReport(range);
  return {
    title: 'Laporan Layanan',
    headers: ['Layanan', 'Harga', 'Booking', 'Selesai', 'Revenue', 'Porsi (%)'],
    body: rows.map((r) => [r.name, r.price, r.bookings, r.completed, r.revenue, r.share]),
  };
}

export function toCsv(headers: string[], body: (string | number)[][]) {
  const escape = (value: string | number) => {
    const text = String(value ?? '');
    return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [headers.map(escape).join(';'), ...body.map((row) => row.map(escape).join(';'))].join('\r\n');
}
