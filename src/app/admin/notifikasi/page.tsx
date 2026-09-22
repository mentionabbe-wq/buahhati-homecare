import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { PageHeader } from '@/features/admin/shell';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/misc';
import { ResendButton } from '@/features/admin/resend-button';
import { formatDateTimeId } from '@/lib/datetime';
import { TEMPLATE_LABEL } from '@/services/whatsapp';
import type { NotificationTemplate } from '@/lib/constants';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Log Notifikasi' };

const STATUS_STYLE: Record<string, string> = {
  SENT: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  PENDING: 'bg-amber-100 text-amber-800 border-amber-200',
  FAILED: 'bg-rose-100 text-rose-800 border-rose-200',
};

export default async function AdminNotificationsPage() {
  const notifications = await prisma.notification.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      reservation: { select: { id: true, reservationCode: true } },
      customer: { select: { name: true } },
    },
  });

  return (
    <div>
      <PageHeader
        title="Log Notifikasi WhatsApp"
        description="Seluruh pesan yang dibuat sistem. Provider mock hanya mencatat pesan tanpa mengirim."
      />

      {notifications.length === 0 ? (
        <EmptyState title="Belum ada notifikasi" />
      ) : (
        <ul className="space-y-2">
          {notifications.map((item) => (
            <li key={item.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">
                  {TEMPLATE_LABEL[item.template as NotificationTemplate] ?? item.template}
                </span>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                    STATUS_STYLE[item.status] ?? 'border-border bg-muted'
                  }`}
                >
                  {item.status}
                </span>
                <Badge variant="outline">{item.provider ?? 'mock'}</Badge>
                <span className="text-xs text-muted-foreground">
                  {formatDateTimeId(item.createdAt)}
                </span>
                {item.reservation ? (
                  <Link
                    href={`/admin/reservasi/${item.reservation.id}`}
                    className="font-mono text-xs text-primary hover:underline"
                  >
                    {item.reservation.reservationCode}
                  </Link>
                ) : null}
                <span className="ml-auto text-xs text-muted-foreground">
                  {item.customer?.name ?? item.to}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-line rounded-xl bg-muted/60 p-3 text-xs">
                {item.message}
              </p>
              {item.error ? (
                <p className="mt-1 text-xs text-destructive">Gagal: {item.error}</p>
              ) : null}
              {item.status !== 'SENT' ? <ResendButton notificationId={item.id} /> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
