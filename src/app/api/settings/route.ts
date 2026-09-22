import { assertSameOrigin, handleApiError, ok, readJson } from '@/lib/api';
import { requireAuth } from '@/lib/rbac';
import { getSettings, saveSettings, type AppSettings } from '@/services/settings.service';
import { recordAudit } from '@/lib/audit';

export async function GET() {
  try {
    await requireAuth(['ADMIN']);
    return ok(await getSettings());
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const actor = await requireAuth(['ADMIN']);
    const before = await getSettings();
    const body = (await readJson(request)) as Partial<Record<keyof AppSettings, unknown>>;

    // slotTimes dikirim sebagai string "09:00, 10:00" atau array
    if (typeof body.slotTimes === 'string') {
      body.slotTimes = body.slotTimes
        .split(',')
        .map((value) => value.trim())
        .filter((value) => /^\d{2}:\d{2}$/.test(value));
    }

    await saveSettings(body);
    const after = await getSettings();
    await recordAudit({ actor, action: 'settings.update', entity: 'Setting', before, after });
    return ok(after);
  } catch (error) {
    return handleApiError(error);
  }
}
