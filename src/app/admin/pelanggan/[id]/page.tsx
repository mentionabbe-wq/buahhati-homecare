import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, BabyIcon, MapPin, MessageCircle } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, StatCard } from '@/components/ui/card';
import { PaymentBadge, StatusBadge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/misc';
import { babyAge, formatDateId } from '@/lib/datetime';
import { formatCurrency, waLink } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function AdminCustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      babies: { orderBy: { createdAt: 'asc' } },
      reservations: {
        include: {
          service: { select: { name: true } },
          therapist: { select: { name: true } },
          baby: { select: { name: true } },
        },
        orderBy: { date: 'desc' },
        take: 50,
      },
    },
  });
  if (!customer) notFound();

  const completed = customer.reservations.filter((r) => r.status === 'COMPLETED').length;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/pelanggan">
            <ArrowLeft className="size-4" /> Kembali
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="font-display text-xl font-bold sm:text-2xl">{customer.name}</h1>
          <p className="text-sm text-muted-foreground">
            {customer.phone}
            {customer.email ? ` · ${customer.email}` : ''}
          </p>
        </div>
        <Button asChild size="sm" variant="secondary">
          <a href={waLink(customer.phone)} target="_blank" rel="noreferrer">
            <MessageCircle className="size-4" /> WhatsApp
          </a>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total reservasi" value={customer.reservations.length} tone="cream" />
        <StatCard label="Treatment selesai" value={completed} tone="sky" />
        <StatCard label="Jumlah bayi" value={customer.babies.length} tone="blush" />
        <StatCard label="Total transaksi" value={formatCurrency(customer.totalSpent)} tone="primary" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="size-4" /> Alamat
            </CardTitle>
          </CardHeader>
          <div className="space-y-1 px-5 pb-5 text-sm">
            <p>{customer.address ?? '—'}</p>
            <p className="text-muted-foreground">
              {[customer.village, customer.district].filter(Boolean).join(', ') || '—'}
            </p>
            {customer.landmark ? (
              <p className="text-muted-foreground">Patokan: {customer.landmark}</p>
            ) : null}
            {customer.locationNote ? (
              <p className="text-muted-foreground">{customer.locationNote}</p>
            ) : null}
            {customer.mapsUrl ? (
              <a
                href={customer.mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline"
              >
                Buka di Google Maps
              </a>
            ) : null}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BabyIcon className="size-4" /> Daftar bayi
            </CardTitle>
          </CardHeader>
          <div className="px-5 pb-5">
            {customer.babies.length === 0 ? (
              <EmptyState title="Belum ada profil bayi" />
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {customer.babies.map((baby) => (
                  <li key={baby.id}>
                    <Link
                      href={`/admin/bayi/${baby.id}`}
                      className="block rounded-2xl border border-border p-3 transition hover:bg-muted/50"
                    >
                      <p className="font-semibold">{baby.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {babyAge(baby.birthDate)} · {baby.gender === 'MALE' ? 'Laki-laki' : 'Perempuan'}
                        {baby.weightKg ? ` · ${baby.weightKg} kg` : ''}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Riwayat reservasi</CardTitle>
        </CardHeader>
        <div className="px-5 pb-5">
          {customer.reservations.length === 0 ? (
            <EmptyState title="Belum ada reservasi" />
          ) : (
            <ul className="space-y-2">
              {customer.reservations.map((reservation) => (
                <li key={reservation.id}>
                  <Link
                    href={`/admin/reservasi/${reservation.id}`}
                    className="flex flex-wrap items-center gap-3 rounded-2xl border border-border p-3 transition hover:bg-muted/50"
                  >
                    <span className="font-mono text-xs font-semibold">{reservation.reservationCode}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {reservation.baby.name} · {reservation.service.name}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {formatDateId(reservation.date, { short: true })} · {reservation.startTime} ·{' '}
                        {reservation.therapist?.name ?? 'Tanpa terapis'}
                      </span>
                    </span>
                    <span className="text-sm font-semibold">{formatCurrency(reservation.total)}</span>
                    <StatusBadge status={reservation.status} />
                    <PaymentBadge status={reservation.paymentStatus} />
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
