'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { CalendarClock, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Input, Textarea } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { apiFetch } from '@/lib/client';

type Slot = { time: string; available: boolean };

export function CustomerReservationActions({
  reservation,
  policyText,
}: {
  reservation: { id: string; status: string; date: string; startTime: string; serviceId: string };
  policyText: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [date, setDate] = useState(reservation.date);
  const [startTime, setStartTime] = useState(reservation.startTime);
  const [slots, setSlots] = useState<Slot[]>([]);

  if (!['PENDING', 'CONFIRMED'].includes(reservation.status)) {
    return <p className="text-sm text-muted-foreground">{policyText}</p>;
  }

  async function loadSlots(nextDate: string) {
    setDate(nextDate);
    try {
      const data = await apiFetch<{ slots: Slot[] }>(
        `/api/availability?date=${nextDate}&serviceId=${reservation.serviceId}&excludeReservationId=${reservation.id}`,
      );
      setSlots(data.slots);
      const firstAvailable = data.slots.find((slot) => slot.available);
      setStartTime((current) =>
        data.slots.some((slot) => slot.time === current && slot.available)
          ? current
          : firstAvailable?.time ?? '',
      );
    } catch {
      setSlots([]);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setRescheduleOpen(true);
            void loadSlots(date);
          }}
        >
          <CalendarClock className="size-4" /> Ubah jadwal
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setCancelOpen(true)}>
          <XCircle className="size-4 text-destructive" /> Batalkan
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{policyText}</p>

      <Dialog open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ubah jadwal treatment</DialogTitle>
            <DialogDescription>
              Pilih tanggal dan jam baru. Slot yang sudah penuh tidak dapat dipilih.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Field label="Tanggal" htmlFor="cust-date">
              <Input
                id="cust-date"
                type="date"
                value={date}
                onChange={(event) => void loadSlots(event.target.value)}
              />
            </Field>
            <Field label="Jam" htmlFor="cust-time">
              <NativeSelect
                id="cust-time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
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
                setBusy(true);
                try {
                  await apiFetch(`/api/reservations/${reservation.id}`, {
                    method: 'PATCH',
                    json: { date, startTime },
                  });
                  toast.success('Jadwal berhasil diubah');
                  setRescheduleOpen(false);
                  router.refresh();
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : 'Gagal mengubah jadwal');
                } finally {
                  setBusy(false);
                }
              }}
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Batalkan reservasi?</DialogTitle>
            <DialogDescription>{policyText}</DialogDescription>
          </DialogHeader>
          <Field label="Alasan pembatalan (opsional)" htmlFor="cancel-reason">
            <Textarea
              id="cancel-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Contoh: bayi sedang kurang sehat"
            />
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>
              Kembali
            </Button>
            <Button
              variant="destructive"
              loading={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await apiFetch(
                    `/api/reservations/${reservation.id}?reason=${encodeURIComponent(reason || 'Dibatalkan pelanggan')}`,
                    { method: 'DELETE' },
                  );
                  toast.success('Reservasi dibatalkan');
                  setCancelOpen(false);
                  router.refresh();
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : 'Gagal membatalkan');
                } finally {
                  setBusy(false);
                }
              }}
            >
              Ya, batalkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
