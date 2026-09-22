'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BabyIcon,
  Baby as BabyOutline,
  Check,
  CheckCircle2,
  Clock,
  Info,
  MapPin,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Input, Label, Textarea } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/select';
import { Checkbox, Progress, Skeleton } from '@/components/ui/misc';
import { DatePicker, addDays } from '@/components/date-picker';
import { ApiClientError, apiFetch } from '@/lib/client';
import { BABY_CONDITIONS, CONDITION_WARNING, PAYMENT_METHOD_LABEL } from '@/lib/constants';
import { babyAge, formatDateId, todayKey } from '@/lib/datetime';
import { cn, formatCurrency } from '@/lib/utils';

export type WizardService = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: number;
  requirements: string | null;
};

export type WizardBaby = {
  id: string;
  name: string;
  birthDate: string;
  gender: string;
  weightKg: number | null;
  notes: string | null;
};

export type WizardSettings = {
  transportFee: number;
  minLeadHours: number;
  maxAdvanceDays: number;
  cancelPolicyText: string;
  businessName: string;
  bankAccount: string;
};

type Slot = { time: string; endTime: string; available: boolean; reason: string | null };
type TherapistOption = { id: string; name: string; photoUrl: string | null; skills: string | null };

const STEPS = [
  'Data Orang Tua',
  'Data Bayi',
  'Kondisi Bayi',
  'Layanan',
  'Jadwal',
  'Terapis',
  'Alamat',
  'Konfirmasi',
];

