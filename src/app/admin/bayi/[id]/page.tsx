import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, StatCard } from '@/components/ui/card';
import { BabyTimeline } from '@/components/baby-timeline';
import { babyAge, formatDateId } from '@/lib/datetime';

export const dynamic = 'force-dynamic';

export default async function AdminBabyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const baby = await prisma.baby.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      reservations: {
        include: {
          service: { select: { name: true, durationMinutes: true } },
          therapist: { select: { name: true } },
          treatment: true,
        },
        orderBy: { date: 'desc' },
      },
    },
  });
  if (!baby) notFound();

  const completed = baby.reservations.filter((r) => r.status === 'COMPLETED');

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/bayi">
            <ArrowLeft className="size-4" /> Kembali
          </Link>
        </Button>
        <div>
          <h1 className="font-display text-xl font-bold sm:text-2xl">{baby.name}</h1>
          <p className="text-sm text-muted-foreground">
            Anak dari{' '}
            <Link href={`/admin/pelanggan/${baby.customerId}`} className="text-primary hover:underline">
              {baby.customer.name}
            </Link>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Usia" value={babyAge(baby.birthDate)} tone="blush" />
        <StatCard
          label="Tanggal lahir"
          value={formatDateId(baby.birthDate, { short: true })}
          tone="cream"
        />
        <StatCard label="Berat badan" value={baby.weightKg ? `${baby.weightKg} kg` : '—'} tone="sky" />
        <StatCard label="Treatment selesai" value={completed.length} tone="primary" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Informasi bayi</CardTitle>
          </CardHeader>
          <dl className="space-y-2 px-5 pb-5 text-sm">
            <Row label="Jenis kelamin" value={baby.gender === 'MALE' ? 'Laki-laki' : 'Perempuan'} />
            <Row label="Catatan" value={baby.notes ?? '—'} />
            <Row label="Riwayat alergi" value={baby.allergies ?? '—'} />
            <Row label="Status" value={baby.isActive ? 'Aktif' : 'Nonaktif'} />
          </dl>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Timeline treatment</CardTitle>
            <p className="text-sm text-muted-foreground">
              Seluruh kunjungan beserta catatan terapis.
            </p>
          </CardHeader>
          <div className="px-5 pb-5">
            <BabyTimeline entries={baby.reservations} hrefPrefix="/admin/reservasi" />
          </div>
        </Card>
      </div>
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
