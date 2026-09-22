import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, MapPin, MessageCircle } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { getSettings } from '@/services/settings.service';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { PaymentBadge, StatusBadge } from '@/components/ui/badge';
import { ReservationQr } from '@/components/qr-code';
import { ReservationTimeline } from '@/components/reservation-timeline';
import { CustomerReservationActions } from '@/features/customer/reservation-actions';
import { babyAge, formatDateId, toDateKey } from '@/lib/datetime';
import { formatCurrency, parseJsonArray, waLink } from '@/lib/utils';
import { PAYMENT_METHOD_LABEL } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export default async function CustomerReservationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session?.customerId) redirect('/login');

  const [reservation, settings] = await Promise.all([
    prisma.reservation.findFirst({
      where: { id, customerId: session.customerId },
      include: {
        service: true,
        baby: true,
        therapist: { select: { name: true, phone: true, photoUrl: true } },
        payments: { orderBy: { createdAt: 'desc' } },
        statusHistory: { orderBy: { createdAt: 'asc' } },
        treatment: true,
      },
    }),
    getSettings(),
  ]);
  if (!reservation) notFound();

  const treatmentAreas = parseJsonArray(reservation.treatment?.treatmentAreas);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/akun/reservasi">
            <ArrowLeft className="size-4" /> Kembali
          </Link>
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="bh-gradient flex flex-col items-center gap-3 px-5 py-6">
          <ReservationQr code={reservation.reservationCode} size={128} />
          <div className="text-center">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Nomor Reservasi</p>
            <p className="font-display text-xl font-bold tracking-wide text-primary">
              {reservation.reservationCode}
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <StatusBadge status={reservation.status} />
            <PaymentBadge status={reservation.paymentStatus} />
          </div>
        </div>

        <dl className="grid gap-3 p-5 sm:grid-cols-2">
          <Row label="Bayi" value={`${reservation.baby.name} · ${babyAge(reservation.baby.birthDate)}`} />
          <Row label="Layanan" value={reservation.service.name} />
          <Row label="Tanggal" value={formatDateId(reservation.date, { withDay: true })} />
          <Row
            label="Jam"
            value={`${reservation.startTime} – ${reservation.endTime} WIB (${reservation.service.durationMinutes} menit)`}
          />
          <Row label="Terapis" value={reservation.therapist?.name ?? 'Akan ditentukan admin'} />
          <Row label="Metode bayar" value={
            PAYMENT_METHOD_LABEL[
              (reservation.payments[0]?.method ?? 'CASH') as keyof typeof PAYMENT_METHOD_LABEL
            ]
          } />
        </dl>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status kunjungan</CardTitle>
        </CardHeader>
        <div className="px-5 pb-5">
          <ReservationTimeline history={reservation.statusHistory} status={reservation.status} />
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="size-4" /> Alamat home care
          </CardTitle>
        </CardHeader>
        <div className="space-y-1 px-5 pb-5 text-sm">
          <p>{reservation.address}</p>
          <p className="text-muted-foreground">
            {[reservation.village, reservation.district].filter(Boolean).join(', ') || '—'}
          </p>
          {reservation.landmark ? (
            <p className="text-muted-foreground">Patokan: {reservation.landmark}</p>
          ) : null}
          {reservation.mapsUrl ? (
            <a
              href={reservation.mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline"
            >
              Buka lokasi di Google Maps
            </a>
          ) : null}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rincian biaya</CardTitle>
        </CardHeader>
        <div className="px-5 pb-5 text-sm">
          <Line label="Harga layanan" value={formatCurrency(reservation.servicePrice)} />
          <Line label="Biaya home care" value={formatCurrency(reservation.transportFee)} />
          <Line label="Diskon" value={`- ${formatCurrency(reservation.discount)}`} />
          <div className="mt-2 flex justify-between border-t border-border pt-3 font-display text-base font-bold">
            <span>Total</span>
            <span className="text-primary">{formatCurrency(reservation.total)}</span>
          </div>
          {reservation.paymentStatus !== 'PAID' ? (
            <p className="mt-3 rounded-2xl bg-[var(--color-cream)] px-4 py-3 text-xs">
              Pembayaran dapat dilakukan tunai saat treatment, transfer ke {settings.bankAccount}, atau
              QRIS. Konfirmasikan ke admin setelah transfer.
            </p>
          ) : null}
        </div>
      </Card>

      {reservation.treatment ? (
        <Card>
          <CardHeader>
            <CardTitle>Catatan treatment</CardTitle>
          </CardHeader>
          <dl className="grid gap-3 px-5 pb-5 text-sm">
            <Row label="Kondisi sebelum" value={reservation.treatment.conditionBefore ?? '-'} />
            <Row label="Kondisi setelah" value={reservation.treatment.conditionAfter ?? '-'} />
            <Row label="Respon bayi" value={reservation.treatment.babyResponse ?? '-'} />
            <Row label="Area treatment" value={treatmentAreas.join(', ') || '-'} />
            <Row label="Catatan terapis" value={reservation.treatment.notes ?? '-'} />
            <Row label="Rekomendasi" value={reservation.treatment.recommendation ?? '-'} />
          </dl>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Ubah reservasi</CardTitle>
        </CardHeader>
        <div className="space-y-3 px-5 pb-5">
          <CustomerReservationActions
            reservation={{
              id: reservation.id,
              status: reservation.status,
              date: toDateKey(reservation.date),
              startTime: reservation.startTime,
              serviceId: reservation.serviceId,
            }}
            policyText={settings.cancelPolicyText}
          />
          <Button asChild variant="secondary" size="sm">
            <a
              href={waLink(
                settings.businessWhatsapp,
                `Halo, saya ingin bertanya tentang reservasi ${reservation.reservationCode}.`,
              )}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle className="size-4" /> Hubungi admin
            </a>
          </Button>
        </div>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm">{value}</dd>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-0.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
