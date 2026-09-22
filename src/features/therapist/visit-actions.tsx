'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Car, CheckCircle2, MapPinCheck, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/client';
import { STATUS_LABEL, type ReservationStatus } from '@/lib/constants';

const FLOW: { status: ReservationStatus; label: string; icon: React.ElementType }[] = [
  { status: 'ON_THE_WAY', label: 'Berangkat ke lokasi', icon: Car },
  { status: 'ARRIVED', label: 'Tiba di lokasi', icon: MapPinCheck },
  { status: 'IN_SERVICE', label: 'Mulai treatment', icon: PlayCircle },
  { status: 'COMPLETED', label: 'Selesaikan treatment', icon: CheckCircle2 },
];

/** Tombol perpindahan status kunjungan untuk terapis di lapangan. */
export function VisitActions({
  reservationId,
  status,
}: {
  reservationId: string;
  status: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const currentIndex = FLOW.findIndex((step) => step.status === status);
  const next = status === 'CONFIRMED' ? FLOW[0] : FLOW[currentIndex + 1];

  if (['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(status)) {
    return (
      <p className="rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">
        Kunjungan sudah ditutup dengan status {STATUS_LABEL[status as ReservationStatus] ?? status}.
      </p>
    );
  }
  if (status === 'PENDING') {
    return (
      <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Menunggu konfirmasi admin sebelum kunjungan dapat dimulai.
      </p>
    );
  }
  if (!next) return null;

  const Icon = next.icon;

  return (
    <Button
      className="w-full"
      loading={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await apiFetch(`/api/reservations/${reservationId}`, {
            method: 'PATCH',
            json: { status: next.status },
          });
          toast.success(`Status: ${STATUS_LABEL[next.status]}`);
          router.refresh();
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Gagal memperbarui status');
        } finally {
          setBusy(false);
        }
      }}
    >
      <Icon className="size-4" /> {next.label}
    </Button>
  );
}
