import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  BabyIcon,
  ClipboardList,
  CreditCard,
  MapPin,
  MessageCircle,
  Printer,
  StickyNote,
  UserRound,
} from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { PaymentBadge, StatusBadge } from '@/components/ui/badge';
import { ReservationQr } from '@/components/qr-code';
import { ReservationTimeline } from '@/components/reservation-timeline';
import { PaymentPanel } from '@/features/admin/payment-panel';
import { ReservationActions } from '@/features/admin/reservation-actions';
import { AdminNoteForm } from '@/features/admin/admin-note-form';
import { babyAge, formatDateId, formatDateTimeId, toDateKey } from '@/lib/datetime';
import { BABY_CONDITIONS } from '@/lib/constants';
import { formatCurrency, parseJsonArray, waLink } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function AdminReservationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [reservation, therapists] = await Promise.all([
    prisma.reservation.findUnique({
      where: { id },
      include: {
        customer: true,
        baby: true,
        service: true,
        therapist: true,
        promo: true,
        payments: { orderBy: { createdAt: 'desc' } },
        statusHistory: { orderBy: { createdAt: 'asc' } },
        treatment: { include: { therapist: { select: { name: true } } } },
        notifications: { orderBy: { createdAt: 'desc' }, take: 8 },
      },
    }),
    prisma.therapist.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
  ]);

  if (!reservation) notFound();

  const conditions = parseJsonArray(reservation.babyConditions).map(
    (value) => BABY_CONDITIONS.find((c) => c.value === value)?.label ?? value,
  );
  const treatmentAreas = reservation.treatment
    ? parseJsonArray(reservation.treatment.treatmentAreas)
    : [];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/reservasi">
            <ArrowLeft className="size-4" /> Kembali
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="font-display text-xl font-bold sm:text-2xl">{reservation.reservationCode}</h1>
          <p className="text-sm text-muted-foreground">
            Dibuat {formatDateTimeId(reservation.createdAt)}
          </p>
        </div>
        <StatusBadge status={reservation.status} />
        <PaymentBadge status={reservation.paymentStatus} />
        <Button asChild size="sm" variant="outline">
          <Link href={`/admin/reservasi/${reservation.id}/invoice`} target="_blank">
            <Printer className="size-4" /> Cetak invoice
          </Link>
        </Button>
        <Button asChild size="sm" variant="secondary">
          <a
            href={waLink(
              reservation.customer.phone,
              `Halo Kak ${reservation.customer.name}, mengenai reservasi ${reservation.reservationCode}…`,
            )}
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle className="size-4" /> WhatsApp
          </a>
        </Button>
      </div>

      {reservation.needsReview ? (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Reservasi ini ditandai perlu ditinjau karena kondisi bayi yang dilaporkan. Konfirmasikan dengan
          orang tua dan terapis sebelum mengubah status menjadi dikonfirmasi.
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Detail reservasi</CardTitle>
            </CardHeader>
            <div className="grid gap-4 px-5 pb-5 sm:grid-cols-2">
              <InfoBlock
                icon={<UserRound className="size-4" />}
                title="Orang tua"
                rows={[
                  ['Nama', reservation.customer.name],
                  ['WhatsApp', reservation.customer.phone],
                  ['Email', reservation.customer.email ?? '-'],
                ]}
                href={`/admin/pelanggan/${reservation.customerId}`}
              />
              <InfoBlock
                icon={<BabyIcon className="size-4" />}
                title="Bayi"
                rows={[
                  ['Nama', reservation.baby.name],
                  ['Usia', babyAge(reservation.baby.birthDate)],
                  ['Jenis kelamin', reservation.baby.gender === 'MALE' ? 'Laki-laki' : 'Perempuan'],
                  ['Berat', reservation.baby.weightKg ? `${reservation.baby.weightKg} kg` : '-'],
                ]}
                href={`/admin/bayi/${reservation.babyId}`}
              />
              <InfoBlock
                icon={<ClipboardList className="size-4" />}
                title="Layanan"
                rows={[
                  ['Layanan', reservation.service.name],
                  ['Durasi', `${reservation.service.durationMinutes} menit`],
                  ['Tanggal', formatDateId(reservation.date, { withDay: true })],
                  ['Jam', `${reservation.startTime} – ${reservation.endTime} WIB`],
                  ['Terapis', reservation.therapist?.name ?? 'Belum ditugaskan'],
                ]}
              />
              <InfoBlock
                icon={<MapPin className="size-4" />}
                title="Alamat home care"
                rows={[
                  ['Alamat', reservation.address],
                  ['Kecamatan', reservation.district ?? '-'],
                  ['Kelurahan', reservation.village ?? '-'],
                  ['Patokan', reservation.landmark ?? '-'],
                  ['Catatan', reservation.locationNote ?? '-'],
                ]}
              />
            </div>

            <div className="border-t border-border px-5 py-4">
              <p className="text-sm font-semibold">Kondisi bayi saat reservasi</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {conditions.length > 0 ? (
                  conditions.map((label) => (
                    <span
                      key={label}
                      className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
                    >
                      {label}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">Tidak ada data</span>
                )}
              </div>
              {reservation.conditionNote ? (
                <p className="mt-3 rounded-2xl bg-muted px-4 py-3 text-sm">{reservation.conditionNote}</p>
              ) : null}
              {reservation.customerNote ? (
                <p className="mt-3 rounded-2xl bg-[var(--color-accent-soft)] px-4 py-3 text-sm">
                  Catatan pelanggan: {reservation.customerNote}
                </p>
              ) : null}
            </div>
          </Card>

          {reservation.treatment ? (
            <Card>
              <CardHeader>
                <CardTitle>Catatan treatment</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Diisi oleh {reservation.treatment.therapist.name} ·{' '}
                  {formatDateTimeId(reservation.treatment.createdAt)}
                </p>
              </CardHeader>
              <dl className="grid gap-3 px-5 pb-5 sm:grid-cols-2">
                <Detail label="Kondisi sebelum" value={reservation.treatment.conditionBefore} />
                <Detail label="Kondisi selama" value={reservation.treatment.conditionDuring} />
                <Detail label="Kondisi setelah" value={reservation.treatment.conditionAfter} />
                <Detail label="Respon bayi" value={reservation.treatment.babyResponse} />
                <Detail label="Durasi" value={`${reservation.treatment.durationMinutes} menit`} />
                <Detail label="Area treatment" value={treatmentAreas.join(', ')} />
                <Detail label="Catatan" value={reservation.treatment.notes} className="sm:col-span-2" />
                <Detail
                  label="Rekomendasi"
                  value={reservation.treatment.recommendation}
                  className="sm:col-span-2"
                />
                <Detail
                  label="Konfirmasi digital"
                  value={
                    reservation.treatment.signedAt
                      ? `${reservation.treatment.signatureName ?? '-'} · ${formatDateTimeId(reservation.treatment.signedAt)}`
                      : 'Belum ditandatangani'
                  }
                  className="sm:col-span-2"
                />
              </dl>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Riwayat notifikasi WhatsApp</CardTitle>
            </CardHeader>
            <div className="px-5 pb-5">
              {reservation.notifications.length === 0 ? (
                <p className="text-sm text-muted-foreground">Belum ada notifikasi terkirim.</p>
              ) : (
                <ul className="space-y-2">
                  {reservation.notifications.map((item) => (
                    <li key={item.id} className="rounded-2xl border border-border p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold">{item.template}</p>
                        <span className="text-xs text-muted-foreground">
                          {item.status} · {formatDateTimeId(item.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1 whitespace-pre-line text-xs text-muted-foreground">
                        {item.message}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Aksi</CardTitle>
            </CardHeader>
            <div className="px-5 pb-5">
              <ReservationActions
                reservation={{
                  id: reservation.id,
                  status: reservation.status,
                  date: toDateKey(reservation.date),
                  startTime: reservation.startTime,
                  serviceId: reservation.serviceId,
                  therapistId: reservation.therapistId,
                }}
                therapists={therapists.map((t) => ({ id: t.id, name: t.name }))}
              />
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <div className="px-5 pb-5">
              <ReservationTimeline history={reservation.statusHistory} status={reservation.status} />
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="size-4" /> Pembayaran
              </CardTitle>
            </CardHeader>
            <div className="space-y-3 px-5 pb-5">
              <div className="rounded-2xl bg-muted/60 p-4 text-sm">
                <Row label="Harga layanan" value={formatCurrency(reservation.servicePrice)} />
                <Row label="Biaya home care" value={formatCurrency(reservation.transportFee)} />
                <Row
                  label={`Diskon${reservation.promo ? ` (${reservation.promo.code})` : ''}`}
                  value={`- ${formatCurrency(reservation.discount)}`}
                />
                <div className="mt-2 flex justify-between border-t border-border pt-2 font-display text-base font-bold">
                  <span>Total</span>
                  <span className="text-primary">{formatCurrency(reservation.total)}</span>
                </div>
              </div>
              <PaymentPanel
                reservationId={reservation.id}
                total={reservation.total}
                payments={reservation.payments.map((p) => ({
                  ...p,
                  paidAt: p.paidAt ? p.paidAt.toISOString() : null,
                  createdAt: p.createdAt.toISOString(),
                }))}
              />
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <StickyNote className="size-4" /> Catatan admin
              </CardTitle>
            </CardHeader>
            <div className="px-5 pb-5">
              <AdminNoteForm reservationId={reservation.id} value={reservation.adminNote ?? ''} />
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Kode QR</CardTitle>
            </CardHeader>
            <div className="flex flex-col items-center gap-2 px-5 pb-5">
              <ReservationQr code={reservation.reservationCode} />
              <p className="font-mono text-xs text-muted-foreground">{reservation.reservationCode}</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function InfoBlock({
  icon,
  title,
  rows,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  rows: [string, string][];
  href?: string;
}) {
  const content = (
    <div className="h-full rounded-2xl border border-border p-4">
      <p className="flex items-center gap-2 font-display text-sm font-bold">
        <span className="text-primary">{icon}</span>
        {title}
      </p>
      <dl className="mt-3 space-y-1.5">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3 text-sm">
            <dt className="shrink-0 text-muted-foreground">{label}</dt>
            <dd className="text-right font-medium">{value || '-'}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
  return href ? (
    <Link href={href} className="transition hover:opacity-80">
      {content}
    </Link>
  ) : (
    content
  );
}

function Detail({
  label,
  value,
  className,
}: {
  label: string;
  value: string | null;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm">{value || '-'}</dd>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-0.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
