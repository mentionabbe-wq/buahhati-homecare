import { prisma } from '@/lib/prisma';
import { AppError, assertSameOrigin, handleApiError, ok, readJson } from '@/lib/api';
import { clientIp, createSession, hashPassword } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { registerSchema } from '@/lib/validation';
import { normalizePhone } from '@/lib/utils';
import { recordAudit } from '@/lib/audit';

/**
 * Pendaftaran mandiri hanya untuk role CUSTOMER.
 * Akun admin & terapis dibuat dari dashboard admin.
 */
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const ip = (await clientIp()) ?? 'local';
    rateLimit(`register:${ip}`, 5, 10 * 60_000);

    const body = registerSchema.parse(await readJson(request));
    const email = body.email.toLowerCase();
    const phone = normalizePhone(body.phone);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new AppError('Email sudah terdaftar. Silakan login.', 409, 'EMAIL_TAKEN');

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email,
          name: body.name,
          phone,
          role: 'CUSTOMER',
          passwordHash: await hashPassword(body.password),
        },
      });

      // tautkan ke data pelanggan yang sudah ada (mis. pernah reservasi tanpa akun)
      const customer = await tx.customer.findUnique({ where: { phone } });
      if (customer) {
        if (customer.userId && customer.userId !== created.id) {
          throw new AppError('Nomor WhatsApp sudah terhubung dengan akun lain.', 409, 'PHONE_TAKEN');
        }
        await tx.customer.update({
          where: { id: customer.id },
          data: { userId: created.id, email: customer.email ?? email },
        });
      } else {
        await tx.customer.create({
          data: { userId: created.id, name: body.name, phone, email },
        });
      }
      return created;
    });

    const customer = await prisma.customer.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    await createSession({
      id: user.id,
      email: user.email,
      name: user.name,
      role: 'CUSTOMER',
      customerId: customer?.id ?? null,
      therapistId: null,
    });
    await recordAudit({ action: 'auth.register', entity: 'User', entityId: user.id });

    return ok({ redirectTo: '/akun/beranda' }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
