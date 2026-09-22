import Link from 'next/link';
import { Plus } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/features/admin/shell';
import { ReservationTable } from '@/features/admin/reservation-table';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Reservasi' };

export default async function AdminReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const [therapists, services] = await Promise.all([
    prisma.therapist.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    prisma.service.findMany({ orderBy: { sortOrder: 'asc' }, select: { id: true, name: true } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Manajemen Reservasi"
        description="Cari, filter, dan kelola seluruh reservasi home care."
        action={
          <Button asChild size="sm">
            <Link href="/reservasi">
              <Plus className="size-4" /> Reservasi baru
            </Link>
          </Button>
        }
      />
      <ReservationTable
        options={{ therapists, services }}
        initialStatus={params.status ?? 'ALL'}
        initialFrom={params.from ?? ''}
        initialTo={params.to ?? ''}
      />
    </div>
  );
}
