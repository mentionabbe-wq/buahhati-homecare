import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, MapPin, MessageCircle, Phone } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/badge';
import { ReservationTimeline } from '@/components/reservation-timeline';
import { VisitActions } from '@/features/therapist/visit-actions';
import { TreatmentForm } from '@/features/therapist/treatment-form';
import { babyAge, formatDateId } from '@/lib/datetime';
import { BABY_CONDITIONS } from '@/lib/constants';
import { parseJsonArray, waLink } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function TherapistReservationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect('/login');

  const reservation = await prisma.reservation.findFirst({
    where: {
      id,
      ...(session.role === 'THERAPIST' ? { therapistId: session.therapistId ?? '__none__' } : {}),
    },
    include: {
      customer: { select: { name: true, phone: true } },
      baby: true,
      service: true,
      treatment: true,
      statusHistory: { orderBy: { createdAt: 'asc' } },
    },
  });
  if (!reservation) notFound();

  const conditions = parseJsonArray(reservation.babyConditions).map(
    (value) => BABY_CONDITIONS.find((c) => c.value === value)?.label ?? value,
  );

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm">
        <Link href="/terapis/jadwal">
          <ArrowLeft className="size-4" /> Kembali
        </Link>
      </Button>

      <Card>
        <div className="bh-gradient flex items-start justify-between gap-3 px-5 py-4">
          <div>
            <p className="font-mono text-xs font-semibold text-muted-foreground">
              {reservation.reservationCode}
            </p>
            <p className="font-display text-lg font-bold">{reservation.baby.name}</p>
            <p className="text-sm text-muted-foreground">
              {babyAge(reservation.baby.birthDate)} ·{' '}
              {reservation.baby.gender === 'MALE' ? 'Laki-laki' : 'Perempuan'}
              {reservation.baby.weightKg ? ` · ${reservation.baby.weightKg} kg` : ''}
            </p>
          </div>
          <StatusBadge status={reservation.status} />
        </div>

        <dl className="grid gap-3 p-5 sm:grid-cols-2">
          <Row label="Layanan" value={`${reservation.service.name} (${reservation.service.durationMinutes} menit)`} />
          <Row label="Jadwal" value={`${formatDateId(reservation.date, { withDay: true })} · ${reservation.startTime}`} />
          <Row label="Orang tua" value={reservation.customer.name} />
          <Row label="Kondisi bayi" value={conditions.join(', ') || '-'} />
        </dl>

        {reservation.conditionNote || reservation.customerNote || reservation.baby.allergies ? (
          <div className="space-y-2 border-t border-border px-5 py-4 text-sm">
            {reservation.baby.allergies ? (
              <p className="rounded-xl bg-rose-50 px-3 py-2 text-rose-900">
                Riwayat alergi: {reservation.baby.allergies}
              </p>
            ) : null}
            {reservation.conditionNote ? (
              <p className="rounded-xl bg-amber-50 px-3 py-2 text-amber-900">
                Catatan kondisi: {reservation.conditionNote}
              </p>
            ) : null}
            {reservation.customerNote ? (
              <p className="rounded-xl bg-[var(--color-accent-soft)] px-3 py-2">
                Catatan orang tua: {reservation.customerNote}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="border-t border-border px-5 py-4">
          <p className="flex items-start gap-2 text-sm">
            <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>
              {reservation.address}
              <span className="block text-xs text-muted-foreground">
                {[reservation.village, reservation.district].filter(Boolean).join(', ')}
                {reservation.landmark ? ` · ${reservation.landmark}` : ''}
              </span>
              {reservation.locationNote ? (
                <span className="block text-xs text-muted-foreground">{reservation.locationNote}</span>
              ) : null}
            </span>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <a href={`tel:${reservation.customer.phone}`}>
                <Phone className="size-4" /> Telepon
              </a>
            </Button>
            <Button asChild size="sm" variant="secondary">
              <a href={waLink(reservation.customer.phone)} target="_blank" rel="noreferrer">
                <MessageCircle className="size-4" /> WhatsApp
              </a>
            </Button>
            {reservation.mapsUrl ? (
              <Button asChild size="sm" variant="outline">
                <a href={reservation.mapsUrl} target="_blank" rel="noreferrer">
                  <MapPin className="size-4" /> Peta
                </a>
              </Button>
            ) : null}
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status kunjungan</CardTitle>
        </CardHeader>
        <div className="space-y-4 px-5 pb-5">
          <VisitActions reservationId={reservation.id} status={reservation.status} />
          <ReservationTimeline history={reservation.statusHistory} status={reservation.status} />
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Catatan treatment</CardTitle>
          <p className="text-sm text-muted-foreground">
            Isi setelah layanan selesai. Catatan akan terlihat oleh admin dan orang tua.
          </p>
        </CardHeader>
        <div className="px-5 pb-5">
          <TreatmentForm
            reservationId={reservation.id}
            defaultDuration={reservation.service.durationMinutes}
            initial={reservation.treatment}
          />
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
