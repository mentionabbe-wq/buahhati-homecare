import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/misc';
import { babyAge, formatDateId } from '@/lib/datetime';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Riwayat Treatment' };

export default async function TherapistHistoryPage() {
  const session = await getSession();
  if (!session?.therapistId) {
    return <EmptyState title="Akun ini belum terhubung ke data terapis" />;
  }

  const reservations = await prisma.reservation.findMany({
    where: { therapistId: session.therapistId, status: { in: ['COMPLETED', 'CANCELLED', 'NO_SHOW'] } },
    include: {
      baby: { select: { name: true, birthDate: true } },
      service: { select: { name: true } },
      customer: { select: { name: true } },
      treatment: { select: { id: true, notes: true } },
    },
    orderBy: { date: 'desc' },
    take: 60,
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-xl font-bold">Riwayat Treatment</h1>
        <p className="text-sm text-muted-foreground">60 kunjungan terakhir yang Anda tangani.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar kunjungan</CardTitle>
        </CardHeader>
        <div className="px-5 pb-5">
          {reservations.length === 0 ? (
            <EmptyState title="Belum ada riwayat" />
          ) : (
            <ul className="space-y-2">
              {reservations.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/terapis/reservasi/${item.id}`}
                    className="flex items-start gap-3 rounded-2xl border border-border p-3 transition hover:bg-muted/50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {item.baby.name} · {babyAge(item.baby.birthDate)}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {item.service.name} · {formatDateId(item.date, { short: true })} ·{' '}
                        {item.startTime}
                      </p>
                      {item.treatment?.notes ? (
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {item.treatment.notes}
                        </p>
                      ) : item.status === 'COMPLETED' ? (
                        <p className="mt-1 text-xs text-amber-700">Catatan treatment belum diisi</p>
                      ) : null}
                    </div>
                    <StatusBadge status={item.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
}
