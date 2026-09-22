import { prisma } from '@/lib/prisma';
import { getSettings } from '@/services/settings.service';
import { PageHeader } from '@/features/admin/shell';
import { CalendarBoard } from '@/features/admin/calendar-board';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Calendar' };

export default async function AdminCalendarPage() {
  const [settings, therapists] = await Promise.all([
    getSettings(),
    prisma.therapist.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Kalender Jadwal"
        description="Pantau jadwal harian, mingguan, dan bulanan seluruh terapis."
      />
      <CalendarBoard slotTimes={settings.slotTimes} therapists={therapists} />
    </div>
  );
}
