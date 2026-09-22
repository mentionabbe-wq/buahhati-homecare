'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { CalendarClock, CheckCircle2, Send, UserCog, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Input, Textarea } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/select';
import {
  ConfirmDialog,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { apiFetch } from '@/lib/client';
import { STATUS_LABEL, STATUS_TRANSITIONS, type ReservationStatus } from '@/lib/constants';
import { toDateKey } from '@/lib/datetime';

type Slot = { time: string; available: boolean };

export function ReservationActions({
  reservation,
  therapists,
}: {
  reservation: {
    id: string;
    status: string;
    date: string;
    startTime: string;
    serviceId: string;
    therapistId: string | null;
  };
  therapists: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);

  const [date, setDate] = useState(toDateKey(reservation.date));
  const [startTime, setStartTime] = useState(reservation.startTime);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [therapistId, setTherapistId] = useState(reservation.therapistId ?? '');

  const nextStatuses = (STATUS_TRANSITIONS[reservation.status as ReservationStatus] ?? []).filter(
    (status) => status !== 'CANCELLED',
  );

  async function patch(body: Record<string, unknown>, successMessage: string) {
    setBusy(true);
    try {
      await apiFetch(`/api/reservations/${reservation.id}`, { method: 'PATCH', json: body });
      toast.success(successMessage);
      router.refresh();
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal memperbarui reservasi');
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function loadSlots(nextDate: string) {
    setDate(nextDate);
    try {
      const data = await apiFetch<{ slots: Slot[] }>(
        `/api/availability?date=${nextDate}&serviceId=${reservation.serviceId}&excludeReservationId=${reservation.id}`,
      );
      setSlots(data.slots);
    } catch {
      setSlots([]);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {nextStatuses.map((status) => (
          <Button
            key={status}
            size="sm"
            variant={status === 'COMPLETED' ? 'default' : 'secondary'}
            disabled={busy}
            onClick={() => patch({ status }, `Status diubah menjadi ${STATUS_LABEL[status]}`)}
          >
            {status === 'CONFIRMED' ? <CheckCircle2 className="size-4" /> : <Send className="size-4" />}
            {STATUS_LABEL[status]}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => {
            setRescheduleOpen(true);
            void loadSlots(date);
          }}
        >
          <CalendarClock className="size-4" /> Reschedule
        </Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => setAssignOpen(true)}>
          <UserCog className="size-4" /> Tugaskan terapis
        </Button>
        {!['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(reservation.status) ? (
          <Button size="sm" variant="destructive" disabled={busy} onClick={() => setConfirmCancel(true)}>
            <XCircle className="size-4" /> Batalkan
          </Button>
        ) : null}
      </div>

      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        destructive
        loading={busy}
        title="Batalkan reservasi ini?"
        description="Pelanggan akan menerima notifikasi WhatsApp pembatalan. Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Ya, batalkan"
        onConfirm={async () => {
          const okDone = await patch(
            { status: 'CANCELLED', cancelReason: cancelReason || 'Dibatalkan admin' },
            'Reservasi dibatalkan',
          );
          if (okDone) setConfirmCancel(false);
        }}
      />

      <Dialog open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule reservasi</DialogTitle>
            <DialogDescription>
              Sistem memeriksa ulang ketersediaan slot dan terapis sebelum menyimpan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Field label="Tanggal baru" htmlFor="reschedule-date">
              <Input
                id="reschedule-date"
                type="date"
                value={date}
                onChange={(e) => void loadSlots(e.target.value)}
              />
            </Field>
            <Field label="Jam baru" htmlFor="reschedule-time">
              <NativeSelect
                id="reschedule-time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              >
                {slots.length === 0 ? <option value={startTime}>{startTime}</option> : null}
                {slots.map((slot) => (
                  <option key={slot.time} value={slot.time} disabled={!slot.available}>
                    {slot.time} {slot.available ? '' : '— penuh'}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleOpen(false)}>
              Batal
            </Button>
            <Button
              loading={busy}
              onClick={async () => {
                const okDone = await patch({ date, startTime }, 'Jadwal berhasil diubah');
                if (okDone) setRescheduleOpen(false);
              }}
            >
              Simpan jadwal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tugaskan terapis</DialogTitle>
            <DialogDescription>
              Terapis yang bentrok jadwal akan ditolak sistem saat disimpan.
            </DialogDescription>
          </DialogHeader>
          <Field label="Terapis" htmlFor="assign-therapist">
            <NativeSelect
              id="assign-therapist"
              value={therapistId}
              onChange={(e) => setTherapistId(e.target.value)}
            >
              <option value="">Belum ditugaskan</option>
              {therapists.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>
              Batal
            </Button>
            <Button
              loading={busy}
              onClick={async () => {
                const okDone = await patch({ therapistId: therapistId || null }, 'Terapis diperbarui');
                if (okDone) setAssignOpen(false);
              }}
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <details className="rounded-2xl border border-border p-4">
        <summary className="cursor-pointer text-sm font-semibold">Alasan pembatalan (opsional)</summary>
        <Textarea
          className="mt-3"
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          placeholder="Isi bila reservasi dibatalkan agar tercatat pada riwayat."
        />
      </details>
    </div>
  );
}
