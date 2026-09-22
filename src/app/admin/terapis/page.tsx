import { prisma } from '@/lib/prisma';
import { PageHeader } from '@/features/admin/shell';
import { TherapistManager } from '@/features/admin/therapist-manager';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Terapis' };

export default async function AdminTherapistsPage() {
  const therapists = await prisma.therapist.findMany({
    orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    include: {
      schedules: { orderBy: { dayOfWeek: 'asc' } },
      timeOffs: { orderBy: { date: 'asc' } },
      _count: { select: { reservations: true } },
    },
  });

  return (
    <div>
      <PageHeader
        title="Master Terapis"
        description="Kelola data terapis, jadwal kerja mingguan, hari libur, area layanan, dan skema komisi."
      />
      <TherapistManager
        therapists={therapists.map((t) => ({
          ...t,
          timeOffs: t.timeOffs.map((off) => ({
            id: off.id,
            date: off.date.toISOString(),
            reason: off.reason,
          })),
        }))}
      />
    </div>
  );
}
