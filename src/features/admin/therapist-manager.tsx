'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { CalendarOff, MapPin, Pencil, Phone, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Field, Input, Textarea } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/select';
import { Avatar, Switch } from '@/components/ui/misc';
import {
  ConfirmDialog,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ApiClientError, apiFetch } from '@/lib/client';
import { DAY_NAMES } from '@/lib/constants';
import { toDateKey } from '@/lib/datetime';

export type TherapistRow = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  photoUrl: string | null;
  bio: string | null;
  skills: string | null;
  serviceAreas: string | null;
  isActive: boolean;
  commissionType: string;
  commissionValue: number;
  maxDailyBooking: number;
  schedules: { dayOfWeek: number; startTime: string; endTime: string; isDayOff: boolean }[];
  timeOffs: { id: string; date: string; reason: string | null }[];
  _count?: { reservations: number };
};

type ScheduleForm = { dayOfWeek: number; startTime: string; endTime: string; isDayOff: boolean };

const DEFAULT_SCHEDULE: ScheduleForm[] = Array.from({ length: 7 }, (_, day) => ({
  dayOfWeek: day,
  startTime: '09:00',
  endTime: '17:00',
  isDayOff: day === 0,
}));

const EMPTY = {
  name: '',
  phone: '',
  email: '',
  photoUrl: '',
  bio: '',
  skills: '',
  serviceAreas: '',
  isActive: true,
  commissionType: 'PERCENT',
  commissionValue: '20',
  maxDailyBooking: '6',
  createAccount: false,
  accountPassword: '',
};

