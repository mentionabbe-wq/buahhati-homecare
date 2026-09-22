'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PenLine, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Input, Textarea } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/misc';
import { ApiClientError, apiFetch } from '@/lib/client';
import { TREATMENT_AREAS } from '@/lib/constants';
import { cn, parseJsonArray } from '@/lib/utils';

export type TreatmentInitial = {
  conditionBefore: string | null;
  conditionDuring: string | null;
  conditionAfter: string | null;
  treatmentAreas: string | null;
  durationMinutes: number;
  babyResponse: string | null;
  notes: string | null;
  recommendation: string | null;
  signatureName: string | null;
  signedAt: Date | null;
} | null;

export function TreatmentForm({
  reservationId,
  defaultDuration,
  initial,
}: {
  reservationId: string;
  defaultDuration: number;
  initial: TreatmentInitial;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    conditionBefore: initial?.conditionBefore ?? '',
    conditionDuring: initial?.conditionDuring ?? '',
    conditionAfter: initial?.conditionAfter ?? '',
    durationMinutes: String(initial?.durationMinutes || defaultDuration),
    babyResponse: initial?.babyResponse ?? '',
    notes: initial?.notes ?? '',
    recommendation: initial?.recommendation ?? '',
    signatureName: initial?.signatureName ?? '',
  });
  const [areas, setAreas] = useState<string[]>(parseJsonArray(initial?.treatmentAreas));

  async function save() {
    setBusy(true);
    setErrors({});
    try {
      await apiFetch('/api/treatments', {
        method: 'POST',
        json: {
          reservationId,
          ...form,
          durationMinutes: Number(form.durationMinutes) || 0,
          treatmentAreas: areas,
        },
      });
      toast.success('Catatan treatment tersimpan');
      router.refresh();
    } catch (error) {
      if (error instanceof ApiClientError) {
        setErrors(error.errors ?? {});
        toast.error(error.message);
      } else {
        toast.error('Gagal menyimpan catatan');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Field label="Kondisi bayi sebelum treatment" htmlFor="t-before" error={errors.conditionBefore}>
        <Textarea
          id="t-before"
          value={form.conditionBefore}
          onChange={(e) => setForm({ ...form, conditionBefore: e.target.value })}
          placeholder="Contoh: bayi aktif, sudah menyusu, tidak demam."
        />
      </Field>
      <Field label="Kondisi bayi selama treatment" htmlFor="t-during">
        <Textarea
          id="t-during"
          value={form.conditionDuring}
          onChange={(e) => setForm({ ...form, conditionDuring: e.target.value })}
        />
      </Field>

      <div>
        <p className="mb-2 text-sm font-medium">Area treatment</p>
        <div className="flex flex-wrap gap-2">
          {TREATMENT_AREAS.map((area) => {
            const checked = areas.includes(area);
            return (
              <label
                key={area}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-2xl border px-3 py-2 text-sm transition',
                  checked ? 'border-primary bg-[var(--color-sage)]' : 'border-border',
                )}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(state) =>
                    setAreas((prev) => (state ? [...prev, area] : prev.filter((a) => a !== area)))
                  }
                />
                {area}
              </label>
            );
          })}
        </div>
      </div>

      <Field label="Durasi aktual (menit)" htmlFor="t-duration">
        <Input
          id="t-duration"
          inputMode="numeric"
          value={form.durationMinutes}
          onChange={(e) => setForm({ ...form, durationMinutes: e.target.value.replace(/\D/g, '') })}
        />
      </Field>

      <Field label="Respon bayi" htmlFor="t-response">
        <Textarea
          id="t-response"
          value={form.babyResponse}
          onChange={(e) => setForm({ ...form, babyResponse: e.target.value })}
          placeholder="Contoh: tenang, menikmati pijatan, sempat rewel di menit ke-10."
        />
      </Field>

      <Field label="Kondisi bayi setelah treatment" htmlFor="t-after">
        <Textarea
          id="t-after"
          value={form.conditionAfter}
          onChange={(e) => setForm({ ...form, conditionAfter: e.target.value })}
        />
      </Field>

      <Field label="Catatan" htmlFor="t-notes">
        <Textarea
          id="t-notes"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
      </Field>

      <Field
        label="Rekomendasi perawatan di rumah"
        htmlFor="t-reco"
        hint="Tuliskan saran perawatan umum, bukan diagnosis medis."
      >
        <Textarea
          id="t-reco"
          value={form.recommendation}
          onChange={(e) => setForm({ ...form, recommendation: e.target.value })}
          placeholder="Contoh: lanjutkan pijat ringan 2x seminggu, jaga kehangatan ruangan."
        />
      </Field>

      <Field
        label="Konfirmasi digital orang tua"
        htmlFor="t-sign"
        hint="Ketik nama orang tua sebagai tanda persetujuan catatan treatment."
      >
        <div className="relative">
          <PenLine className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="t-sign"
            className="pl-10"
            value={form.signatureName}
            onChange={(e) => setForm({ ...form, signatureName: e.target.value })}
            placeholder="Nama orang tua"
          />
        </div>
      </Field>

      {initial?.signedAt ? (
        <p className="text-xs text-muted-foreground">
          Sudah dikonfirmasi oleh {initial.signatureName ?? '-'}.
        </p>
      ) : null}

      <Button className="w-full" loading={busy} onClick={save}>
        <Save className="size-4" /> Simpan catatan treatment
      </Button>
      <p className="text-xs text-muted-foreground">
        Setiap perubahan catatan tercatat pada audit log sistem.
      </p>
    </div>
  );
}
