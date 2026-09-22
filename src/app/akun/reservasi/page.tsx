import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CalendarHeart, Plus } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { PaymentBadge, StatusBadge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/misc';
import { dateKeyToDate, formatDateId, todayKey } from '@/lib/datetime';
import { formatCurrency } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Reservasi Saya' };

export default async function CustomerReservationsPage() {
  const session = await getSession();
  if (!session?.customerId) redirect('/reservasi');

  const reservations = await prisma.reservation.findMany({
    where: {
      customerId: session.customerId,
      date: { gte: dateKeyToDate(todayKey()) },
    },
    include: {
      service: { select: { name: true } },
      baby: { select: { name: true } },
      therapist: { select: { name: true } },
    },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold">Reservasi Saya</h1>
          <p className="text-sm text-muted-foreground">Jadwal yang akan datang</p>
        </div>
        <Button asChild size="sm">
          <Link href="/reservasi">
            <Plus className="size-4" /> Baru
          </Link>
        </Button>
      </div>

      {reservations.length === 0 ? (
        <EmptyState
          icon={<CalendarHeart className="size-8" />}
          title="Belum ada reservasi aktif"
          description="Semua jadwal yang sudah lewat dapat dilihat pada menu Riwayat."
          action={
            <Button asChild>
              <Link href="/reservasi">Buat Reservasi</Link>
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {reservations.map((item) => (
            <li key={item.id}>
              <Link
                href={`/akun/reservasi/${item.id}`}
                className="block rounded-3xl border border-border bg-card p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs font-semibold text-muted-foreground">
                      {item.reservationCode}
                    </p>
                    <p className="mt-1 font-display text-base font-bold">{item.service.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.baby.name} · {formatDateId(item.date, { withDay: true })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {item.startTime} WIB · {item.therapist?.name ?? 'Terapis menyusul'}
                    </p>
                  </div>
                  <StatusBadge status={item.status} />
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                  <span className="font-semibold">{formatCurrency(item.total)}</span>
                  <PaymentBadge status={item.paymentStatus} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
