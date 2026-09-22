import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { Card, CardHeader, CardTitle, StatCard } from '@/components/ui/card';
import { BabyTimeline } from '@/components/baby-timeline';
import { EmptyState } from '@/components/ui/misc';
import { babyAge } from '@/lib/datetime';
import { formatCurrency } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Riwayat Treatment' };

export default async function CustomerHistoryPage() {
  const session = await getSession();
  if (!session?.customerId) redirect('/login');

  const customer = await prisma.customer.findUnique({
    where: { id: session.customerId },
    include: {
      babies: {
        orderBy: { createdAt: 'asc' },
        include: {
          reservations: {
            include: {
              service: { select: { name: true, durationMinutes: true } },
              therapist: { select: { name: true } },
              treatment: true,
            },
            orderBy: { date: 'desc' },
          },
        },
      },
    },
  });

  if (!customer) redirect('/login');

  const allReservations = customer.babies.flatMap((baby) => baby.reservations);
  const completed = allReservations.filter((item) => item.status === 'COMPLETED');

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-xl font-bold">Riwayat Treatment</h1>
        <p className="text-sm text-muted-foreground">
          Semua kunjungan yang pernah dilakukan beserta catatan terapis.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total kunjungan" value={allReservations.length} tone="cream" />
        <StatCard label="Selesai" value={completed.length} tone="primary" />
        <StatCard label="Total transaksi" value={formatCurrency(customer.totalSpent)} tone="blush" />
      </div>

      {customer.babies.length === 0 ? (
        <EmptyState title="Belum ada profil bayi" description="Buat reservasi pertama untuk memulai." />
      ) : (
        customer.babies.map((baby) => (
          <Card key={baby.id}>
            <CardHeader>
              <CardTitle>{baby.name}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {babyAge(baby.birthDate)} · {baby.reservations.length} kunjungan
              </p>
            </CardHeader>
            <div className="px-5 pb-5">
              <BabyTimeline entries={baby.reservations} hrefPrefix="/akun/reservasi" />
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
