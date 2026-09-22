'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, Input, Textarea } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/select';
import { Switch } from '@/components/ui/misc';
import { apiFetch } from '@/lib/client';
import type { AppSettings } from '@/services/settings.service';

export function SettingsForm({
  settings,
  providers,
}: {
  settings: AppSettings;
  providers: string[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    ...settings,
    slotTimes: settings.slotTimes.join(', '),
  });

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    setBusy(true);
    try {
      await apiFetch('/api/settings', {
        method: 'PATCH',
        json: {
          ...form,
          slotMinutes: Number(form.slotMinutes),
          minLeadHours: Number(form.minLeadHours),
          maxAdvanceDays: Number(form.maxAdvanceDays),
          cancelPolicyHours: Number(form.cancelPolicyHours),
          transportFee: Number(form.transportFee),
        },
      });
      toast.success('Pengaturan tersimpan');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menyimpan pengaturan');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Identitas bisnis</CardTitle>
        </CardHeader>
        <div className="grid gap-4 px-5 pb-5 sm:grid-cols-2">
          <Field label="Nama bisnis" htmlFor="s-name">
            <Input id="s-name" value={form.businessName} onChange={(e) => set('businessName', e.target.value)} />
          </Field>
          <Field label="Nomor WhatsApp bisnis" htmlFor="s-wa">
            <Input
              id="s-wa"
              value={form.businessWhatsapp}
              onChange={(e) => set('businessWhatsapp', e.target.value)}
            />
          </Field>
          <Field label="Email" htmlFor="s-email">
            <Input id="s-email" value={form.businessEmail} onChange={(e) => set('businessEmail', e.target.value)} />
          </Field>
          <Field label="URL logo" htmlFor="s-logo">
            <Input id="s-logo" value={form.businessLogo} onChange={(e) => set('businessLogo', e.target.value)} />
          </Field>
          <Field label="Tagline" htmlFor="s-tagline" className="sm:col-span-2">
            <Input
              id="s-tagline"
              value={form.businessTagline}
              onChange={(e) => set('businessTagline', e.target.value)}
            />
          </Field>
          <Field label="Alamat" htmlFor="s-address" className="sm:col-span-2">
            <Textarea
              id="s-address"
              value={form.businessAddress}
              onChange={(e) => set('businessAddress', e.target.value)}
            />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Jam operasional & slot booking</CardTitle>
          <p className="text-sm text-muted-foreground">
            Slot booking dipakai langsung oleh form reservasi dan kalender.
          </p>
        </CardHeader>
        <div className="grid gap-4 px-5 pb-5 sm:grid-cols-2">
          <Field label="Jam buka" htmlFor="s-open">
            <Input id="s-open" type="time" value={form.openHour} onChange={(e) => set('openHour', e.target.value)} />
          </Field>
          <Field label="Jam tutup" htmlFor="s-close">
            <Input id="s-close" type="time" value={form.closeHour} onChange={(e) => set('closeHour', e.target.value)} />
          </Field>
          <Field
            label="Daftar slot"
            htmlFor="s-slots"
            className="sm:col-span-2"
            hint="Pisahkan dengan koma, format HH:MM. Contoh: 09:00, 10:00, 11:00"
          >
            <Input id="s-slots" value={form.slotTimes} onChange={(e) => set('slotTimes', e.target.value)} />
          </Field>
          <Field label="Panjang slot (menit)" htmlFor="s-slotmin">
            <Input
              id="s-slotmin"
              inputMode="numeric"
              value={String(form.slotMinutes)}
              onChange={(e) => set('slotMinutes', Number(e.target.value.replace(/\D/g, '')) || 0)}
            />
          </Field>
          <Field label="Minimal booking sebelum treatment (jam)" htmlFor="s-lead">
            <Input
              id="s-lead"
              inputMode="numeric"
              value={String(form.minLeadHours)}
              onChange={(e) => set('minLeadHours', Number(e.target.value.replace(/\D/g, '')) || 0)}
            />
          </Field>
          <Field label="Maksimal booking ke depan (hari)" htmlFor="s-advance">
            <Input
              id="s-advance"
              inputMode="numeric"
              value={String(form.maxAdvanceDays)}
              onChange={(e) => set('maxAdvanceDays', Number(e.target.value.replace(/\D/g, '')) || 0)}
            />
          </Field>
          <Field label="Batas pembatalan mandiri (jam)" htmlFor="s-cancel">
            <Input
              id="s-cancel"
              inputMode="numeric"
              value={String(form.cancelPolicyHours)}
              onChange={(e) => set('cancelPolicyHours', Number(e.target.value.replace(/\D/g, '')) || 0)}
            />
          </Field>
          <Field label="Teks kebijakan pembatalan" htmlFor="s-cancel-text" className="sm:col-span-2">
            <Textarea
              id="s-cancel-text"
              value={form.cancelPolicyText}
              onChange={(e) => set('cancelPolicyText', e.target.value)}
            />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pembayaran</CardTitle>
        </CardHeader>
        <div className="grid gap-4 px-5 pb-5 sm:grid-cols-2">
          <Field label="Biaya home care (Rp)" htmlFor="s-transport">
            <Input
              id="s-transport"
              inputMode="numeric"
              value={String(form.transportFee)}
              onChange={(e) => set('transportFee', Number(e.target.value.replace(/\D/g, '')) || 0)}
            />
          </Field>
          <Field label="Rekening pembayaran" htmlFor="s-bank">
            <Input id="s-bank" value={form.bankAccount} onChange={(e) => set('bankAccount', e.target.value)} />
          </Field>
          <Field label="URL gambar QRIS" htmlFor="s-qris" className="sm:col-span-2">
            <Input id="s-qris" value={form.qrisImage} onChange={(e) => set('qrisImage', e.target.value)} />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifikasi WhatsApp</CardTitle>
          <p className="text-sm text-muted-foreground">
            Kredensial provider diambil dari environment variable, bukan disimpan di database.
          </p>
        </CardHeader>
        <div className="grid gap-4 px-5 pb-5 sm:grid-cols-2">
          <Field label="Provider" htmlFor="s-provider">
            <NativeSelect
              id="s-provider"
              value={form.waProvider}
              onChange={(e) => set('waProvider', e.target.value)}
            >
              {providers.map((provider) => (
                <option key={provider} value={provider}>
                  {provider === 'mock' ? 'mock (tanpa API, hanya dicatat)' : provider}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <div className="space-y-3">
            <label className="flex items-center justify-between rounded-2xl border border-border px-4 py-3">
              <span className="text-sm font-medium">Aktifkan notifikasi</span>
              <Switch checked={form.waEnabled} onCheckedChange={(checked) => set('waEnabled', checked)} />
            </label>
            <label className="flex items-center justify-between rounded-2xl border border-border px-4 py-3">
              <span className="text-sm font-medium">Reminder H-1</span>
              <Switch checked={form.reminderH1} onCheckedChange={(checked) => set('reminderH1', checked)} />
            </label>
            <label className="flex items-center justify-between rounded-2xl border border-border px-4 py-3">
              <span className="text-sm font-medium">Reminder H-2 jam</span>
              <Switch checked={form.reminderH2h} onCheckedChange={(checked) => set('reminderH2h', checked)} />
            </label>
          </div>
        </div>
      </Card>

      <div className="sticky bottom-4 flex justify-end">
        <Button loading={busy} onClick={save} size="lg">
          <Save className="size-4" /> Simpan pengaturan
        </Button>
      </div>
    </div>
  );
}
