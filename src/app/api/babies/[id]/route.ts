import { prisma } from '@/lib/prisma';
import { AppError, assertSameOrigin, handleApiError, ok, readJson } from '@/lib/api';
import { getSession } from '@/lib/auth';
import { ForbiddenError, UnauthorizedError } from '@/lib/rbac';
import { babySchema } from '@/lib/validation';
import { dateKeyToDate } from '@/lib/datetime';
import { recordAudit } from '@/lib/audit';

type Params = { params: Promise<{ id: string }> };

/** Terapis hanya boleh membaca profil bayi yang sedang/pernah ia tangani. */
async function assertCanRead(id: string) {
  const session = await getSession();
  if (!session) throw new UnauthorizedError();
  const baby = await prisma.baby.findUnique({ where: { id }, select: { customerId: true } });
  if (!baby) throw new AppError('Data bayi tidak ditemukan', 404);

  if (session.role === 'ADMIN') return session;
  if (session.role === 'CUSTOMER') {
    if (session.customerId !== baby.customerId) throw new ForbiddenError();
    return session;
  }
  const assigned = await prisma.reservation.count({
    where: { babyId: id, therapistId: session.therapistId ?? '__none__' },
  });
  if (assigned === 0) throw new ForbiddenError();
  return session;
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    await assertCanRead(id);
    const baby = await prisma.baby.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        reservations: {
          include: { service: true, therapist: { select: { name: true } }, treatment: true },
          orderBy: { date: 'desc' },
        },
      },
    });
    return ok(baby);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    assertSameOrigin(request);
    const { id } = await params;
    const session = await assertCanRead(id);
    if (session.role === 'THERAPIST') throw new ForbiddenError();

    const before = await prisma.baby.findUnique({ where: { id } });
    const body = babySchema.partial().parse(await readJson(request));
    const baby = await prisma.baby.update({
      where: { id },
      data: {
        name: body.name,
        birthDate: body.birthDate ? dateKeyToDate(body.birthDate) : undefined,
        gender: body.gender,
        weightKg: body.weightKg ?? undefined,
        notes: body.notes ?? undefined,
        allergies: body.allergies ?? undefined,
        isActive: body.isActive,
      },
    });
    await recordAudit({
      actor: session,
      action: 'baby.update',
      entity: 'Baby',
      entityId: id,
      before,
      after: baby,
    });
    return ok(baby);
  } catch (error) {
    return handleApiError(error);
  }
}
