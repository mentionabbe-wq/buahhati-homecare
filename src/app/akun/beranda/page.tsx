import Link from 'next/link';
import { redirect } from 'next/navigation';
import { BabyIcon, CalendarHeart, Clock, MapPin, ScrollText, Ticket } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { getSettings } from '@/services/settings.service';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/misc';
import { babyAge, dateKeyToDate, formatDateId, todayKey } from '@/lib/datetime';
import { formatCurrency } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Beranda' };

export default async function CustomerHomePage() {
  const session = await getSession();
  if (!session?.customerId) redirect('/reservasi');

  const today = dateKeyToDate(todayKey());
  const [customer, upcoming, promos, settings] = await Promise.all([
    prisma.customer.findUnique({
      where: { id: session.customerId },
      include: { babies: { where: { isActive: true }, orderBy: { createdAt: 'asc' } } },
    }),
    prisma.reservation.findMany({
      where: {
        customerId: session.customerId,
        date: { gte: today },
        status: { in: ['PENDING', 'CONFIRMED', 'ON_THE_WAY', 'ARRIVED', 'IN_SERVICE'] },
      },
      include: {
        service: { select: { name: true, durationMinutes: true } },
        baby: { select: { name: true } },
        therapist: { select: { name: true } },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      take: 3,
    }),
    prisma.promo.findMany({
      where: { isActive: true, startDate: { lte: today }, endDate: { gte: today } },
      orderBy: { endDate: 'asc' },
      take: 4,
    }),
    getSettings(),
  ]);

  const next = upcoming[0];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold">Halo, {customer?.name ?? session.name} 👋</h1>
        <p className="text-sm text-muted-foreground">
          Semoga si kecil sehat selalu. Ada yang bisa kami bantu hari ini?
        </p>
      </div>

      {next ? (
        <Card className="overflow-hidden">
          <div className="bh-gradient px-5 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              Reservasi berikutnya
            </p>
          </div>
          <div className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 font-display text-lg font-bold">
                  <BabyIcon className="size-5 text-primary" /> {next.baby.name}
                </p>
                <p className="mt-1 text-sm">{next.service.name}</p>
                <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <CalendarHeart className="size-4" /> {formatDateId(next.date, { withDay: true })}
                </p>
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Clock className="size-4" /> {next.startTime} WIB · {next.service.durationMinutes} menit
                </p>
                {next.therapist ? (
                  <p className="mt-1 text-sm text-muted-foreground">Terapis: {next.therapist.name}</p>
                ) : null}
              </div>
              <StatusBadge status={next.status} />
            </div>
            <Button asChild className="mt-4 w-full">
              <Link href={`/akun/reservasi/${next.id}`}>Lihat Detail</Link>
            </Button>
          </div>
        </Card>
      ) : (
        <EmptyState
          icon={<CalendarHeart className="size-8" />}
          title="Belum ada reservasi terjadwal"
          description="Buat reservasi baru untuk sesi berikutnya si kecil."
          action={
            <Button asChild>
              <Link href="/reservasi">Reservasi Sekarang</Link>
            </Button>
          }
        />
      )}

      <div className="grid grid-cols-2 gap-3">
        <Button asChild size="lg" className="h-auto flex-col gap-2 py-5">
          <Link href="/reservasi">
            <CalendarHeart className="size-5" />
            Booking Lagi
          </Link>
        </Button>
        <Button asChild size="lg" variant="secondary" className="h-auto flex-col gap-2 py-5">
          <Link href="/akun/riwayat">
            <ScrollText className="size-5" />
            Riwayat Treatment
          </Link>
        </Button>
      </div>

      {upcoming.length > 1 ? (
        <Card>
          <CardHeader>
            <CardTitle>Jadwal mendatang lainnya</CardTitle>
          </CardHeader>
          <ul className="space-y-2 px-5 pb-5">
            {upcoming.slice(1).map((item) => (
              <li key={item.id}>
                <Link
                  href={`/akun/reservasi/${item.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-border p-3"
                >
                  <span className="flex w-16 flex-col items-center rounded-xl bg-[var(--color-cream)] px-2 py-1.5">
                    <span className="font-display text-sm font-bold text-primary">{item.startTime}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDateId(item.date, { short: true }).slice(0, 6)}
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{item.service.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{item.baby.name}</span>
                  </span>
                  <StatusBadge status={item.status} />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {customer && customer.babies.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Profil bayi</CardTitle>
          </CardHeader>
          <ul className="grid gap-2 px-5 pb-5 sm:grid-cols-2">
            {customer.babies.map((baby) => (
              <li key={baby.id} className="rounded-2xl border border-border p-3">
                <p className="font-semibold">{baby.name}</p>
                <p className="text-xs text-muted-foreground">
                  {babyAge(baby.birthDate)} · {baby.gender === 'MALE' ? 'Laki-laki' : 'Perempuan'}
                  {baby.weightKg ? ` · ${baby.weightKg} kg` : ''}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {promos.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Promo untuk Anda</CardTitle>
          </CardHeader>
          <ul className="space-y-2 px-5 pb-5">
            {promos.map((promo) => (
              <li
                key={promo.id}
                className="flex items-start gap-3 rounded-2xl border border-dashed border-primary/40 bg-[var(--color-cream)]/60 p-3"
              >
                <Ticket className="mt-0.5 size-4 text-primary" />
                <div>
                  <p className="font-mono text-sm font-bold text-primary">{promo.code}</p>
                  <p className="text-sm">{promo.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {promo.discountType === 'PERCENT'
                      ? `Diskon ${promo.discountValue}%`
                      : `Potongan ${formatCurrency(promo.discountValue)}`}{' '}
                    · berlaku sampai {formatDateId(promo.endDate, { short: true })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="size-4" /> Butuh bantuan?
          </CardTitle>
        </CardHeader>
        <div className="px-5 pb-5 text-sm text-muted-foreground">
          <p>{settings.cancelPolicyText}</p>
          <p className="mt-2">
            Hubungi kami di WhatsApp{' '}
            <a
              href={`https://wa.me/${settings.businessWhatsapp}`}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-primary hover:underline"
            >
              {settings.businessWhatsapp}
            </a>
          </p>
        </div>
      </Card>
    </div>
  );
}
