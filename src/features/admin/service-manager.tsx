'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Clock, Pencil, Plus, Power, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Field, Input, Textarea } from '@/components/ui/input';
import { Switch } from '@/components/ui/misc';
import {
  ConfirmDialog,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { apiFetch, ApiClientError } from '@/lib/client';
import { formatCurrency } from '@/lib/utils';

export type ServiceRow = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: number;
  isActive: boolean;
  maxPerSlot: number;
  requirements: string | null;
  notes: string | null;
  sortOrder: number;
  imageUrl: string | null;
  _count?: { reservations: number };
};

const EMPTY = {
  name: '',
  description: '',
  durationMinutes: '60',
  price: '',
  isActive: true,
  maxPerSlot: '1',
  requirements: '',
  notes: '',
  sortOrder: '0',
  imageUrl: '',
};

export function ServiceManager({ services }: { services: ServiceRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<ServiceRow | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState(EMPTY);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setErrors({});
    setOpen(true);
  }

  function openEdit(service: ServiceRow) {
    setEditing(service.id);
    setErrors({});
    setForm({
      name: service.name,
      description: service.description ?? '',
      durationMinutes: String(service.durationMinutes),
      price: String(service.price),
      isActive: service.isActive,
      maxPerSlot: String(service.maxPerSlot),
      requirements: service.requirements ?? '',
      notes: service.notes ?? '',
      sortOrder: String(service.sortOrder),
      imageUrl: service.imageUrl ?? '',
    });
    setOpen(true);
  }

  async function save() {
    setBusy(true);
    setErrors({});
    try {
      const payload = {
        name: form.name,
        description: form.description || null,
        durationMinutes: Number(form.durationMinutes),
        price: Number(form.price),
        isActive: form.isActive,
        maxPerSlot: Number(form.maxPerSlot),
        requirements: form.requirements || null,
        notes: form.notes || null,
        sortOrder: Number(form.sortOrder),
        imageUrl: form.imageUrl || null,
      };
      if (editing) {
        await apiFetch(`/api/services/${editing}`, { method: 'PATCH', json: payload });
      } else {
        await apiFetch('/api/services', { method: 'POST', json: payload });
      }
      toast.success(editing ? 'Layanan diperbarui' : 'Layanan ditambahkan');
      setOpen(false);
      router.refresh();
    } catch (error) {
      if (error instanceof ApiClientError) {
        setErrors(error.errors ?? {});
        toast.error(error.message);
      } else {
        toast.error('Gagal menyimpan layanan');
      }
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(service: ServiceRow) {
    try {
      await apiFetch(`/api/services/${service.id}`, {
        method: 'PATCH',
        json: { isActive: !service.isActive },
      });
      toast.success(service.isActive ? 'Layanan dinonaktifkan' : 'Layanan diaktifkan');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal mengubah status');
    }
  }

  async function remove() {
    if (!deleting) return;
    setBusy(true);
    try {
      const result = await apiFetch<{ deactivated?: boolean }>(`/api/services/${deleting.id}`, {
        method: 'DELETE',
      });
      toast.success(
        result?.deactivated
          ? 'Layanan sudah dipakai reservasi, jadi hanya dinonaktifkan.'
          : 'Layanan dihapus',
      );
      setDeleting(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menghapus layanan');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-4" /> Tambah layanan
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {services.map((service) => (
          <Card key={service.id} className="flex flex-col p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-base font-bold">{service.name}</h3>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="size-3.5" /> {service.durationMinutes} menit · maks{' '}
                  {service.maxPerSlot}/slot
                </p>
              </div>
              <Badge variant={service.isActive ? 'default' : 'soft'}>
                {service.isActive ? 'Aktif' : 'Nonaktif'}
              </Badge>
            </div>

            <p className="mt-3 flex-1 text-sm text-muted-foreground">
              {service.description ?? 'Belum ada deskripsi.'}
            </p>

            <p className="mt-3 font-display text-xl font-bold text-primary">
              {formatCurrency(service.price)}
            </p>
            {service._count ? (
              <p className="text-xs text-muted-foreground">
                {service._count.reservations} reservasi tercatat
              </p>
            ) : null}

            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => openEdit(service)}>
                <Pencil className="size-4" /> Edit
              </Button>
              <Button size="sm" variant="ghost" onClick={() => toggleActive(service)}>
                <Power className="size-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setDeleting(service)}>
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit layanan' : 'Tambah layanan'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Field label="Nama layanan" htmlFor="svc-name" required error={errors.name}>
              <Input
                id="svc-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="Deskripsi" htmlFor="svc-desc">
              <Textarea
                id="svc-desc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Durasi (menit)" htmlFor="svc-duration" required error={errors.durationMinutes}>
                <Input
                  id="svc-duration"
                  inputMode="numeric"
                  value={form.durationMinutes}
                  onChange={(e) => setForm({ ...form, durationMinutes: e.target.value.replace(/\D/g, '') })}
                />
              </Field>
              <Field label="Harga (Rp)" htmlFor="svc-price" required error={errors.price}>
                <Input
                  id="svc-price"
                  inputMode="numeric"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value.replace(/\D/g, '') })}
                />
              </Field>
              <Field label="Maksimal booking per slot" htmlFor="svc-max">
                <Input
                  id="svc-max"
                  inputMode="numeric"
                  value={form.maxPerSlot}
                  onChange={(e) => setForm({ ...form, maxPerSlot: e.target.value.replace(/\D/g, '') })}
                />
              </Field>
              <Field label="Urutan tampil" htmlFor="svc-sort">
                <Input
                  id="svc-sort"
                  inputMode="numeric"
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: e.target.value.replace(/\D/g, '') })}
                />
              </Field>
            </div>
            <Field label="Persyaratan" htmlFor="svc-req">
              <Textarea
                id="svc-req"
                value={form.requirements}
                onChange={(e) => setForm({ ...form, requirements: e.target.value })}
                placeholder="Contoh: bayi sudah menyusu 30 menit sebelum treatment."
              />
            </Field>
            <Field label="Catatan internal" htmlFor="svc-note">
              <Textarea
                id="svc-note"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </Field>
            <Field label="URL foto" htmlFor="svc-image">
              <Input
                id="svc-image"
                value={form.imageUrl}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                placeholder="https://…"
              />
            </Field>
            <label className="flex items-center justify-between rounded-2xl border border-border px-4 py-3">
              <span className="text-sm font-medium">Layanan aktif</span>
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
        title={`Hapus layanan ${deleting?.name ?? ''}?`}
        description="Layanan yang pernah dipakai reservasi hanya akan dinonaktifkan agar riwayat tetap utuh."
        destructive
        loading={busy}
        onConfirm={remove}
      />
    </div>
  );
}
