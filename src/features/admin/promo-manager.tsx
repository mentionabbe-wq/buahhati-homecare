'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Pencil, Plus, Ticket, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Field, Input, Textarea } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/select';
import { Checkbox, Switch } from '@/components/ui/misc';
import {
  ConfirmDialog,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ApiClientError, apiFetch } from '@/lib/client';
import { formatDateId, toDateKey } from '@/lib/datetime';
import { formatCurrency, parseJsonArray } from '@/lib/utils';

export type PromoRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  discountType: string;
  discountValue: number;
  minTransaction: number;
  maxDiscount: number | null;
  startDate: string;
  endDate: string;
  quota: number | null;
  usedCount: number;
  isActive: boolean;
  serviceIds: string | null;
};

const EMPTY = {
  code: '',
  name: '',
  description: '',
  discountType: 'NOMINAL',
  discountValue: '',
  minTransaction: '0',
  maxDiscount: '',
  startDate: '',
  endDate: '',
  quota: '',
  isActive: true,
  serviceIds: [] as string[],
};

export function PromoManager({
  promos,
  services,
}: {
  promos: PromoRow[];
  services: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<PromoRow | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState(EMPTY);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setErrors({});
    setOpen(true);
  }

  function openEdit(promo: PromoRow) {
    setEditing(promo.id);
    setErrors({});
    setForm({
      code: promo.code,
      name: promo.name,
      description: promo.description ?? '',
      discountType: promo.discountType,
      discountValue: String(promo.discountValue),
      minTransaction: String(promo.minTransaction),
      maxDiscount: promo.maxDiscount ? String(promo.maxDiscount) : '',
      startDate: toDateKey(promo.startDate),
      endDate: toDateKey(promo.endDate),
      quota: promo.quota !== null ? String(promo.quota) : '',
      isActive: promo.isActive,
      serviceIds: parseJsonArray(promo.serviceIds),
    });
    setOpen(true);
  }

  async function save() {
    setBusy(true);
    setErrors({});
    try {
      const payload = {
        code: form.code,
        name: form.name,
        description: form.description || null,
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        minTransaction: Number(form.minTransaction || 0),
        maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : null,
        startDate: form.startDate,
        endDate: form.endDate,
        quota: form.quota ? Number(form.quota) : null,
        isActive: form.isActive,
        serviceIds: form.serviceIds,
      };
      if (editing) {
        await apiFetch(`/api/promos/${editing}`, { method: 'PATCH', json: payload });
      } else {
        await apiFetch('/api/promos', { method: 'POST', json: payload });
      }
      toast.success(editing ? 'Promo diperbarui' : 'Promo dibuat');
      setOpen(false);
      router.refresh();
    } catch (error) {
      if (error instanceof ApiClientError) {
        setErrors(error.errors ?? {});
        toast.error(error.message);
      } else {
        toast.error('Gagal menyimpan promo');
      }
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!deleting) return;
    setBusy(true);
    try {
      const result = await apiFetch<{ deactivated?: boolean }>(`/api/promos/${deleting.id}`, {
        method: 'DELETE',
      });
      toast.success(result?.deactivated ? 'Promo dinonaktifkan' : 'Promo dihapus');
      setDeleting(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menghapus promo');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-4" /> Buat promo
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {promos.map((promo) => {
          const limited = parseJsonArray(promo.serviceIds);
          return (
            <Card key={promo.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 font-mono text-sm font-bold text-primary">
                    <Ticket className="size-4" /> {promo.code}
                  </p>
                  <p className="mt-1 font-display text-base font-bold">{promo.name}</p>
                </div>
                <Badge variant={promo.isActive ? 'default' : 'soft'}>
                  {promo.isActive ? 'Aktif' : 'Nonaktif'}
                </Badge>
              </div>

              {promo.description ? (
                <p className="mt-2 text-sm text-muted-foreground">{promo.description}</p>
              ) : null}

              <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                <li>
                  Potongan:{' '}
                  <span className="font-medium text-foreground">
                    {promo.discountType === 'PERCENT'
                      ? `${promo.discountValue}%`
                      : formatCurrency(promo.discountValue)}
                    {promo.maxDiscount ? ` (maks ${formatCurrency(promo.maxDiscount)})` : ''}
                  </span>
                </li>
                <li>Minimal transaksi: {formatCurrency(promo.minTransaction)}</li>
                <li>
                  Periode: {formatDateId(promo.startDate, { short: true })} –{' '}
                  {formatDateId(promo.endDate, { short: true })}
                </li>
                <li>
                  Kuota: {promo.quota === null ? 'tanpa batas' : `${promo.usedCount}/${promo.quota}`}
                </li>
                {limited.length ? <li>Berlaku untuk {limited.length} layanan tertentu</li> : null}
              </ul>

              <div className="mt-4 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(promo)}>
                  <Pencil className="size-4" /> Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setDeleting(promo)}>
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit promo' : 'Buat promo'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Kode promo" htmlFor="pr-code" required error={errors.code}>
                <Input
                  id="pr-code"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="WELCOME10"
                />
              </Field>
              <Field label="Nama promo" htmlFor="pr-name" required error={errors.name}>
                <Input
                  id="pr-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </Field>
              <Field label="Jenis potongan" htmlFor="pr-type">
                <NativeSelect
                  id="pr-type"
                  value={form.discountType}
                  onChange={(e) => setForm({ ...form, discountType: e.target.value })}
                >
                  <option value="NOMINAL">Nominal (Rp)</option>
                  <option value="PERCENT">Persentase (%)</option>
                </NativeSelect>
              </Field>
              <Field label="Nilai potongan" htmlFor="pr-value" required error={errors.discountValue}>
                <Input
                  id="pr-value"
                  inputMode="numeric"
                  value={form.discountValue}
                  onChange={(e) => setForm({ ...form, discountValue: e.target.value.replace(/\D/g, '') })}
                />
              </Field>
              <Field label="Minimal transaksi" htmlFor="pr-min">
                <Input
                  id="pr-min"
                  inputMode="numeric"
                  value={form.minTransaction}
                  onChange={(e) => setForm({ ...form, minTransaction: e.target.value.replace(/\D/g, '') })}
                />
              </Field>
              <Field label="Maksimal diskon" htmlFor="pr-max">
                <Input
                  id="pr-max"
                  inputMode="numeric"
                  value={form.maxDiscount}
                  onChange={(e) => setForm({ ...form, maxDiscount: e.target.value.replace(/\D/g, '') })}
                  placeholder="Kosongkan bila tanpa batas"
                />
              </Field>
              <Field label="Mulai berlaku" htmlFor="pr-start" required error={errors.startDate}>
                <Input
                  id="pr-start"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                />
              </Field>
              <Field label="Berakhir" htmlFor="pr-end" required error={errors.endDate}>
                <Input
                  id="pr-end"
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                />
              </Field>
              <Field label="Kuota penggunaan" htmlFor="pr-quota">
                <Input
                  id="pr-quota"
                  inputMode="numeric"
                  value={form.quota}
                  onChange={(e) => setForm({ ...form, quota: e.target.value.replace(/\D/g, '') })}
                  placeholder="Kosongkan bila tanpa batas"
                />
              </Field>
            </div>

            <Field label="Deskripsi" htmlFor="pr-desc">
              <Textarea
                id="pr-desc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </Field>

            <div className="rounded-2xl border border-border p-4">
              <p className="text-sm font-semibold">Berlaku untuk layanan</p>
              <p className="mb-2 text-xs text-muted-foreground">
                Kosongkan seluruh pilihan agar promo berlaku untuk semua layanan.
              </p>
              <div className="space-y-2">
                {services.map((service) => (
                  <label key={service.id} className="flex items-center gap-3 text-sm">
                    <Checkbox
                      checked={form.serviceIds.includes(service.id)}
                      onCheckedChange={(checked) =>
                        setForm({
                          ...form,
                          serviceIds: checked
                            ? [...form.serviceIds, service.id]
                            : form.serviceIds.filter((id) => id !== service.id),
                        })
                      }
                    />
                    {service.name}
                  </label>
                ))}
              </div>
            </div>

            <label className="flex items-center justify-between rounded-2xl border border-border px-4 py-3">
              <span className="text-sm font-medium">Promo aktif</span>
              <Switch
                checked={form.isActive}
                onCheckedChange={(checked) => setForm({ ...form, isActive: checked })}
              />
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button loading={busy} onClick={save}>
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(value) => !value && setDeleting(null)}
        title={`Hapus promo ${deleting?.code ?? ''}?`}
        description="Promo yang sudah dipakai reservasi hanya akan dinonaktifkan."
        destructive
        loading={busy}
        onConfirm={remove}
      />
    </div>
  );
}
