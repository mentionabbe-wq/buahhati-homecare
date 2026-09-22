import { prisma } from '@/lib/prisma';
import { AppError, assertSameOrigin, handleApiError, ok, readJson } from '@/lib/api';
import { getSession } from '@/lib/auth';
import { canReadReservation, ForbiddenError, requireAuth, UnauthorizedError } from '@/lib/rbac';
import { updateReservationSchema } from '@/lib/validation';
import { recordAudit } from '@/lib/audit';
import {
  assertCustomerCanModify,
  changeStatus,
  rescheduleReservation,
} from '@/services/reservation.service';
import type { ReservationStatus } from '@/lib/constants';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) throw new UnauthorizedError();
    const { id } = await params;

    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: {
        customer: true,
        baby: true,
        service: true,
        therapist: true,
        payments: { orderBy: { createdAt: 'desc' } },
        statusHistory: { orderBy: { createdAt: 'asc' } },
        treatment: true,
        promo: { select: { code: true, name: true } },
      },
    });
    if (!reservation) throw new AppError('Reservasi tidak ditemukan', 404);
    if (!canReadReservation(session, reservation)) throw new ForbiddenError();

    return ok(reservation);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    assertSameOrigin(request);
    const session = await getSession();
    if (!session) throw new UnauthorizedError();
    const { id } = await params;

    const current = await prisma.reservation.findUnique({ where: { id } });
    if (!current) throw new AppError('Reservasi tidak ditemukan', 404);
    if (!canReadReservation(session, current)) throw new ForbiddenError();

    const body = updateReservationSchema.parse(await readJson(request));

    // Customer hanya boleh reschedule/batal dalam tenggat kebijakan
    if (session.role === 'CUSTOMER') {
      await assertCustomerCanModify(current);
      const allowedKeys = ['date', 'startTime', 'status', 'therapistId'];
      const illegal = Object.keys(body).filter((key) => !allowedKeys.includes(key));
      if (illegal.length) throw new ForbiddenError('Perubahan tersebut hanya dapat dilakukan admin.');
      if (body.status && body.status !== 'CANCELLED') {
        throw new ForbiddenError('Anda hanya dapat membatalkan reservasi.');
      }
    }

    // Terapis hanya boleh menggerakkan status kunjungan miliknya
    if (session.role === 'THERAPIST') {
      const allowed: ReservationStatus[] = ['ON_THE_WAY', 'ARRIVED', 'IN_SERVICE', 'COMPLETED'];
      if (!body.status || !allowed.includes(body.status)) {
        throw new ForbiddenError('Terapis hanya dapat memperbarui status kunjungan.');
      }
    }

    let result = current;

    if (body.date || body.startTime || body.therapistId !== undefined) {
      if (session.role === 'THERAPIST') throw new ForbiddenError();
      result = await rescheduleReservation({
        reservationId: id,
        dateKey: body.date,
        startTime: body.startTime,
        therapistId: body.therapistId,
        actor: session,
      });
    }

    const scalarPatch = {
      address: body.address,
      district: body.district,
      village: body.village,
      landmark: body.landmark,
      locationNote: body.locationNote,
      mapsUrl: body.mapsUrl,
      transportFee: body.transportFee,
      discount: body.discount,
      adminNote: body.adminNote,
      paymentStatus: body.paymentStatus,
    };
    const hasScalar = Object.values(scalarPatch).some((value) => value !== undefined);
    if (hasScalar) {
      await requireAuth(['ADMIN']);
      const recalcTotal =
        body.transportFee !== undefined || body.discount !== undefined
          ? Math.max(
              0,
              result.servicePrice +
                (body.transportFee ?? result.transportFee) -
                (body.discount ?? result.discount),
            )
          : undefined;
      result = await prisma.reservation.update({
        where: { id },
        data: { ...scalarPatch, ...(recalcTotal !== undefined ? { total: recalcTotal } : {}) },
      });
      await recordAudit({
        actor: session,
        action: 'reservation.update',
        entity: 'Reservation',
        entityId: id,
        before: current,
        after: result,
      });
    }

    if (body.status) {
      result = await changeStatus({
        reservationId: id,
        status: body.status,
        actor: session,
        reason: body.cancelReason ?? null,
      });
    }

    return ok(result);
  } catch (error) {
    return handleApiError(error);
  }
}

/** DELETE = pembatalan (soft). Data reservasi tetap disimpan untuk laporan. */
export async function DELETE(request: Request, { params }: Params) {
  try {
    assertSameOrigin(request);
    const session = await getSession();
    if (!session) throw new UnauthorizedError();
    const { id } = await params;

    const current = await prisma.reservation.findUnique({ where: { id } });
    if (!current) throw new AppError('Reservasi tidak ditemukan', 404);
    if (!canReadReservation(session, current)) throw new ForbiddenError();
    if (session.role === 'CUSTOMER') await assertCustomerCanModify(current);
    if (session.role === 'THERAPIST') throw new ForbiddenError();

    const url = new URL(request.url);
    const reason = url.searchParams.get('reason') ?? 'Dibatalkan';
    const result = await changeStatus({
      reservationId: id,
      status: 'CANCELLED',
      actor: session,
      reason,
    });
    return ok(result);
  } catch (error) {
    return handleApiError(error);
  }
}
