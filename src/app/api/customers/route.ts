import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { AppError, assertSameOrigin, handleApiError, ok, readJson, searchParamsOf } from '@/lib/api';
import { requireAuth } from '@/lib/rbac';
import { customerSchema } from '@/lib/validation';
import { normalizePhone } from '@/lib/utils';
import { recordAudit } from '@/lib/audit';

export async function GET(request: Request) {
  try {
    await requireAuth(['ADMIN']);
    const params = searchParamsOf(request);
    const q = params.get('q')?.trim();

    const where: Prisma.CustomerWhereInput = q
      ? { OR: [{ name: { contains: q } }, { phone: { contains: q } }, { email: { contains: q } }] }
      : {};

    const customers = await prisma.customer.findMany({
      where,
      include: {
        babies: { select: { id: true, name: true, birthDate: true } },
        _count: { select: { reservations: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return ok(customers);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const actor = await requireAuth(['ADMIN']);
    const body = customerSchema.parse(await readJson(request));
    const phone = normalizePhone(body.phone);

    const existing = await prisma.customer.findUnique({ where: { phone } });
    if (existing) throw new AppError('Nomor WhatsApp sudah terdaftar', 409, 'PHONE_TAKEN');

    const customer = await prisma.customer.create({
      data: { ...body, phone, email: body.email || null },
    });
    await recordAudit({
      actor,
      action: 'customer.create',
      entity: 'Customer',
      entityId: customer.id,
      after: customer,
    });
    return ok(customer, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
