import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { assertSameOrigin, handleApiError, ok, readJson, searchParamsOf } from '@/lib/api';
import { getSession } from '@/lib/auth';
import { ForbiddenError, UnauthorizedError } from '@/lib/rbac';
import { babySchema } from '@/lib/validation';
import { dateKeyToDate } from '@/lib/datetime';
import { recordAudit } from '@/lib/audit';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw new UnauthorizedError();
    const params = searchParamsOf(request);
    const q = params.get('q')?.trim();
    const customerId = params.get('customerId');

    const where: Prisma.BabyWhereInput = {};
    if (session.role === 'CUSTOMER') where.customerId = session.customerId ?? '__none__';
    else if (customerId) where.customerId = customerId;
    if (session.role === 'THERAPIST') throw new ForbiddenError();
    if (q) where.name = { contains: q };

    const babies = await prisma.baby.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        _count: { select: { reservations: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return ok(babies);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await getSession();
    if (!session) throw new UnauthorizedError();
    const body = babySchema.parse(await readJson(request));

    if (session.role === 'CUSTOMER' && session.customerId !== body.customerId) {
      throw new ForbiddenError();
    }
    if (session.role === 'THERAPIST') throw new ForbiddenError();

    const baby = await prisma.baby.create({
      data: {
        customerId: body.customerId,
        name: body.name,
        birthDate: dateKeyToDate(body.birthDate),
        gender: body.gender,
        weightKg: body.weightKg ?? null,
        notes: body.notes ?? null,
        allergies: body.allergies ?? null,
        isActive: body.isActive,
      },
    });
    await recordAudit({
      actor: session,
      action: 'baby.create',
      entity: 'Baby',
      entityId: baby.id,
      after: { name: baby.name },
    });
    return ok(baby, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
