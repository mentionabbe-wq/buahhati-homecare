import 'server-only';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { ForbiddenError, UnauthorizedError } from './rbac';

export class AppError extends Error {
  status: number;
  code: string;
  constructor(message: string, status = 400, code = 'BAD_REQUEST') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ success: true, data }, init);
}

export function fail(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ success: false, message, ...extra }, { status });
}

/** Memetakan error apa pun menjadi respons JSON yang aman (tanpa bocor detail internal). */
export function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of error.issues) {
      const key = issue.path.join('.') || 'form';
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return fail('Data yang dikirim tidak valid.', 422, { errors: fieldErrors });
  }
  if (error instanceof UnauthorizedError) return fail(error.message, 401);
  if (error instanceof ForbiddenError) return fail(error.message, 403);
  if (error instanceof AppError) return fail(error.message, error.status, { code: error.code });

  console.error('[api]', error);
  return fail('Terjadi kesalahan pada server.', 500);
}

/** Proteksi CSRF sederhana untuk request mutasi: Origin harus sama dengan Host. */
export function assertSameOrigin(request: Request) {
  const method = request.method.toUpperCase();
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return;
  const origin = request.headers.get('origin');
  if (!origin) return; // request non-browser (curl/worker) — dilindungi oleh auth
  const host = request.headers.get('host');
  try {
    if (new URL(origin).host !== host) {
      throw new AppError('Permintaan lintas origin ditolak.', 403, 'CSRF');
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Origin tidak valid.', 403, 'CSRF');
  }
}

export async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    throw new AppError('Body request harus berupa JSON yang valid.');
  }
}

export function searchParamsOf(request: Request) {
  return new URL(request.url).searchParams;
}
