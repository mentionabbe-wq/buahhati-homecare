import { prisma } from '@/lib/prisma';
import { assertSameOrigin, handleApiError, ok, readJson, searchParamsOf } from '@/lib/api';
import { requireAuth } from '@/lib/rbac';
import { therapistSchema } from '@/lib/validation';
import { getAvailableTherapists } from '@/services/availability.service';
import { hashPassword } from '@/lib/auth';
import { normalizePhone } from '@/lib/utils';
import { recordAudit } from '@/lib/audit';
import { getSession } from '@/lib/auth';

/**
 * GET /api/therapists
 *  - dengan date+startTime+serviceId: hanya terapis yang tersedia (dipakai form reservasi)
 *  - tanpa parameter: daftar terapis aktif (data publik terbatas)
 */
export async function GET(request: Request) {
  try {
    const params = searchParamsOf(request);
    const date = params.get('date');
    const startTime = params.get('startTime');
    const serviceId = params.get('serviceId');

    if (date && startTime && serviceId) {
      const therapists = await getAvailableTherapists({
        dateKey: date,
        startTime,
        serviceId,
        excludeReservationId: params.get('excludeReservationId') || undefined,
      });
      return ok(therapists);
    }

    const session = await getSession();
    const therapists = await prisma.therapist.findMany({
      where: params.get('all') === '1' && session?.role === 'ADMIN' ? {} : { isActive: true },
      orderBy: { name: 'asc' },
      include: session?.role === 'ADMIN' ? { schedules: true } : undefined,
    });

    if (session?.role === 'ADMIN') return ok(therapists);
    return ok(
      therapists.map((t) => ({
        id: t.id,
        name: t.name,
        photoUrl: t.photoUrl,
        skills: t.skills,
        bio: t.bio,
      })),
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const actor = await requireAuth(['ADMIN']);
    const body = therapistSchema.parse(await readJson(request));
    const phone = normalizePhone(body.phone);

    const therapist = await prisma.$transaction(async (tx) => {
      let userId: string | null = null;
      if (body.createAccount && body.email && body.accountPassword) {
        const user = await tx.user.create({
          data: {
            email: body.email.toLowerCase(),
            name: body.name,
            phone,
            role: 'THERAPIST',
            passwordHash: await hashPassword(body.accountPassword),
          },
        });
        userId = user.id;
      }

      return tx.therapist.create({
        data: {
          userId,
          name: body.name,
          phone,
          email: body.email || null,
          photoUrl: body.photoUrl || null,
          bio: body.bio || null,
          skills: body.skills || null,
          serviceAreas: body.serviceAreas || null,
          isActive: body.isActive,
          commissionType: body.commissionType,
          commissionValue: body.commissionValue,
          maxDailyBooking: body.maxDailyBooking,
          schedules: {
            create:
              body.schedules?.length
                ? body.schedules
                : Array.from({ length: 7 }, (_, day) => ({
                    dayOfWeek: day,
                    startTime: '09:00',
                    endTime: '17:00',
                    isDayOff: day === 0,
                  })),
          },
        },
        include: { schedules: true },
      });
    });

    await recordAudit({
      actor,
      action: 'therapist.create',
      entity: 'Therapist',
      entityId: therapist.id,
      after: { name: therapist.name },
    });
    return ok(therapist, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
