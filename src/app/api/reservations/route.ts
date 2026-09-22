import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { assertSameOrigin, handleApiError, ok, readJson, searchParamsOf } from '@/lib/api';
import { clientIp, getSession } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { UnauthorizedError } from '@/lib/rbac';
import { createReservationSchema } from '@/lib/validation';
import { dateKeyToDate } from '@/lib/datetime';
import { createReservation } from '@/services/reservation.service';

const RESERVATION_INCLUDE = {
  customer: { select: { id: true, name: true, phone: true } },
  baby: { select: { id: true, name: true, birthDate: true, gender: true } },
  service: { select: { id: true, name: true, durationMinutes: true } },
  therapist: { select: { id: true, name: true, phone: true } },
} satisfies Prisma.ReservationInclude;

/** GET /api/reservations — daftar reservasi sesuai hak akses pemanggil. */
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw new UnauthorizedError();
    const params = searchParamsOf(request);

    const where: Prisma.ReservationWhereInput = {};
    if (session.role === 'CUSTOMER') where.customerId = session.customerId ?? '__none__';
    if (session.role === 'THERAPIST') where.therapistId = session.therapistId ?? '__none__';

    const status = params.get('status');
    if (status && status !== 'ALL') where.status = status;
    const paymentStatus = params.get('paymentStatus');
    if (paymentStatus && paymentStatus !== 'ALL') where.paymentStatus = paymentStatus;

    if (session.role === 'ADMIN') {
      const therapistId = params.get('therapistId');
      if (therapistId && therapistId !== 'ALL') where.therapistId = therapistId;
    }
    const serviceId = params.get('serviceId');
    if (serviceId && serviceId !== 'ALL') where.serviceId = serviceId;

    const from = params.get('from');
    const to = params.get('to');
    if (from || to) {
      where.date = {
        ...(from ? { gte: dateKeyToDate(from) } : {}),
        ...(to ? { lt: new Date(dateKeyToDate(to).getTime() + 86_400_000) } : {}),
      };
    }

    const q = params.get('q')?.trim();
    if (q) {
      where.OR = [
        { reservationCode: { contains: q } },
        { customer: { name: { contains: q } } },
        { customer: { phone: { contains: q } } },
        { baby: { name: { contains: q } } },
      ];
    }

    const page = Math.max(1, Number(params.get('page') ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(params.get('pageSize') ?? 20)));

    const [items, total] = await Promise.all([
      prisma.reservation.findMany({
        where,
        include: RESERVATION_INCLUDE,
        orderBy: [{ date: 'desc' }, { startTime: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.reservation.count({ where }),
    ]);

    return ok({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) || 1 });
  } catch (error) {
    return handleApiError(error);
  }
}

/** POST /api/reservations — dapat dipanggil tanpa login (reservasi tamu). */
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const ip = (await clientIp()) ?? 'local';
    rateLimit(`reservation:${ip}`, 10, 10 * 60_000);

    const session = await getSession();
    const body = createReservationSchema.parse(await readJson(request));
    const reservation = await createReservation(body, session);

    return ok(
      {
        id: reservation.id,
        reservationCode: reservation.reservationCode,
        status: reservation.status,
        needsReview: reservation.needsReview,
        total: reservation.total,
        therapist: reservation.therapist?.name ?? null,
        date: reservation.date,
        startTime: reservation.startTime,
      },
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