export function TherapistManager({ therapists }: { therapists: TherapistRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<TherapistRow | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState(EMPTY);
  const [schedules, setSchedules] = useState<ScheduleForm[]>(DEFAULT_SCHEDULE);
  const [timeOffs, setTimeOffs] = useState<{ date: string; reason: string }[]>([]);
  const [newTimeOff, setNewTimeOff] = useState({ date: '', reason: '' });

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setSchedules(DEFAULT_SCHEDULE);
    setTimeOffs([]);
    setErrors({});
    setOpen(true);
  }

  function openEdit(therapist: TherapistRow) {
    setEditing(therapist.id);
    setErrors({});
    setForm({
      name: therapist.name,
      phone: therapist.phone,
      email: therapist.email ?? '',
      photoUrl: therapist.photoUrl ?? '',
      bio: therapist.bio ?? '',
      skills: therapist.skills ?? '',
      serviceAreas: therapist.serviceAreas ?? '',
      isActive: therapist.isActive,
      commissionType: therapist.commissionType,
      commissionValue: String(therapist.commissionValue),
      maxDailyBooking: String(therapist.maxDailyBooking),
      createAccount: false,
      accountPassword: '',
    });
    setSchedules(
      DEFAULT_SCHEDULE.map(
        (fallback) =>
          therapist.schedules.find((s) => s.dayOfWeek === fallback.dayOfWeek) ?? fallback,
      ),
    );
    setTimeOffs(
      therapist.timeOffs.map((off) => ({ date: toDateKey(off.date), reason: off.reason ?? '' })),
    );
    setOpen(true);
  }

  async function save() {
    setBusy(true);
    setErrors({});
    try {
      const payload = {
        name: form.name,
        phone: form.phone,
        email: form.email || null,
        photoUrl: form.photoUrl || null,
        bio: form.bio || null,
        skills: form.skills || null,
        serviceAreas: form.serviceAreas || null,
        isActive: form.isActive,
        commissionType: form.commissionType,
        commissionValue: Number(form.commissionValue),
        maxDailyBooking: Number(form.maxDailyBooking),
        schedules,
        timeOffs,
        ...(form.createAccount && !editing
          ? { createAccount: true, accountPassword: form.accountPassword }
          : {}),
      };
      if (editing) {
        await apiFetch(`/api/therapists/${editing}`, { method: 'PATCH', json: payload });
      } else {
        await apiFetch('/api/therapists', { method: 'POST', json: payload });
      }
      toast.success(editing ? 'Data terapis diperbarui' : 'Terapis ditambahkan');
      setOpen(false);
      router.refresh();
    } catch (error) {
      if (error instanceof ApiClientError) {
        setErrors(error.errors ?? {});
        toast.error(error.message);
      } else {
        toast.error('Gagal menyimpan terapis');
      }
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!deleting) return;
    setBusy(true);
    try {
      const result = await apiFetch<{ deactivated?: boolean }>(`/api/therapists/${deleting.id}`, {
        method: 'DELETE',
      });
      toast.success(
        result?.deactivated ? 'Terapis dinonaktifkan (punya riwayat reservasi).' : 'Terapis dihapus',
      );
      setDeleting(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menghapus terapis');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-4" /> Tambah terapis
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {therapists.map((therapist) => {
          const workingDays = therapist.schedules.filter((s) => !s.isDayOff);
          return (
            <Card key={therapist.id} className="flex flex-col p-5">
              <div className="flex items-start gap-3">
                <Avatar name={therapist.name} src={therapist.photoUrl} className="size-12" />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-display text-base font-bold">{therapist.name}</h3>
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Phone className="size-3.5" /> {therapist.phone}
                  </p>
                </div>
                <Badge variant={therapist.isActive ? 'default' : 'soft'}>
                  {therapist.isActive ? 'Aktif' : 'Nonaktif'}
                </Badge>
              </div>

              {therapist.skills ? (
                <p className="mt-3 text-sm text-muted-foreground">{therapist.skills}</p>
              ) : null}
              {therapist.serviceAreas ? (
                <p className="mt-1.5 flex items-start gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="mt-0.5 size-3.5 shrink-0" /> {therapist.serviceAreas}
                </p>
              ) : null}

              <div className="mt-3 flex flex-wrap gap-1">
                {DAY_NAMES.map((day, index) => {
                  const schedule = therapist.schedules.find((s) => s.dayOfWeek === index);
                  const off = !schedule || schedule.isDayOff;
                  return (
                    <span
                      key={day}
                      title={off ? 'Libur' : `${schedule?.startTime}–${schedule?.endTime}`}
                      className={`rounded-lg px-1.5 py-0.5 text-[10px] font-semibold ${
                        off ? 'bg-muted text-muted-foreground/60' : 'bg-[var(--color-sage)] text-primary'
                      }`}
                    >
                      {day.slice(0, 3)}
                    </span>
                  );
                })}
              </div>

              <p className="mt-3 text-xs text-muted-foreground">
                Komisi {therapist.commissionType === 'PERCENT' ? `${therapist.commissionValue}%` : `Rp${therapist.commissionValue}/treatment`}{' '}
                · maks {therapist.maxDailyBooking} kunjungan/hari · {workingDays.length} hari kerja
                {therapist.timeOffs.length ? ` · ${therapist.timeOffs.length} hari libur khusus` : ''}
              </p>
              {therapist._count ? (
                <p className="text-xs text-muted-foreground">
                  {therapist._count.reservations} reservasi ditangani
                </p>
              ) : null}

              <div className="mt-4 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(therapist)}>
                  <Pencil className="size-4" /> Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setDeleting(therapist)}>
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit terapis' : 'Tambah terapis'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nama" htmlFor="th-name" required error={errors.name}>
                <Input
                  id="th-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </Field>
              <Field label="Nomor WhatsApp" htmlFor="th-phone" required error={errors.phone}>
                <Input
                  id="th-phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </Field>
              <Field label="Email" htmlFor="th-email" error={errors.email}>
                <Input
                  id="th-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </Field>
              <Field label="URL foto" htmlFor="th-photo">
                <Input
                  id="th-photo"
                  value={form.photoUrl}
                  onChange={(e) => setForm({ ...form, photoUrl: e.target.value })}
                />
              </Field>
              <Field label="Keahlian" htmlFor="th-skills">
                <Input
                  id="th-skills"
                  value={form.skills}
                  onChange={(e) => setForm({ ...form, skills: e.target.value })}
                  placeholder="Baby massage, baby spa"
                />
              </Field>
              <Field label="Area layanan" htmlFor="th-area">
                <Input
                  id="th-area"
                  value={form.serviceAreas}
                  onChange={(e) => setForm({ ...form, serviceAreas: e.target.value })}
                  placeholder="Sleman, Depok"
                />
              </Field>
              <Field label="Skema komisi" htmlFor="th-ctype">
                <NativeSelect
                  id="th-ctype"
                  value={form.commissionType}
                  onChange={(e) => setForm({ ...form, commissionType: e.target.value })}
                >
                  <option value="PERCENT">Persentase (%)</option>
                  <option value="NOMINAL">Nominal per treatment</option>
                </NativeSelect>
              </Field>
              <Field label="Nilai komisi" htmlFor="th-cvalue">
                <Input
                  id="th-cvalue"
                  inputMode="numeric"
                  value={form.commissionValue}
                  onChange={(e) => setForm({ ...form, commissionValue: e.target.value.replace(/[^\d.]/g, '') })}
                />
              </Field>
              <Field label="Maksimal kunjungan / hari" htmlFor="th-max">
                <Input
                  id="th-max"
                  inputMode="numeric"
                  value={form.maxDailyBooking}
                  onChange={(e) => setForm({ ...form, maxDailyBooking: e.target.value.replace(/\D/g, '') })}
                />
              </Field>
            </div>

            <Field label="Bio singkat" htmlFor="th-bio">
              <Textarea
                id="th-bio"
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
              />
            </Field>

            <div className="rounded-2xl border border-border p-4">
              <p className="text-sm font-semibold">Jadwal kerja</p>
              <div className="mt-3 space-y-2">
                {schedules.map((schedule, index) => (
                  <div key={schedule.dayOfWeek} className="flex flex-wrap items-center gap-2">
                    <span className="w-16 text-sm">{DAY_NAMES[schedule.dayOfWeek]}</span>
                    <Input
                      type="time"
                      className="h-9 w-32"
                      value={schedule.startTime}
                      disabled={schedule.isDayOff}
                      onChange={(e) => {
                        const next = [...schedules];
                        next[index] = { ...schedule, startTime: e.target.value };
                        setSchedules(next);
                      }}
                    />
                    <span className="text-muted-foreground">–</span>
                    <Input
                      type="time"
                      className="h-9 w-32"
                      value={schedule.endTime}
                      disabled={schedule.isDayOff}
                      onChange={(e) => {
                        const next = [...schedules];
                        next[index] = { ...schedule, endTime: e.target.value };
                        setSchedules(next);
                      }}
                    />
                    <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
                      Libur
                      <Switch
                        checked={schedule.isDayOff}
                        onCheckedChange={(checked) => {
                          const next = [...schedules];
                          next[index] = { ...schedule, isDayOff: checked };
                          setSchedules(next);
                        }}
                      />
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-border p-4">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <CalendarOff className="size-4" /> Hari libur khusus
              </p>
              <div className="mt-3 space-y-2">
                {timeOffs.map((off, index) => (
                  <div key={`${off.date}-${index}`} className="flex items-center gap-2">
                    <span className="flex-1 text-sm">{off.date}</span>
                    <span className="flex-1 truncate text-xs text-muted-foreground">{off.reason}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setTimeOffs(timeOffs.filter((_, i) => i !== index))}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    type="date"
                    className="h-9 w-40"
                    value={newTimeOff.date}
                    onChange={(e) => setNewTimeOff({ ...newTimeOff, date: e.target.value })}
                  />
                  <Input
                    className="h-9 flex-1"
                    placeholder="Alasan (opsional)"
                    value={newTimeOff.reason}
                    onChange={(e) => setNewTimeOff({ ...newTimeOff, reason: e.target.value })}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (!newTimeOff.date) return;
                      if (timeOffs.some((off) => off.date === newTimeOff.date)) return;
                      setTimeOffs([...timeOffs, newTimeOff]);
                      setNewTimeOff({ date: '', reason: '' });
                    }}
                  >
                    Tambah
                  </Button>
                </div>
              </div>
            </div>

            {!editing ? (
              <div className="rounded-2xl border border-border p-4">
                <label className="flex items-center justify-between">
                  <span className="text-sm font-medium">Buatkan akun login terapis</span>
                  <Switch
                    checked={form.createAccount}
                    onCheckedChange={(checked) => setForm({ ...form, createAccount: checked })}
                  />
                </label>
                {form.createAccount ? (
                  <Field
                    className="mt-3"
                    label="Password awal"
                    htmlFor="th-pass"
                    hint="Minimal 8 karakter. Minta terapis menggantinya setelah login pertama."
                    error={errors.accountPassword}
                  >
                    <Input
                      id="th-pass"
                      type="password"
                      value={form.accountPassword}
                      onChange={(e) => setForm({ ...form, accountPassword: e.target.value })}
                    />
                  </Field>
                ) : null}
              </div>
            ) : null}

            <label className="flex items-center justify-between rounded-2xl border border-border px-4 py-3">
              <span className="text-sm font-medium">Terapis aktif</span>
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
        title={`Hapus terapis ${deleting?.name ?? ''}?`}
        description="Terapis yang memiliki riwayat reservasi hanya akan dinonaktifkan."
        destructive
        loading={busy}
        onConfirm={remove}
      />
    </div>
  );
}
