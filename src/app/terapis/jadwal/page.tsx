import Link from 'next/link';
import { CalendarDays, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { Card, CardHeader, CardTitle, StatCard } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import { addDaysKey, babyAge, dateKeyToDate, formatDateId, todayKey } from '@/lib/datetime';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Jadwal Saya' };

export default async function TherapistSchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const session = await getSession();
  const { date } = await searchParams;
  const dateKey = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : todayKey();

  if (!session?.therapistId) {
    return (
      <EmptyState
        title="Akun ini belum terhubung ke data terapis"
        description="Hubungi admin untuk menautkan akun Anda dengan profil terapis."
      />
    );
  }

  const dayStart = dateKeyToDate(dateKey);
  const dayEnd = new Date(dayStart.getTime() + 86_400_000);
  const monthStart = dateKeyToDate(`${todayKey().slice(0, 7)}-01`);

  const [items, monthCount, completedCount, schedule] = await Promise.all([
    prisma.reservation.findMany({
      where: { therapistId: session.therapistId, date: { gte: dayStart, lt: dayEnd } },
      include: {
        customer: { select: { name: true, phone: true } },
        baby: { select: { name: true, birthDate: true } },
        service: { select: { name: true, durationMinutes: true } },
        treatment: { select: { id: true } },
      },
      orderBy: { startTime: 'asc' },
    }),
    prisma.reservation.count({
      where: { therapistId: session.therapistId, date: { gte: monthStart } },
    }),
    prisma.reservation.count({
      where: { therapistId: session.therapistId, status: 'COMPLETED', date: { gte: monthStart } },
    }),
    prisma.therapistSchedule.findUnique({
      where: {
        therapistId_dayOfWeek: {
          therapistId: session.therapistId,
          dayOfWeek: dateKeyToDate(dateKey).getUTCDay(),
        },
      },
    }),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-xl font-bold">Jadwal Saya</h1>
        <p className="text-sm text-muted-foreground">
          {formatDateId(`${dateKey}T00:00:00.000Z`, { withDay: true })}
          {schedule
            ? schedule.isDayOff
              ? ' · Hari libur'
              : ` · Jam kerja ${schedule.startTime}–${schedule.endTime}`
            : ''}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={`/terapis/jadwal?date=${addDaysKey(dateKey, -1)}`}>
            <ChevronLeft className="size-4" /> Kemarin
          </Link>
        </Button>
        <Button asChild variant={dateKey === todayKey() ? 'default' : 'outline'} size="sm">
          <Link href="/terapis/jadwal">Hari ini</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href={`/terapis/jadwal?date=${addDaysKey(dateKey, 1)}`}>
            Besok <ChevronRight className="size-4" />
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Kunjungan hari ini" value={items.length} tone="cream" />
        <StatCard label="Bulan ini" value={monthCount} tone="sky" />
        <StatCard label="Selesai" value={completedCount} tone="primary" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar kunjungan</CardTitle>
        </CardHeader>
        <div className="px-5 pb-5">
          {items.length === 0 ? (
            <EmptyState
              icon={<CalendarDays className="size-8" />}
              title="Tidak ada kunjungan"
              description="Belum ada reservasi yang ditugaskan pada tanggal ini."
            />
          ) : (
            <ul className="space-y-2">
              {items.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/terapis/reservasi/${item.id}`}
                    className="block rounded-2xl border border-border p-3 transition hover:bg-muted/50"
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex w-16 shrink-0 flex-col items-center rounded-xl bg-[var(--color-cream)] px-2 py-1.5">
                        <span className="font-display text-sm font-bold text-primary">
                          {item.startTime}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{item.endTime}</span>
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {item.baby.name} · {babyAge(item.baby.birthDate)}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {item.service.name} · {item.service.durationMinutes} menit
                        </p>
                        <p className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
                          <MapPin className="mt-0.5 size-3.5 shrink-0" />
                          <span className="line-clamp-2">{item.address}</span>
                        </p>
                      </div>
                      <StatusBadge status={item.status} />
                    </div>
                    {item.status === 'COMPLETED' && !item.treatment ? (
                      <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">
                        Catatan treatment belum diisi.
                      </p>
                    ) : null}
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
