import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SESSION_COOKIE = 'bh_session';

const PROTECTED: { prefix: string; roles: string[] }[] = [
  { prefix: '/admin', roles: ['ADMIN'] },
  { prefix: '/terapis', roles: ['THERAPIST', 'ADMIN'] },
  { prefix: '/akun', roles: ['CUSTOMER', 'ADMIN'] },
];

function homeFor(role: string) {
  if (role === 'ADMIN') return '/admin/dashboard';
  if (role === 'THERAPIST') return '/terapis/jadwal';
  return '/akun/beranda';
}

/**
 * Penjaga lapis pertama: memeriksa cookie sesi sebelum halaman dirender.
 * Verifikasi penuh (status akun, sesi dicabut) tetap dilakukan di server component.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const rule = PROTECTED.find((item) => pathname.startsWith(item.prefix));
  if (!rule) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('next', pathname);
  if (!token) return NextResponse.redirect(loginUrl);

  try {
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET ?? '');
    const { payload } = await jwtVerify(token, secret);
    const role = String(payload.role ?? '');
    if (!rule.roles.includes(role)) {
      return NextResponse.redirect(new URL(homeFor(role), request.url));
    }
    return NextResponse.next();
  } catch {
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete(SESSION_COOKIE);
    return response;
  }
}

export const config = {
  matcher: ['/admin/:path*', '/terapis/:path*', '/akun/:path*'],
};
