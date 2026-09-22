import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { AppError, assertSameOrigin, handleApiError, ok, readJson } from '@/lib/api';
import { clientIp } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { normalizePhone } from '@/lib/utils';
import { phoneSchema } from '@/lib/validation';
import { reservationTimeline } from '@/services/reservation.service';

const lookupSchema = z.object({
  code: z.string().trim().min(4, 'Nomor reservasi wajib diisi').max(40),
  phone: phoneSchema,
});

/**
 * Pencarian status reservasi untuk tamu (tanpa akun).
 * Nomor reservasi saja tidak cukup — harus cocok dengan nomor WhatsApp pemesan
 * agar data pelanggan tidak bisa diintip orang lain.
 */
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const ip = (await clientIp()) ?? 'local';
    rateLimit(`lookup:${ip}`, 15, 10 * 60_000);

    const body = lookupSchema.parse(await readJson(request));
    const reservation = await prisma.reservation.findFirst({
      where: {
        reservationCode: body.code.trim().toUpperCase(),
        customer: { phone: normalizePhone(body.phone) },
      },
      include: {
        service: { select: { name: true, durationMinutes: true } },
        baby: { select: { name: true } },
        therapist: { select: { name: true } },
        customer: { select: { name: true } },
        statusHistory: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!reservation) {
      throw new AppError(
        'Reservasi tidak ditemukan. Periksa kembali nomor reservasi dan nomor WhatsApp.',
        404,
        'NOT_FOUND',
      );
    }

    return ok({
      reservationCode: reservation.reservationCode,
      customerName: reservation.customer.name,
      babyName: reservation.baby.name,
      serviceName: reservation.service.name,
      durationMinutes: reservation.service.durationMinutes,
      date: reservation.date,
      startTime: reservation.startTime,
      endTime: reservation.endTime,
      therapistName: reservation.therapist?.name ?? null,
      status: reservation.status,
      paymentStatus: reservation.paymentStatus,
      total: reservation.total,
      timeline: reservationTimeline(reservation.statusHistory, reservation.status).map((step) => ({
        label: step.label,
        done: step.done,
        at: step.at,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
