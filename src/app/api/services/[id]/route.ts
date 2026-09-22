import { prisma } from '@/lib/prisma';
import { AppError, assertSameOrigin, handleApiError, ok, readJson } from '@/lib/api';
import { requireAuth } from '@/lib/rbac';
import { serviceSchema } from '@/lib/validation';
import { recordAudit } from '@/lib/audit';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const service = await prisma.service.findUnique({ where: { id } });
    if (!service) throw new AppError('Layanan tidak ditemukan', 404);
    return ok(service);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    assertSameOrigin(request);
    const actor = await requireAuth(['ADMIN']);
    const { id } = await params;
    const before = await prisma.service.findUnique({ where: { id } });
    if (!before) throw new AppError('Layanan tidak ditemukan', 404);

    const body = serviceSchema.partial().parse(await readJson(request));
    const service = await prisma.service.update({ where: { id }, data: body });
    await recordAudit({
      actor,
      action: 'service.update',
      entity: 'Service',
      entityId: id,
      before,
      after: service,
    });
    return ok(service);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    assertSameOrigin(request);
    const actor = await requireAuth(['ADMIN']);
    const { id } = await params;
    const used = await prisma.reservation.count({ where: { serviceId: id } });

    // layanan yang pernah dipakai hanya dinonaktifkan agar riwayat tetap utuh
    if (used > 0) {
      const service = await prisma.service.update({ where: { id }, data: { isActive: false } });
      await recordAudit({ actor, action: 'service.deactivate', entity: 'Service', entityId: id });
      return ok({ service, deactivated: true });
    }

    await prisma.service.delete({ where: { id } });
    await recordAudit({ actor, action: 'service.delete', entity: 'Service', entityId: id });
    return ok({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
