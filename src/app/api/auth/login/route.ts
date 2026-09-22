import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { assertSameOrigin, handleApiError, ok, readJson } from '@/lib/api';
import { createSession, verifyPassword, clientIp } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { loginSchema } from '@/lib/validation';
import { homeFor } from '@/lib/rbac';
import type { Role } from '@/lib/constants';

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const ip = (await clientIp()) ?? 'local';
    rateLimit(`login:${ip}`, 8, 5 * 60_000);

    const body = loginSchema.parse(await readJson(request));
    const user = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });

    // pesan seragam agar tidak membocorkan email mana yang terdaftar
    const invalid = () =>
      NextResponse.json({ success: false, message: 'Email atau password salah.' }, { status: 401 });

    if (!user || !user.isActive) return invalid();
    const valid = await verifyPassword(body.password, user.passwordHash);
    if (!valid) return invalid();

    const [customer, therapist] = await Promise.all([
      prisma.customer.findUnique({ where: { userId: user.id }, select: { id: true } }),
      prisma.therapist.findUnique({ where: { userId: user.id }, select: { id: true } }),
    ]);

    await createSession({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as Role,
      customerId: customer?.id ?? null,
      therapistId: therapist?.id ?? null,
    });

    return ok({ role: user.role, redirectTo: homeFor(user.role as Role) });
  } catch (error) {
    return handleApiError(error);
  }
}
