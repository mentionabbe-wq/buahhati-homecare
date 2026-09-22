import 'server-only';
import { redirect } from 'next/navigation';
import { getSession, type SessionUser } from './auth';
import type { Role } from './constants';

export class ForbiddenError extends Error {
  constructor(message = 'Anda tidak memiliki akses ke sumber daya ini.') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class UnauthorizedError extends Error {
  constructor(message = 'Silakan login terlebih dahulu.') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

/** Untuk server component/page: redirect ke login bila tidak berhak. */
export async function requirePageAuth(roles?: Role[], loginPath = '/login') {
  const session = await getSession();
  if (!session) redirect(`${loginPath}?next=${encodeURIComponent('/')}`);
  if (roles && !roles.includes(session.role)) redirect(homeFor(session.role));
  return session;
}

/** Untuk route handler / server action: lempar error yang dipetakan ke 401/403. */
export async function requireAuth(roles?: Role[]): Promise<SessionUser> {
  const session = await getSession();
  if (!session) throw new UnauthorizedError();
  if (roles && !roles.includes(session.role)) throw new ForbiddenError();
  return session;
}

export function homeFor(role: Role) {
  if (role === 'ADMIN') return '/admin/dashboard';
  if (role === 'THERAPIST') return '/terapis/jadwal';
  return '/akun/beranda';
}

export function isAdmin(session: SessionUser | null) {
  return session?.role === 'ADMIN';
}

/**
 * Data pelanggan & bayi bersifat privat: pastikan pemilik data adalah
 * pemohon, terapis yang ditugaskan, atau admin.
 */
export function canReadReservation(
  session: SessionUser,
  reservation: { customerId: string; therapistId: string | null },
) {
  if (session.role === 'ADMIN') return true;
  if (session.role === 'CUSTOMER') return session.customerId === reservation.customerId;
  if (session.role === 'THERAPIST') return session.therapistId === reservation.therapistId;
  return false;
}
