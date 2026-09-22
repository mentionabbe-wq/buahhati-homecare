import { prisma } from '@/lib/prisma';
import { AppError, assertSameOrigin, handleApiError, ok, readJson } from '@/lib/api';
import { getSession } from '@/lib/auth';
import { ForbiddenError, requireAuth, UnauthorizedError } from '@/lib/rbac';
import { customerSchema } from '@/lib/validation';
import { normalizePhone } from '@/lib/utils';
import { recordAudit } from '@/lib/audit';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) throw new UnauthorizedError();
    const { id } = await params;

    // pelanggan hanya boleh melihat datanya sendiri
    if (session.role === 'CUSTOMER' && session.customerId !== id) throw new ForbiddenError();
    if (session.role === 'THERAPIST') throw new ForbiddenError();

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        babies: { orderBy: { createdAt: 'asc' } },
        reservations: {
          include: { service: true, therapist: { select: { name: true } }, baby: { select: { name: true } } },
          orderBy: { date: 'desc' },
          take: 50,
        },
      },
    });
    if (!customer) throw new AppError('Pelanggan tidak ditemukan', 404);
    return ok(customer);
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
    if (session.role === 'CUSTOMER' && session.customerId !== id) throw new ForbiddenError();
    if (session.role === 'THERAPIST') throw new ForbiddenError();

    const before = await prisma.customer.findUnique({ where: { id } });
    if (!before) throw new AppError('Pelanggan tidak ditemukan', 404);

    const body = customerSchema.partial().parse(await readJson(request));
    const customer = await prisma.customer.update({
      where: { id },
      data: {
        ...body,
        phone: body.phone ? normalizePhone(body.phone) : undefined,
        email: body.email ?? undefined,
      },
    });
    await recordAudit({
      actor: session,
      action: 'customer.update',
      entity: 'Customer',
      entityId: id,
      before,
      after: customer,
    });
    return ok(customer);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    assertSameOrigin(request);
    const actor = await requireAuth(['ADMIN']);
    const { id } = await params;
    const used = await prisma.reservation.count({ where: { customerId: id } });
    if (used > 0) {
      throw new AppError(
        'Pelanggan memiliki riwayat reservasi dan tidak dapat dihapus.',
        409,
        'HAS_HISTORY',
      );
    }
    await prisma.customer.delete({ where: { id } });
    await recordAudit({ actor, action: 'customer.delete', entity: 'Customer', entityId: id });
    return ok({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
