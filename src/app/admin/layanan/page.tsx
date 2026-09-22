import { prisma } from '@/lib/prisma';
import { PageHeader } from '@/features/admin/shell';
import { ServiceManager } from '@/features/admin/service-manager';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Layanan' };

export default async function AdminServicesPage() {
  const services = await prisma.service.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { reservations: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Master Layanan"
        description="Atur nama, durasi, harga, dan ketersediaan setiap layanan. Perubahan harga langsung dipakai form reservasi."
      />
      <ServiceManager services={services} />
    </div>
  );
}
