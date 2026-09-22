import { prisma } from '@/lib/prisma';
import { AppError, assertSameOrigin, handleApiError, ok, readJson } from '@/lib/api';
import { getSession } from '@/lib/auth';
import { ForbiddenError, UnauthorizedError } from '@/lib/rbac';
import { treatmentSchema } from '@/lib/validation';
import { recordAudit } from '@/lib/audit';
import { changeStatus } from '@/services/reservation.service';

/**
 * Catatan treatment diisi terapis setelah layanan selesai.
 * Setiap perubahan tercatat di AuditLog (before/after) sebagai jejak audit.
 */
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await getSession();
    if (!session) throw new UnauthorizedError();
    if (session.role === 'CUSTOMER') throw new ForbiddenError();

    const body = treatmentSchema.parse(await readJson(request));
    const reservation = await prisma.reservation.findUnique({
      where: { id: body.reservationId },
      include: { treatment: true },
    });
    if (!reservation) throw new AppError('Reservasi tidak ditemukan', 404);
    if (session.role === 'THERAPIST' && reservation.therapistId !== session.therapistId) {
      throw new ForbiddenError();
    }
    if (!reservation.therapistId) throw new AppError('Reservasi belum memiliki terapis', 400);

    const data = {
      conditionBefore: body.conditionBefore ?? null,
      conditionDuring: body.conditionDuring ?? null,
      conditionAfter: body.conditionAfter ?? null,
      treatmentAreas: JSON.stringify(body.treatmentAreas ?? []),
      durationMinutes: body.durationMinutes,
      babyResponse: body.babyResponse ?? null,
      notes: body.notes ?? null,
      recommendation: body.recommendation ?? null,
      signatureName: body.signatureName ?? null,
      signedAt: body.signatureName ? new Date() : null,
    };

    const treatment = await prisma.treatment.upsert({
      where: { reservationId: reservation.id },
      update: data,
      create: {
        ...data,
        reservationId: reservation.id,
        therapistId: reservation.therapistId,
        babyId: reservation.babyId,
      },
    });

    await recordAudit({
      actor: session,
      action: reservation.treatment ? 'treatment.update' : 'treatment.create',
      entity: 'Treatment',
      entityId: treatment.id,
      before: reservation.treatment,
      after: treatment,
    });

    // menutup kunjungan sekaligus saat catatan pertama disimpan
    if (reservation.status === 'IN_SERVICE') {
      await changeStatus({
        reservationId: reservation.id,
        status: 'COMPLETED',
        actor: session,
        note: 'Catatan treatment disimpan',
      }).catch(() => undefined);
    }

    return ok(treatment, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
