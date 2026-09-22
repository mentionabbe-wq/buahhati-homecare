import 'server-only';
import { headers } from 'next/headers';
import { prisma } from './prisma';
import { clientIpFrom, type SessionUser } from './auth';

type AuditInput = {
  actor?: SessionUser | null;
  action: string;
  entity: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
};

function safeStringify(value: unknown) {
  if (value === undefined || value === null) return null;
  try {
    return JSON.stringify(value, (key, val) => {
      // jangan pernah menulis kredensial ke audit log
      if (/password|token|secret|apikey/i.test(key)) return '[redacted]';
      return val;
    }).slice(0, 8000);
  } catch {
    return null;
  }
}

export async function recordAudit(input: AuditInput) {
  try {
    const hdrs = await headers().catch(() => null);
    await prisma.auditLog.create({
      data: {
        userId: input.actor?.id ?? null,
        actorName: input.actor?.name ?? 'system',
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        before: safeStringify(input.before),
        after: safeStringify(input.after),
        ip: hdrs ? clientIpFrom(hdrs) : null,
        userAgent: hdrs?.get('user-agent')?.slice(0, 250) ?? null,
      },
    });
  } catch (error) {
    // audit tidak boleh menggagalkan operasi bisnis
    console.error('[audit] gagal mencatat', error);
  }
}
