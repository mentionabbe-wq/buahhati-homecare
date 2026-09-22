'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { apiFetch } from '@/lib/client';

export function AdminNoteForm({ reservationId, value }: { reservationId: string; value: string }) {
  const router = useRouter();
  const [note, setNote] = useState(value);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await apiFetch(`/api/reservations/${reservationId}`, {
        method: 'PATCH',
        json: { adminNote: note },
      });
      toast.success('Catatan tersimpan');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menyimpan catatan');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Catatan internal, tidak ditampilkan ke pelanggan."
      />
      <Button size="sm" variant="outline" loading={busy} onClick={save}>
        Simpan catatan
      </Button>
    </div>
  );
}
