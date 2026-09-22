import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, EmptyState } from '@/components/ui/misc';
import { DAY_NAMES } from '@/lib/constants';
import { formatDateId } from '@/lib/datetime';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Profil Terapis' };

export default async function TherapistProfilePage() {
  const session = await getSession();
  if (!session?.therapistId) {
    return <EmptyState title="Akun ini belum terhubung ke data terapis" />;
  }

  const therapist = await prisma.therapist.findUnique({
    where: { id: session.therapistId },
    include: {
      schedules: { orderBy: { dayOfWeek: 'asc' } },
      timeOffs: { orderBy: { date: 'asc' } },
    },
  });
  if (!therapist) return <EmptyState title="Data terapis tidak ditemukan" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Avatar name={therapist.name} src={therapist.photoUrl} className="size-14" />
        <div>
          <h1 className="font-display text-xl font-bold">{therapist.name}</h1>
          <p className="text-sm text-muted-foreground">{therapist.phone}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informasi</CardTitle>
        </CardHeader>
        <dl className="grid gap-3 px-5 pb-5 text-sm sm:grid-cols-2">
          <Row label="Keahlian" value={therapist.skills ?? '-'} />
          <Row label="Area layanan" value={therapist.serviceAreas ?? '-'} />
          <Row label="Maksimal kunjungan/hari" value={String(therapist.maxDailyBooking)} />
          <Row label="Status" value={therapist.isActive ? 'Aktif' : 'Nonaktif'} />
          <Row label="Bio" value={therapist.bio ?? '-'} />
        </dl>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Jadwal kerja</CardTitle>
          <p className="text-sm text-muted-foreground">
            Perubahan jadwal dilakukan oleh admin.
          </p>
        </CardHeader>
        <ul className="space-y-1.5 px-5 pb-5 text-sm">
          {DAY_NAMES.map((day, index) => {
            const schedule = therapist.schedules.find((s) => s.dayOfWeek === index);
            return (
              <li key={day} className="flex justify-between rounded-xl bg-muted/50 px-3 py-2">
                <span>{day}</span>
                <span className="text-muted-foreground">
                  {!schedule || schedule.isDayOff ? 'Libur' : `${schedule.startTime}–${schedule.endTime}`}
                </span>
              </li>
            );
          })}
        </ul>
      </Card>

      {therapist.timeOffs.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Hari libur khusus</CardTitle>
          </CardHeader>
          <ul className="space-y-1.5 px-5 pb-5 text-sm">
            {therapist.timeOffs.map((off) => (
              <li key={off.id} className="flex justify-between rounded-xl bg-muted/50 px-3 py-2">
                <span>{formatDateId(off.date, { withDay: true })}</span>
                <span className="text-muted-foreground">{off.reason ?? '-'}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5">{value}</dd>
    </div>
  );
}
