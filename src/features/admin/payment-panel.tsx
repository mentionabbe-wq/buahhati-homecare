'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { BadgeCheck, Plus, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/select';
import { PaymentBadge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { apiFetch } from '@/lib/client';
import { PAYMENT_METHOD_LABEL } from '@/lib/constants';
import { formatDateTimeId } from '@/lib/datetime';
import { formatCurrency } from '@/lib/utils';

type Payment = {
  id: string;
  method: string;
  status: string;
  amount: number;
  reference: string | null;
  note: string | null;
  paidAt: string | null;
  createdAt: string;
  confirmedBy: string | null;
};

export function PaymentPanel({
  reservationId,
  total,
  payments,
}: {
  reservationId: string;
  total: number;
  payments: Payment[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    method: 'CASH',
    amount: String(total),
    status: 'PAID',
    reference: '',
  });

  async function addPayment() {
    setBusy(true);
    try {
      await apiFetch('/api/payments', {
        method: 'POST',
        json: {
          reservationId,
          method: form.method,
          amount: Number(form.amount) || 0,
          status: form.status,
          reference: form.reference || null,
        },
      });
      toast.success('Pembayaran dicatat');
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal mencatat pembayaran');
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(id: string, status: string) {
    setBusy(true);
    try {
      await apiFetch(`/api/payments/${id}`, { method: 'PATCH', json: { status } });
      toast.success('Status pembayaran diperbarui');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal memperbarui pembayaran');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {payments.length === 0 ? (
        <p className="rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">
          Belum ada transaksi pembayaran.
        </p>
      ) : (
        <ul className="space-y-2">
          {payments.map((payment) => (
            <li key={payment.id} className="rounded-2xl border border-border p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">
                    {PAYMENT_METHOD_LABEL[payment.method as keyof typeof PAYMENT_METHOD_LABEL] ??
                      payment.method}{' '}
                    · {formatCurrency(payment.amount)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {payment.paidAt
                      ? `Dibayar ${formatDateTimeId(payment.paidAt)}`
                      : `Dibuat ${formatDateTimeId(payment.createdAt)}`}
                    {payment.reference ? ` · Ref ${payment.reference}` : ''}
                  </p>
                  {payment.note ? (
                    <p className="mt-1 text-xs text-muted-foreground">{payment.note}</p>
                  ) : null}
                </div>
                <PaymentBadge status={payment.status} />
              </div>
              {payment.status !== 'PAID' ? (
                <Button
                  size="sm"
                  variant="secondary"
                  className="mt-2"
                  disabled={busy}
                  onClick={() => setStatus(payment.id, 'PAID')}
                >
                  <BadgeCheck className="size-4" /> Konfirmasi lunas
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-2"
                  disabled={busy}
                  onClick={() => setStatus(payment.id, 'REFUNDED')}
                >
                  <Undo2 className="size-4" /> Tandai refund
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Plus className="size-4" /> Catat pembayaran
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Catat pembayaran</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Field label="Metode" htmlFor="pay-method">
              <NativeSelect
                id="pay-method"
                value={form.method}
                onChange={(e) => setForm({ ...form, method: e.target.value })}
              >
                {Object.entries(PAYMENT_METHOD_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Jumlah" htmlFor="pay-amount">
              <Input
                id="pay-amount"
                inputMode="numeric"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value.replace(/\D/g, '') })}
              />
            </Field>
            <Field label="Status" htmlFor="pay-status">
              <NativeSelect
                id="pay-status"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="PAID">Lunas</option>
                <option value="PENDING">Menunggu verifikasi</option>
              </NativeSelect>
            </Field>
            <Field label="Referensi (opsional)" htmlFor="pay-ref">
              <Input
                id="pay-ref"
                value={form.reference}
                onChange={(e) => setForm({ ...form, reference: e.target.value })}
                placeholder="Nomor transaksi / catatan"
              />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button loading={busy} onClick={addPayment}>
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
