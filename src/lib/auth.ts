import 'server-only';
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies, headers } from 'next/headers';
import { cache } from 'react';
import { prisma } from './prisma';
import type { Role } from './constants';

export const SESSION_COOKIE = 'bh_session';
const MAX_AGE_DAYS = Number(process.env.SESSION_MAX_AGE_DAYS ?? 7);
const MAX_AGE_SECONDS = MAX_AGE_DAYS * 24 * 60 * 60;

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error('AUTH_SECRET belum diset. Salin .env.example menjadi .env terlebih dahulu.');
  }
  return new TextEncoder().encode(secret);
}

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  customerId?: string | null;
  therapistId?: string | null;
};

type JwtPayload = SessionUser & { sid: string };

export async function signSessionToken(payload: JwtPayload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_DAYS}d`)
    .sign(secretKey());
}

export async function readSessionToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return payload as unknown as JwtPayload;
  } catch {
    return null;
  }
}

/** Membuat sesi baru: catat di tabel Session (agar bisa dicabut) lalu set cookie. */
export async function createSession(user: SessionUser) {
  const hdrs = await headers();
  const sessionRow = await prisma.session.create({
    data: {
      token: crypto.randomUUID(),
      userId: user.id,
      userAgent: hdrs.get('user-agent')?.slice(0, 250) ?? null,
      ip: clientIpFrom(hdrs),
      expiresAt: new Date(Date.now() + MAX_AGE_SECONDS * 1000),
    },
  });

  const jwt = await signSessionToken({ ...user, sid: sessionRow.token });
  const store = await cookies();
  store.set(SESSION_COOKIE, jwt, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  });
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    const payload = await readSessionToken(token);
    if (payload?.sid) {
      await prisma.session
        .updateMany({ where: { token: payload.sid }, data: { revokedAt: new Date() } })
        .catch(() => undefined);
    }
  }
  store.delete(SESSION_COOKIE);
}

/** Sesi aktif untuk request saat ini (dicache per-request). */
export const getSession = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await readSessionToken(token);
  if (!payload) return null;

  const row = await prisma.session.findUnique({
    where: { token: payload.sid },
    select: {
      revokedAt: true,
      expiresAt: true,
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          customer: { select: { id: true } },
          therapist: { select: { id: true } },
        },
      },
    },
  });
  if (!row || row.revokedAt || row.expiresAt < new Date() || !row.user?.isActive) return null;

  return {
    id: row.user.id,
    email: row.user.email,
    name: row.user.name,
    role: row.user.role as Role,
    customerId: row.user.customer?.id ?? null,
    therapistId: row.user.therapist?.id ?? null,
  };
});

export function clientIpFrom(hdrs: Headers) {
  return (
    hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    hdrs.get('x-real-ip') ||
    null
  );
}

export async function clientIp() {
  return clientIpFrom(await headers());
}
