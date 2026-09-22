import { prisma } from '@/lib/prisma';
import { AppError, assertSameOrigin, handleApiError, ok, readJson, searchParamsOf } from '@/lib/api';
import { getSession } from '@/lib/auth';
import { requireAuth } from '@/lib/rbac';
import { promoSchema } from '@/lib/validation';
import { dateKeyToDate, todayKey } from '@/lib/datetime';
import { recordAudit } from '@/lib/audit';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    const params = searchParamsOf(request);

    // publik hanya melihat promo yang sedang aktif
    if (session?.role !== 'ADMIN' || params.get('public') === '1') {
      const today = dateKeyToDate(todayKey());
      const promos = await prisma.promo.findMany({
        where: { isActive: true, startDate: { lte: today }, endDate: { gte: today } },
        select: {
          id: true,
          code: true,
          name: true,
          description: true,
          discountType: true,
          discountValue: true,
          minTransaction: true,
          maxDiscount: true,
          endDate: true,
        },
        orderBy: { endDate: 'asc' },
      });
      return ok(promos);
    }

    const promos = await prisma.promo.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { reservations: true } } },
    });
    return ok(promos);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const actor = await requireAuth(['ADMIN']);
    const body = promoSchema.parse(await readJson(request));
    const code = body.code.toUpperCase();

    const existing = await prisma.promo.findUnique({ where: { code } });
    if (existing) throw new AppError('Kode promo sudah digunakan', 409, 'CODE_TAKEN');

    const promo = await prisma.promo.create({
      data: {
        ...body,
        code,
        startDate: dateKeyToDate(body.startDate),
        endDate: dateKeyToDate(body.endDate),
        serviceIds: body.serviceIds?.length ? JSON.stringify(body.serviceIds) : null,
      },
    });
    await recordAudit({ actor, action: 'promo.create', entity: 'Promo', entityId: promo.id, after: promo });
    return ok(promo, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
