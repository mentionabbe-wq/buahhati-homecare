import Link from 'next/link';
import { Search } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { PageHeader } from '@/features/admin/shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/misc';
import { Card } from '@/components/ui/card';
import { babyAge, formatDateId } from '@/lib/datetime';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Data Bayi' };

export default async function AdminBabiesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const babies = await prisma.baby.findMany({
    where: q ? { name: { contains: q } } : {},
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      _count: { select: { reservations: true, treatments: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return (
    <div>
      <PageHeader
        title="Profil Bayi"
        description="Setiap bayi memiliki profil, riwayat treatment, dan catatan terapis sendiri."
      />

      <form className="mb-4 flex gap-2" action="/admin/bayi">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={q ?? ''} placeholder="Cari nama bayi" className="pl-10" />
        </div>
        <Button type="submit">Cari</Button>
      </form>

      {babies.length === 0 ? (
        <EmptyState title="Belum ada data bayi" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {babies.map((baby) => (
            <Link key={baby.id} href={`/admin/bayi/${baby.id}`}>
              <Card className="p-4 transition hover:bg-muted/40">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-base font-bold">{baby.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {babyAge(baby.birthDate)} · {baby.gender === 'MALE' ? 'Laki-laki' : 'Perempuan'}
                    </p>
                  </div>
                  <span className="rounded-full bg-[var(--color-blush)] px-2.5 py-1 text-[11px] font-semibold text-secondary-foreground">
                    {baby._count.treatments} treatment
                  </span>
                </div>
                <p className="mt-3 text-sm">
                  Orang tua: <span className="font-medium">{baby.customer.name}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Lahir {formatDateId(baby.birthDate, { short: true })} · {baby._count.reservations}{' '}
                  reservasi
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
