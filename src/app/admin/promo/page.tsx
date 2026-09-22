import { prisma } from '@/lib/prisma';
import { PageHeader } from '@/features/admin/shell';
import { PromoManager } from '@/features/admin/promo-manager';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Promo' };

export default async function AdminPromoPage() {
  const [promos, services] = await Promise.all([
    prisma.promo.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.service.findMany({ orderBy: { sortOrder: 'asc' }, select: { id: true, name: true } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Promo & Diskon"
        description="Kode promo dipakai pelanggan pada langkah konfirmasi reservasi."
      />
      <PromoManager
        promos={promos.map((promo) => ({
          ...promo,
          startDate: promo.startDate.toISOString(),
          endDate: promo.endDate.toISOString(),
        }))}
        services={services}
      />
    </div>
  );
}
