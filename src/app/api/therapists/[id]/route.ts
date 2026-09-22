import { prisma } from '@/lib/prisma';
import { AppError, assertSameOrigin, handleApiError, ok, readJson } from '@/lib/api';
import { requireAuth } from '@/lib/rbac';
import { therapistSchema } from '@/lib/validation';
import { normalizePhone } from '@/lib/utils';
import { recordAudit } from '@/lib/audit';
import { dateKeyToDate } from '@/lib/datetime';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    await requireAuth(['ADMIN']);
    const { id } = await params;
    const therapist = await prisma.therapist.findUnique({
      where: { id },
      include: { schedules: { orderBy: { dayOfWeek: 'asc' } }, timeOffs: { orderBy: { date: 'asc' } } },
    });
    if (!therapist) throw new AppError('Terapis tidak ditemukan', 404);
    return ok(therapist);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    assertSameOrigin(request);
    const actor = await requireAuth(['ADMIN']);
    const { id } = await params;
    const before = await prisma.therapist.findUnique({ where: { id } });
    if (!before) throw new AppError('Terapis tidak ditemukan', 404);

    const raw = await readJson(request);
    const body = therapistSchema.partial().parse(raw);
    const timeOffs = Array.isArray((raw as { timeOffs?: unknown }).timeOffs)
      ? ((raw as { timeOffs: { date: string; reason?: string }[] }).timeOffs)
      : null;

    const therapist = await prisma.$transaction(async (tx) => {
      await tx.therapist.update({
        where: { id },
        data: {
          name: body.name,
          phone: body.phone ? normalizePhone(body.phone) : undefined,
          email: body.email ?? undefined,
          photoUrl: body.photoUrl ?? undefined,
          bio: body.bio ?? undefined,
          skills: body.skills ?? undefined,
          serviceAreas: body.serviceAreas ?? undefined,
          isActive: body.isActive,
          commissionType: body.commissionType,
          commissionValue: body.commissionValue,
          maxDailyBooking: body.maxDailyBooking,
        },
      });

      if (body.schedules) {
        await tx.therapistSchedule.deleteMany({ where: { therapistId: id } });
        await tx.therapistSchedule.createMany({
          data: body.schedules.map((s) => ({ ...s, therapistId: id })),
        });
      }

      if (timeOffs) {
        await tx.therapistTimeOff.deleteMany({ where: { therapistId: id } });
        for (const off of timeOffs) {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(off.date)) continue;
          await tx.therapistTimeOff.create({
            data: { therapistId: id, date: dateKeyToDate(off.date), reason: off.reason ?? null },
          });
        }
      }

      return tx.therapist.findUnique({
        where: { id },
        include: { schedules: { orderBy: { dayOfWeek: 'asc' } }, timeOffs: true },
      });
    });

    await recordAudit({
      actor,
      action: 'therapist.update',
      entity: 'Therapist',
      entityId: id,
      before,
      after: therapist,
    });
    return ok(therapist);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    assertSameOrigin(request);
    const actor = await requireAuth(['ADMIN']);
    const { id } = await params;
    const used = await prisma.reservation.count({ where: { therapistId: id } });

    if (used > 0) {
      await prisma.therapist.update({ where: { id }, data: { isActive: false } });
      await recordAudit({ actor, action: 'therapist.deactivate', entity: 'Therapist', entityId: id });
      return ok({ deactivated: true });
    }
    await prisma.therapist.delete({ where: { id } });
    await recordAudit({ actor, action: 'therapist.delete', entity: 'Therapist', entityId: id });
    return ok({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