export function ReservationWizard({
  services,
  settings,
  prefill,
  babies,
  preselectedServiceId,
  isLoggedIn,
}: {
  services: WizardService[];
  settings: WizardSettings;
  prefill: { name: string; phone: string; email: string; address: Partial<AddressState> } | null;
  babies: WizardBaby[];
  preselectedServiceId?: string;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const [parent, setParent] = useState({
    name: prefill?.name ?? '',
    phone: prefill?.phone ?? '',
    email: prefill?.email ?? '',
  });
  const [babyId, setBabyId] = useState<string>(babies[0]?.id ?? '');
  const [baby, setBaby] = useState({
    name: babies[0]?.name ?? '',
    birthDate: babies[0]?.birthDate ?? '',
    gender: babies[0]?.gender ?? 'FEMALE',
    weightKg: babies[0]?.weightKg ? String(babies[0].weightKg) : '',
    notes: babies[0]?.notes ?? '',
  });
  const [conditions, setConditions] = useState<string[]>(['SEHAT']);
  const [conditionNote, setConditionNote] = useState('');
  const [serviceId, setServiceId] = useState(preselectedServiceId ?? '');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [therapistId, setTherapistId] = useState('');
  const [address, setAddress] = useState<AddressState>({
    address: prefill?.address?.address ?? '',
    district: prefill?.address?.district ?? '',
    village: prefill?.address?.village ?? '',
    landmark: prefill?.address?.landmark ?? '',
    locationNote: prefill?.address?.locationNote ?? '',
    mapsUrl: prefill?.address?.mapsUrl ?? '',
  });
  const [promoCode, setPromoCode] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [customerNote, setCustomerNote] = useState('');

  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [therapists, setTherapists] = useState<TherapistOption[] | null>(null);
  const [loadingTherapists, setLoadingTherapists] = useState(false);
  const [result, setResult] = useState<{ reservationCode: string; id: string; needsReview: boolean } | null>(null);

  const service = services.find((s) => s.id === serviceId) ?? null;
  const minDate = todayKey();
  const maxDate = addDays(todayKey(), settings.maxAdvanceDays);

  const flagged = conditions.some((value) => BABY_CONDITIONS.find((c) => c.value === value)?.flag);

  const subtotal = (service?.price ?? 0) + settings.transportFee;

  // slot tersedia untuk tanggal & layanan terpilih
  useEffect(() => {
    if (step !== 5 || !date || !serviceId) return;
    let cancelled = false;
    setLoadingSlots(true);
    apiFetch<{ slots: Slot[] }>(`/api/availability?date=${date}&serviceId=${serviceId}`)
      .then((data) => {
        if (cancelled) return;
        setSlots(data.slots);
        setStartTime((current) =>
          data.slots.some((slot) => slot.time === current && slot.available) ? current : '',
        );
      })
      .catch(() => !cancelled && setSlots([]))
      .finally(() => !cancelled && setLoadingSlots(false));
    return () => {
      cancelled = true;
    };
  }, [step, date, serviceId]);

  // terapis yang benar-benar bebas pada slot terpilih
  useEffect(() => {
    if (step !== 6 || !date || !startTime || !serviceId) return;
    let cancelled = false;
    setLoadingTherapists(true);
    apiFetch<TherapistOption[]>(
      `/api/therapists?date=${date}&startTime=${startTime}&serviceId=${serviceId}`,
    )
      .then((data) => {
        if (cancelled) return;
        setTherapists(data);
        setTherapistId((current) => (data.some((t) => t.id === current) ? current : ''));
      })
      .catch(() => !cancelled && setTherapists([]))
      .finally(() => !cancelled && setLoadingTherapists(false));
    return () => {
      cancelled = true;
    };
  }, [step, date, startTime, serviceId]);

  const validateStep = useCallback(
    (target: number) => {
      const next: Record<string, string> = {};
      if (target >= 1) {
        if (parent.name.trim().length < 2) next.name = 'Nama lengkap wajib diisi';
        if (parent.phone.replace(/\D/g, '').length < 9) next.phone = 'Nomor WhatsApp tidak valid';
        if (parent.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(parent.email)) {
          next.email = 'Format email tidak valid';
        }
      }
      if (target >= 2) {
        if (!baby.name.trim()) next.babyName = 'Nama bayi wajib diisi';
        if (!baby.birthDate) next.birthDate = 'Tanggal lahir wajib diisi';
        else if (baby.birthDate > todayKey()) next.birthDate = 'Tanggal lahir tidak boleh di masa depan';
      }
      if (target >= 3 && conditions.length === 0) next.conditions = 'Pilih minimal satu kondisi';
      if (target >= 4 && !serviceId) next.serviceId = 'Pilih salah satu layanan';
      if (target >= 5) {
        if (!date) next.date = 'Pilih tanggal treatment';
        if (!startTime) next.startTime = 'Pilih jam treatment';
      }
      if (target >= 7 && address.address.trim().length < 5) {
        next.address = 'Alamat lengkap wajib diisi';
      }
      return next;
    },
    [parent, baby, conditions, serviceId, date, startTime, address],
  );

  function goNext() {
    const found = validateStep(step);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      toast.error('Lengkapi data terlebih dahulu');
      return;
    }
    setStep((s) => Math.min(STEPS.length, s + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function goBack() {
    setErrors({});
    setStep((s) => Math.max(1, s - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function submit() {
    const found = validateStep(7);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      toast.error('Data belum lengkap');
      return;
    }
    setSubmitting(true);
    try {
      const created = await apiFetch<{ id: string; reservationCode: string; needsReview: boolean }>(
        '/api/reservations',
        {
          method: 'POST',
          json: {
            parent: { name: parent.name, phone: parent.phone, email: parent.email || null },
            baby: {
              id: babyId || null,
              name: baby.name,
              birthDate: baby.birthDate,
              gender: baby.gender,
              weightKg: baby.weightKg ? Number(baby.weightKg) : null,
              notes: baby.notes || null,
            },
            conditions,
            conditionNote: conditionNote || null,
            serviceId,
            therapistId: therapistId || null,
            date,
            startTime,
            address,
            promoCode: promoCode || null,
            customerNote: customerNote || null,
            paymentMethod,
          },
        },
      );
      setResult(created);
      toast.success('Reservasi berhasil dibuat');
      router.refresh();
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message);
        if (error.status === 409) setStep(5);
      } else {
        toast.error('Gagal mengirim reservasi. Coba lagi.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <SuccessPanel
        code={result.reservationCode}
        id={result.id}
        needsReview={result.needsReview}
        isLoggedIn={isLoggedIn}
        phone={parent.phone}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="rounded-3xl border border-border bg-card p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              Langkah {step} dari {STEPS.length}
            </p>
            <h2 className="font-display text-lg font-bold sm:text-xl">{STEPS[step - 1]}</h2>
          </div>
          <span className="hidden text-xs text-muted-foreground sm:block">
            {Math.round((step / STEPS.length) * 100)}% selesai
          </span>
        </div>
        <Progress value={(step / STEPS.length) * 100} className="mt-3" />

        <ol className="bh-scroll-x mt-4 flex gap-2 pb-1">
          {STEPS.map((label, index) => {
            const number = index + 1;
            const state = number < step ? 'done' : number === step ? 'active' : 'todo';
            return (
              <li key={label}>
                <button
                  type="button"
                  onClick={() => number < step && setStep(number)}
                  disabled={number > step}
                  className={cn(
                    'flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition',
                    state === 'done' && 'border-primary/30 bg-[var(--color-sage)] text-primary',
                    state === 'active' && 'border-primary bg-primary text-primary-foreground',
                    state === 'todo' && 'border-border text-muted-foreground',
                  )}
                >
                  {state === 'done' ? <Check className="size-3" /> : <span>{number}</span>}
                  {label}
                </button>
              </li>
            );
          })}
        </ol>

        <div className="mt-6">
          {step === 1 ? (
            <div className="space-y-4">
              <Field label="Nama lengkap orang tua" htmlFor="parentName" required error={errors.name}>
                <Input
                  id="parentName"
                  value={parent.name}
                  onChange={(e) => setParent({ ...parent, name: e.target.value })}
                  placeholder="Contoh: Rani Puspita"
                />
              </Field>
              <Field
                label="Nomor WhatsApp"
                htmlFor="parentPhone"
                required
                error={errors.phone}
                hint="Digunakan untuk mengirim konfirmasi dan pengingat jadwal."
              >
                <Input
                  id="parentPhone"
                  inputMode="tel"
                  value={parent.phone}
                  onChange={(e) => setParent({ ...parent, phone: e.target.value })}
                  placeholder="08xxxxxxxxxx"
                />
              </Field>
              <Field label="Email (opsional)" htmlFor="parentEmail" error={errors.email}>
                <Input
                  id="parentEmail"
                  type="email"
                  value={parent.email}
                  onChange={(e) => setParent({ ...parent, email: e.target.value })}
                  placeholder="nama@email.com"
                />
              </Field>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              {babies.length > 0 ? (
                <Field label="Pilih profil bayi" htmlFor="babyProfile">
                  <NativeSelect
                    id="babyProfile"
                    value={babyId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setBabyId(id);
                      const found = babies.find((b) => b.id === id);
                      if (found) {
                        setBaby({
                          name: found.name,
                          birthDate: found.birthDate,
                          gender: found.gender,
                          weightKg: found.weightKg ? String(found.weightKg) : '',
                          notes: found.notes ?? '',
                        });
                      } else {
                        setBaby({ name: '', birthDate: '', gender: 'FEMALE', weightKg: '', notes: '' });
                      }
                    }}
                  >
                    {babies.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                    <option value="">+ Tambah bayi baru</option>
                  </NativeSelect>
                </Field>
              ) : null}

              <Field label="Nama bayi" htmlFor="babyName" required error={errors.babyName}>
                <Input
                  id="babyName"
                  value={baby.name}
                  onChange={(e) => setBaby({ ...baby, name: e.target.value })}
                  placeholder="Nama panggilan si kecil"
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Tanggal lahir" htmlFor="birthDate" required error={errors.birthDate}>
                  <Input
                    id="birthDate"
                    type="date"
                    max={todayKey()}
                    value={baby.birthDate}
                    onChange={(e) => setBaby({ ...baby, birthDate: e.target.value })}
                  />
                </Field>
                <Field label="Jenis kelamin" htmlFor="gender">
                  <NativeSelect
                    id="gender"
                    value={baby.gender}
                    onChange={(e) => setBaby({ ...baby, gender: e.target.value })}
                  >
                    <option value="FEMALE">Perempuan</option>
                    <option value="MALE">Laki-laki</option>
                  </NativeSelect>
                </Field>
              </div>

              {baby.birthDate ? (
                <div className="flex items-center gap-2 rounded-2xl bg-[var(--color-accent-soft)] px-4 py-3 text-sm text-accent-foreground">
                  <BabyOutline className="size-4" />
                  Usia bayi saat ini: <strong>{babyAge(`${baby.birthDate}T00:00:00.000Z`)}</strong>
                </div>
              ) : null}

              <Field label="Berat badan (kg)" htmlFor="weight">
                <Input
                  id="weight"
                  inputMode="decimal"
                  value={baby.weightKg}
                  onChange={(e) => setBaby({ ...baby, weightKg: e.target.value })}
                  placeholder="Contoh: 6.8"
                />
              </Field>

              <Field label="Catatan kondisi bayi" htmlFor="babyNotes">
                <Textarea
                  id="babyNotes"
                  value={baby.notes}
                  onChange={(e) => setBaby({ ...baby, notes: e.target.value })}
                  placeholder="Misalnya kebiasaan tidur, riwayat kelahiran, atau hal lain yang perlu diketahui."
                />
              </Field>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Centang kondisi si kecil saat ini. Informasi ini membantu terapis menyiapkan treatment
                yang sesuai.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {BABY_CONDITIONS.map((condition) => {
                  const checked = conditions.includes(condition.value);
                  return (
                    <label
                      key={condition.value}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition',
                        checked ? 'border-primary bg-[var(--color-sage)]' : 'border-border bg-card',
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(state) => {
                          setConditions((prev) => {
                            if (condition.value === 'SEHAT') return state ? ['SEHAT'] : [];
                            const withoutHealthy = prev.filter((v) => v !== 'SEHAT');
                            return state
                              ? [...withoutHealthy, condition.value]
                              : withoutHealthy.filter((v) => v !== condition.value);
                          });
                        }}
                      />
                      {condition.label}
                    </label>
                  );
                })}
              </div>
              {errors.conditions ? (
                <p className="text-xs font-medium text-destructive">{errors.conditions}</p>
              ) : null}

              <Field
                label="Apakah ada kondisi khusus yang perlu diketahui terapis?"
                htmlFor="conditionNote"
              >
                <Textarea
                  id="conditionNote"
                  value={conditionNote}
                  onChange={(e) => setConditionNote(e.target.value)}
                  placeholder="Tuliskan kondisi khusus, riwayat alergi, atau obat yang sedang dikonsumsi."
                />
              </Field>

              {flagged ? (
                <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <AlertTriangle className="mt-0.5 size-5 shrink-0" />
                  <p>{CONDITION_WARNING}</p>
                </div>
              ) : null}
            </div>
          ) : null}

          {step === 4 ? (
            <div className="space-y-3">
              {services.map((item) => {
                const selected = item.id === serviceId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setServiceId(item.id)}
                    className={cn(
                      'flex w-full flex-col gap-1 rounded-2xl border p-4 text-left transition',
                      selected ? 'border-primary bg-[var(--color-sage)]' : 'border-border bg-card hover:bg-muted/60',
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="font-display text-base font-bold">{item.name}</span>
                      <span className="font-display text-base font-bold text-primary">
                        {formatCurrency(item.price)}
                      </span>
                    </div>
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="size-3.5" /> {item.durationMinutes} menit
                    </span>
                    {item.description ? (
                      <span className="text-sm text-muted-foreground">{item.description}</span>
                    ) : null}
                    {item.requirements ? (
                      <span className="mt-1 flex items-start gap-1.5 text-xs text-accent-foreground">
                        <Info className="mt-0.5 size-3.5 shrink-0" /> {item.requirements}
                      </span>
                    ) : null}
                  </button>
                );
              })}
              {errors.serviceId ? (
                <p className="text-xs font-medium text-destructive">{errors.serviceId}</p>
              ) : null}
            </div>
          ) : null}

          {step === 5 ? (
            <div className="space-y-5">
              <DatePicker value={date || null} onChange={setDate} minKey={minDate} maxKey={maxDate} />
              {errors.date ? <p className="text-xs font-medium text-destructive">{errors.date}</p> : null}

              <div>
                <Label className="mb-2 block">Pilih jam treatment</Label>
                {!date ? (
                  <p className="rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">
                    Pilih tanggal terlebih dahulu untuk melihat jam yang tersedia.
                  </p>
                ) : loadingSlots ? (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {Array.from({ length: 7 }).map((_, i) => (
                      <Skeleton key={i} className="h-12" />
                    ))}
                  </div>
                ) : slots && slots.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {slots.map((slot) => (
                      <button
                        key={slot.time}
                        type="button"
                        disabled={!slot.available}
                        title={slot.reason ?? undefined}
                        onClick={() => setStartTime(slot.time)}
                        className={cn(
                          'rounded-2xl border px-2 py-3 text-sm font-semibold transition',
                          startTime === slot.time
                            ? 'border-primary bg-primary text-primary-foreground'
                            : slot.available
                              ? 'border-border bg-card hover:bg-muted'
                              : 'cursor-not-allowed border-dashed border-border bg-muted/50 text-muted-foreground/50 line-through',
                        )}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">
                    Tidak ada slot tersedia pada tanggal ini.
                  </p>
                )}
                {errors.startTime ? (
                  <p className="mt-2 text-xs font-medium text-destructive">{errors.startTime}</p>
                ) : null}
                <p className="mt-3 text-xs text-muted-foreground">
                  Slot yang penuh otomatis dinonaktifkan. Minimal pemesanan {settings.minLeadHours} jam
                  sebelum treatment.
                </p>
              </div>
            </div>
          ) : null}

          {step === 6 ? (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setTherapistId('')}
                className={cn(
                  'flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition',
                  therapistId === '' ? 'border-primary bg-[var(--color-sage)]' : 'border-border bg-card',
                )}
              >
                <span className="flex size-10 items-center justify-center rounded-full bg-[var(--color-cream)]">
                  <Sparkles className="size-5 text-primary" />
                </span>
                <span>
                  <span className="block font-semibold">Tidak memilih</span>
                  <span className="block text-xs text-muted-foreground">
                    Biarkan kami menugaskan terapis terbaik yang tersedia.
                  </span>
                </span>
              </button>

              {loadingTherapists ? (
                <>
                  <Skeleton className="h-20" />
                  <Skeleton className="h-20" />
                </>
              ) : therapists && therapists.length > 0 ? (
                therapists.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTherapistId(t.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition',
                      therapistId === t.id ? 'border-primary bg-[var(--color-sage)]' : 'border-border bg-card',
                    )}
                  >
                    <span className="flex size-10 items-center justify-center rounded-full bg-[var(--color-blush)] text-sm font-bold text-secondary-foreground">
                      {t.name.slice(0, 1)}
                    </span>
                    <span className="flex-1">
                      <span className="block font-semibold">{t.name}</span>
                      {t.skills ? (
                        <span className="block text-xs text-muted-foreground">{t.skills}</span>
                      ) : null}
                    </span>
                    {therapistId === t.id ? <Check className="size-5 text-primary" /> : null}
                  </button>
                ))
              ) : (
                <p className="rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">
                  Tidak ada terapis yang bisa dipilih pada jam ini. Anda tetap dapat melanjutkan dengan
                  opsi &quot;Tidak memilih&quot;.
                </p>
              )}
            </div>
          ) : null}

          {step === 7 ? (
            <div className="space-y-4">
              <Field label="Alamat lengkap" htmlFor="address" required error={errors.address}>
                <Textarea
                  id="address"
                  value={address.address}
                  onChange={(e) => setAddress({ ...address, address: e.target.value })}
                  placeholder="Nama jalan, nomor rumah, RT/RW, perumahan"
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Kecamatan" htmlFor="district">
                  <Input
                    id="district"
                    value={address.district}
                    onChange={(e) => setAddress({ ...address, district: e.target.value })}
                  />
                </Field>
                <Field label="Kelurahan/Desa" htmlFor="village">
                  <Input
                    id="village"
                    value={address.village}
                    onChange={(e) => setAddress({ ...address, village: e.target.value })}
                  />
                </Field>
              </div>
              <Field label="Patokan" htmlFor="landmark">
                <Input
                  id="landmark"
                  value={address.landmark}
                  onChange={(e) => setAddress({ ...address, landmark: e.target.value })}
                  placeholder="Contoh: depan minimarket, pagar putih"
                />
              </Field>
              <Field label="Catatan lokasi" htmlFor="locationNote">
                <Textarea
                  id="locationNote"
                  value={address.locationNote}
                  onChange={(e) => setAddress({ ...address, locationNote: e.target.value })}
                  placeholder="Contoh: masuk gang sebelah kanan, rumah kedua."
                />
              </Field>
              <Field
                label="Link Google Maps (opsional)"
                htmlFor="mapsUrl"
                hint="Tempel tautan lokasi agar terapis lebih mudah menemukan rumah Anda."
              >
                <Input
                  id="mapsUrl"
                  value={address.mapsUrl}
                  onChange={(e) => setAddress({ ...address, mapsUrl: e.target.value })}
                  placeholder="https://maps.app.goo.gl/…"
                />
              </Field>
              <div className="flex items-start gap-2 rounded-2xl bg-[var(--color-cream)] px-4 py-3 text-sm">
                <MapPin className="mt-0.5 size-4 text-primary" />
                <span>
                  Biaya home care sebesar <strong>{formatCurrency(settings.transportFee)}</strong> akan
                  ditambahkan pada total pembayaran.
                </span>
              </div>
            </div>
          ) : null}

          {step === 8 ? (
            <div className="space-y-5">
              <SummaryBlock
                title="Data Orang Tua"
                icon={<UserRound className="size-4" />}
                rows={[
                  ['Nama', parent.name],
                  ['WhatsApp', parent.phone],
                  ['Email', parent.email || '-'],
                ]}
              />
              <SummaryBlock
                title="Data Bayi"
                icon={<BabyIcon className="size-4" />}
                rows={[
                  ['Nama', baby.name],
                  ['Usia', baby.birthDate ? babyAge(`${baby.birthDate}T00:00:00.000Z`) : '-'],
                  ['Jenis kelamin', baby.gender === 'MALE' ? 'Laki-laki' : 'Perempuan'],
                  ['Berat badan', baby.weightKg ? `${baby.weightKg} kg` : '-'],
                  [
                    'Kondisi',
                    conditions
                      .map((c) => BABY_CONDITIONS.find((item) => item.value === c)?.label ?? c)
                      .join(', '),
                  ],
                ]}
              />
              <SummaryBlock
                title="Jadwal & Layanan"
                icon={<Clock className="size-4" />}
                rows={[
                  ['Layanan', service?.name ?? '-'],
                  ['Durasi', service ? `${service.durationMinutes} menit` : '-'],
                  ['Tanggal', date ? formatDateId(`${date}T00:00:00.000Z`, { withDay: true }) : '-'],
                  ['Jam', startTime ? `${startTime} WIB` : '-'],
                  [
                    'Terapis',
                    therapistId
                      ? therapists?.find((t) => t.id === therapistId)?.name ?? '-'
                      : 'Ditentukan oleh admin',
                  ],
                ]}
              />
              <SummaryBlock
                title="Alamat Home Care"
                icon={<MapPin className="size-4" />}
                rows={[
                  ['Alamat', address.address],
                  ['Kecamatan', address.district || '-'],
                  ['Kelurahan', address.village || '-'],
                  ['Patokan', address.landmark || '-'],
                ]}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Kode promo (opsional)" htmlFor="promo">
                  <Input
                    id="promo"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    placeholder="Contoh: WELCOME10"
                  />
                </Field>
                <Field label="Metode pembayaran" htmlFor="paymentMethod">
                  <NativeSelect
                    id="paymentMethod"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    {Object.entries(PAYMENT_METHOD_LABEL).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
              </div>

              <Field label="Catatan untuk terapis (opsional)" htmlFor="customerNote">
                <Textarea
                  id="customerNote"
                  value={customerNote}
                  onChange={(e) => setCustomerNote(e.target.value)}
                  placeholder="Contoh: mohon datang tepat waktu, bayi tidur siang jam 12."
                />
              </Field>

              <div className="rounded-2xl border border-border bg-[var(--color-cream)]/60 p-4">
                <div className="flex justify-between py-1 text-sm">
                  <span>Harga layanan</span>
                  <span>{formatCurrency(service?.price ?? 0)}</span>
                </div>
                <div className="flex justify-between py-1 text-sm">
                  <span>Biaya home care</span>
                  <span>{formatCurrency(settings.transportFee)}</span>
                </div>
                <div className="flex justify-between py-1 text-sm text-muted-foreground">
                  <span>Diskon</span>
                  <span>{promoCode ? 'Diperiksa saat konfirmasi' : formatCurrency(0)}</span>
                </div>
                <div className="mt-2 flex justify-between border-t border-border pt-3 font-display text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">{formatCurrency(subtotal)}</span>
                </div>
              </div>

              {flagged ? (
                <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <AlertTriangle className="mt-0.5 size-5 shrink-0" />
                  <p>{CONDITION_WARNING}</p>
                </div>
              ) : null}

              <p className="text-xs text-muted-foreground">{settings.cancelPolicyText}</p>
            </div>
          ) : null}
        </div>

        <div className="mt-7 flex gap-3">
          {step > 1 ? (
            <Button type="button" variant="outline" onClick={goBack} className="flex-1 sm:flex-none">
              <ArrowLeft className="size-4" /> Kembali
            </Button>
          ) : null}
          {step < STEPS.length ? (
            <Button type="button" onClick={goNext} className="flex-1">
              Lanjut <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button type="button" onClick={submit} loading={submitting} className="flex-1">
              <CheckCircle2 className="size-4" /> Konfirmasi Reservasi
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export type AddressState = {
  address: string;
  district: string;
  village: string;
  landmark: string;
  locationNote: string;
  mapsUrl: string;
};

function SummaryBlock({
  title,
  icon,
  rows,
}: {
  title: string;
  icon: React.ReactNode;
  rows: [string, string][];
}) {
  return (
    <div className="rounded-2xl border border-border p-4">
      <p className="flex items-center gap-2 font-display text-sm font-bold">
        <span className="text-primary">{icon}</span>
        {title}
      </p>
      <dl className="mt-3 space-y-1.5">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 text-sm">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="max-w-[60%] text-right font-medium">{value || '-'}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function SuccessPanel({
  code,
  id,
  needsReview,
  isLoggedIn,
  phone,
}: {
  code: string;
  id: string;
  needsReview: boolean;
  isLoggedIn: boolean;
  phone: string;
}) {
  return (
    <div className="mx-auto w-full max-w-xl rounded-3xl border border-border bg-card p-6 text-center sm:p-8">
      <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-[var(--color-sage)]">
        <CheckCircle2 className="size-8 text-primary" />
      </span>
      <h2 className="mt-4 font-display text-xl font-bold">Reservasi berhasil dibuat</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Konfirmasi telah dikirim ke WhatsApp {phone}. Admin akan menghubungi Anda untuk konfirmasi
        jadwal.
      </p>

      <div className="mt-5 rounded-2xl border border-dashed border-primary/40 bg-[var(--color-cream)] px-4 py-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Nomor Reservasi</p>
        <p className="font-display text-2xl font-bold tracking-wide text-primary">{code}</p>
      </div>

      {needsReview ? (
        <div className="mt-4 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 size-5 shrink-0" />
          <p>{CONDITION_WARNING}</p>
        </div>
      ) : null}

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button asChild>
          <Link href={isLoggedIn ? `/akun/reservasi/${id}` : `/cek-reservasi?code=${code}`}>
            Lihat Detail Reservasi
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Kembali ke Beranda</Link>
        </Button>
      </div>
    </div>
  );
}
