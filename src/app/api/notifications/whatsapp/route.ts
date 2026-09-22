import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { assertSameOrigin, handleApiError, ok, readJson, searchParamsOf } from '@/lib/api';
import { requireAuth } from '@/lib/rbac';
import { NOTIFICATION_TEMPLATES } from '@/lib/constants';
import { notifyReservation, queueWhatsApp, sendNotification } from '@/services/whatsapp';
import { phoneSchema } from '@/lib/validation';

const sendSchema = z.union([
  z.object({ notificationId: z.string().min(1) }),
  z.object({
    reservationId: z.string().min(1),
    template: z.enum(NOTIFICATION_TEMPLATES),
  }),
  z.object({
    to: phoneSchema,
    template: z.enum(NOTIFICATION_TEMPLATES),
    context: z.record(z.string(), z.any()),
  }),
]);

/** GET: riwayat notifikasi. POST: kirim/kirim ulang notifikasi WhatsApp. */
export async function GET(request: Request) {
  try {
    await requireAuth(['ADMIN']);
    const params = searchParamsOf(request);
    const status = params.get('status');
    const notifications = await prisma.notification.findMany({
      where: status && status !== 'ALL' ? { status } : {},
      include: {
        reservation: { select: { reservationCode: true, id: true } },
        customer: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return ok(notifications);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await requireAuth(['ADMIN']);
    const body = sendSchema.parse(await readJson(request));

    if ('notificationId' in body) {
      return ok(await sendNotification(body.notificationId));
    }
    if ('reservationId' in body) {
      const result = await notifyReservation(body.reservationId, body.template);
      return ok(result);
    }
    const result = await queueWhatsApp({
      template: body.template,
      to: body.to,
      context: body.context as never,
    });
    return ok(result);
  } catch (error) {
    return handleApiError(error);
  }
}
