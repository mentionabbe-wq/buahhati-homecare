'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Input, Textarea } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ApiClientError, apiFetch } from '@/lib/client';
import { todayKey } from '@/lib/datetime';

export function ProfileForm({
  customerId,
  initial,
}: {
  customerId: string;
  initial: {
    name: string;
    phone: string;
    email: string;
    address: string;
    district: string;
    village: string;
    landmark: string;
    locationNote: string;
    mapsUrl: string;
  };
}) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function save() {
    setBusy(true);
    setErrors({});
    try {
      await apiFetch(`/api/customers/${customerId}`, { method: 'PATCH', json: form });
      toast.success('Profil diperbarui');
      router.refresh();
    } catch (error) {
      if (error instanceof ApiClientError) {
        setErrors(error.errors ?? {});
        toast.error(error.message);
      } else {
        toast.error('Gagal menyimpan profil');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Field label="Nama lengkap" htmlFor="p-name" error={errors.name}>
        <Input id="p-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </Field>
      <Field label="Nomor WhatsApp" htmlFor="p-phone" error={errors.phone}>
        <Input id="p-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      </Field>
      <Field label="Email" htmlFor="p-email" error={errors.email}>
        <Input id="p-email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      </Field>
      <Field label="Alamat" htmlFor="p-address">
        <Textarea
          id="p-address"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Kecamatan" htmlFor="p-district">
          <Input
            id="p-district"
            value={form.district}
            onChange={(e) => setForm({ ...form, district: e.target.value })}
          />
        </Field>
        <Field label="Kelurahan/Desa" htmlFor="p-village">
          <Input
            id="p-village"
            value={form.village}
            onChange={(e) => setForm({ ...form, village: e.target.value })}
          />
        </Field>
      </div>
      <Field label="Patokan" htmlFor="p-landmark">
        <Input
          id="p-landmark"
          value={form.landmark}
          onChange={(e) => setForm({ ...form, landmark: e.target.value })}
        />
      </Field>
      <Field label="Link Google Maps" htmlFor="p-maps">
        <Input id="p-maps" value={form.mapsUrl} onChange={(e) => setForm({ ...form, mapsUrl: e.target.value })} />
      </Field>

      <Button loading={busy} onClick={save} className="w-full">
        <Save className="size-4" /> Simpan perubahan
      </Button>
    </div>
  );
}

export function AddBabyButton({ customerId }: { customerId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    name: '',
    birthDate: '',
    gender: 'FEMALE',
    weightKg: '',
    notes: '',
    allergies: '',
  });

  async function save() {
    setBusy(true);
    setErrors({});
    try {
      await apiFetch('/api/babies', {
        method: 'POST',
        json: {
          customerId,
          name: form.name,
          birthDate: form.birthDate,
          gender: form.gender,
          weightKg: form.weightKg ? Number(form.weightKg) : null,
          notes: form.notes || null,
          allergies: form.allergies || null,
        },
      });
      toast.success('Profil bayi ditambahkan');
      setOpen(false);
      setForm({ name: '', birthDate: '', gender: 'FEMALE', weightKg: '', notes: '', allergies: '' });
      router.refresh();
    } catch (error) {
      if (error instanceof ApiClientError) {
        setErrors(error.errors ?? {});
        toast.error(error.message);
      } else {
        toast.error('Gagal menambah profil bayi');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Plus className="size-4" /> Tambah bayi
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah profil bayi</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Field label="Nama bayi" htmlFor="b-name" required error={errors.name}>
              <Input id="b-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Tanggal lahir" htmlFor="b-birth" required error={errors.birthDate}>
                <Input
                  id="b-birth"
                  type="date"
                  max={todayKey()}
                  value={form.birthDate}
                  onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                />
              </Field>
              <Field label="Jenis kelamin" htmlFor="b-gender">
                <NativeSelect
                  id="b-gender"
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}
                >
                  <option value="FEMALE">Perempuan</option>
                  <option value="MALE">Laki-laki</option>
                </NativeSelect>
              </Field>
            </div>
            <Field label="Berat badan (kg)" htmlFor="b-weight">
              <Input
                id="b-weight"
                inputMode="decimal"
                value={form.weightKg}
                onChange={(e) => setForm({ ...form, weightKg: e.target.value })}
              />
            </Field>
            <Field label="Riwayat alergi" htmlFor="b-allergy">
              <Input
                id="b-allergy"
                value={form.allergies}
                onChange={(e) => setForm({ ...form, allergies: e.target.value })}
              />
            </Field>
            <Field label="Catatan" htmlFor="b-notes">
              <Textarea
                id="b-notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </Field>
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
    </>
  );
}
