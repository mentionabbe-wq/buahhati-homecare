import { assertSameOrigin, handleApiError, ok, readJson } from '@/lib/api';
import { requireAuth } from '@/lib/rbac';
import { updatePaymentStatus } from '@/services/payment.service';
import { z } from 'zod';
import { PAYMENT_STATUSES } from '@/lib/constants';

const patchSchema = z.object({
  status: z.enum(PAYMENT_STATUSES),
  note: z.string().max(500).optional().nullable(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const actor = await requireAuth(['ADMIN']);
    const { id } = await params;
    const body = patchSchema.parse(await readJson(request));
    const payment = await updatePaymentStatus({
      paymentId: id,
      status: body.status,
      note: body.note ?? null,
      actor,
    });
    return ok(payment);
  } catch (error) {
    return handleApiError(error);
  }
}
