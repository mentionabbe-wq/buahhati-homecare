import { assertSameOrigin, handleApiError, ok } from '@/lib/api';
import { destroySession } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await destroySession();
    return ok({ redirectTo: '/' });
  } catch (error) {
    return handleApiError(error);
  }
}
