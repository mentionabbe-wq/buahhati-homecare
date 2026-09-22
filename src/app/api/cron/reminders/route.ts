import { fail, handleApiError, ok } from '@/lib/api';
import { getSession } from '@/lib/auth';
import { runReminders } from '@/services/reminder.service';

/**
 * Endpoint cron pengingat otomatis.
 * Dipanggil oleh scheduler eksternal (cron server, Vercel Cron, GitHub Action)
 * dengan header `Authorization: Bearer $CRON_SECRET`, atau manual oleh admin.
 */
async function handle(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get('authorization');
  const session = await getSession().catch(() => null);

  const authorized =
    (secret && header === `Bearer ${secret}`) || session?.role === 'ADMIN';
  if (!authorized) return fail('Tidak diizinkan.', 401);

  const result = await runReminders();
  return ok({ ...result, at: new Date().toISOString() });
}

export async function GET(request: Request) {
  try {
    return await handle(request);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    return await handle(request);
  } catch (error) {
    return handleApiError(error);
  }
}
