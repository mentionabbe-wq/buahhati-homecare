import { prisma } from '@/lib/prisma';
import { AppError, assertSameOrigin, handleApiError, ok, readJson } from '@/lib/api';
import { requireAuth } from '@/lib/rbac';
import { promoSchema } from '@/lib/validation';
import { dateKeyToDate } from '@/lib/datetime';
import { recordAudit } from '@/lib/audit';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    assertSameOrigin(request);
    const actor = await requireAuth(['ADMIN']);
    const { id } = await params;
    const before = await prisma.promo.findUnique({ where: { id } });
    if (!before) throw new AppError('Promo tidak ditemukan', 404);

    const body = await readJson(request);
    const parsed = promoSchema.parse({
      code: (body as Record<string, string>).code ?? before.code,
      name: (body as Record<string, string>).name ?? before.name,
      description: (body as Record<string, string>).description ?? before.description,
      discountType: (body as Record<string, string>).discountType ?? before.discountType,
      discountValue: (body as Record<string, number>).discountValue ?? before.discountValue,
      minTransaction: (body as Record<string, number>).minTransaction ?? before.minTransaction,
      maxDiscount: (body as Record<string, number>).maxDiscount ?? before.maxDiscount,
      startDate:
        (body as Record<string, string>).startDate ?? before.startDate.toISOString().slice(0, 10),
      endDate: (body as Record<string, string>).endDate ?? before.endDate.toISOString().slice(0, 10),
      quota: (body as Record<string, number>).quota ?? before.quota,
      isActive: (body as Record<string, boolean>).isActive ?? before.isActive,
      serviceIds: (body as Record<string, string[]>).serviceIds,
    });

    const promo = await prisma.promo.update({
      where: { id },
      data: {
        ...parsed,
        code: parsed.code.toUpperCase(),
        startDate: dateKeyToDate(parsed.startDate),
        endDate: dateKeyToDate(parsed.endDate),
        serviceIds: parsed.serviceIds?.length ? JSON.stringify(parsed.serviceIds) : null,
      },
    });
    await recordAudit({
      actor,
      action: 'promo.update',
      entity: 'Promo',
      entityId: id,
      before,
      after: promo,
    });
    return ok(promo);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    assertSameOrigin(request);
    const actor = await requireAuth(['ADMIN']);
    const { id } = await params;
    const used = await prisma.reservation.count({ where: { promoId: id } });
    if (used > 0) {
      await prisma.promo.update({ where: { id }, data: { isActive: false } });
      await recordAudit({ actor, action: 'promo.deactivate', entity: 'Promo', entityId: id });
      return ok({ deactivated: true });
    }
    await prisma.promo.delete({ where: { id } });
    await recordAudit({ actor, action: 'promo.delete', entity: 'Promo', entityId: id });
    return ok({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
