import { prisma } from '@/lib/prisma';
import { assertSameOrigin, handleApiError, ok, readJson, searchParamsOf } from '@/lib/api';
import { requireAuth } from '@/lib/rbac';
import { serviceSchema } from '@/lib/validation';
import { slugify } from '@/lib/utils';
import { recordAudit } from '@/lib/audit';

export async function GET(request: Request) {
  try {
    const params = searchParamsOf(request);
    const includeInactive = params.get('all') === '1';
    const services = await prisma.service.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return ok(services);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const actor = await requireAuth(['ADMIN']);
    const body = serviceSchema.parse(await readJson(request));

    let slug = slugify(body.name);
    const existing = await prisma.service.findUnique({ where: { slug } });
    if (existing) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;

    const service = await prisma.service.create({ data: { ...body, slug } });
    await recordAudit({
      actor,
      action: 'service.create',
      entity: 'Service',
      entityId: service.id,
      after: service,
    });
    return ok(service, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
