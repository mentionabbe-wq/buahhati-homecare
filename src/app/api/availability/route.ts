import { handleApiError, ok, searchParamsOf } from '@/lib/api';
import { availabilityQuerySchema } from '@/lib/validation';
import { getSlots } from '@/services/availability.service';

/** GET /api/availability?date=YYYY-MM-DD&serviceId=...&therapistId=... */
export async function GET(request: Request) {
  try {
    const params = searchParamsOf(request);
    const query = availabilityQuerySchema.parse({
      date: params.get('date'),
      serviceId: params.get('serviceId'),
      therapistId: params.get('therapistId') || undefined,
      excludeReservationId: params.get('excludeReservationId') || undefined,
    });

    const result = await getSlots({
      dateKey: query.date,
      serviceId: query.serviceId,
      therapistId: query.therapistId,
      excludeReservationId: query.excludeReservationId,
    });

    return ok({
      date: query.date,
      serviceName: result.serviceName,
      durationMinutes: result.durationMinutes,
      slots: result.slots.map((slot) => ({
        time: slot.time,
        endTime: slot.endTime,
        available: slot.available,
        reason: slot.reason ?? null,
        availableTherapists: slot.availableTherapistIds.length,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
