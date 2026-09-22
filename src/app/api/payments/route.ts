import { prisma } from '@/lib/prisma';
import { assertSameOrigin, handleApiError, ok, readJson, searchParamsOf } from '@/lib/api';
import { getSession } from '@/lib/auth';
import { ForbiddenError, requireAuth, UnauthorizedError } from '@/lib/rbac';
import { paymentSchema } from '@/lib/validation';
import { createPayment } from '@/services/payment.service';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw new UnauthorizedError();
    const params = searchParamsOf(request);
    const reservationId = params.get('reservationId');

    if (session.role !== 'ADMIN' && !reservationId) throw new ForbiddenError();
    if (reservationId && session.role === 'CUSTOMER') {
      const owned = await prisma.reservation.findFirst({
        where: { id: reservationId, customerId: session.customerId ?? '__none__' },
        select: { id: true },
      });
      if (!owned) throw new ForbiddenError();
    }

    const status = params.get('status');
    const payments = await prisma.payment.findMany({
      where: {
        ...(reservationId ? { reservationId } : {}),
        ...(status && status !== 'ALL' ? { status } : {}),
      },
      include: {
        reservation: {
          select: {
            reservationCode: true,
            total: true,
            customer: { select: { name: true, phone: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return ok(payments);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const actor = await requireAuth(['ADMIN']);
    const body = paymentSchema.parse(await readJson(request));
    const result = await createPayment({ ...body, actor });
    return ok(result, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
