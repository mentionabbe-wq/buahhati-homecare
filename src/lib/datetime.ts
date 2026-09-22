/**
 * Semua jadwal disimpan sebagai "wall clock" zona bisnis (default WIB, UTC+7)
 * lalu dipetakan ke UTC saat masuk database. Dengan begitu perbandingan slot
 * konsisten di mesin dev maupun server produksi dengan TZ berbeda.
 */
export const BUSINESS_TZ_OFFSET_MINUTES = Number(process.env.BUSINESS_TZ_OFFSET ?? 420);

const DAY_MS = 86_400_000;

/** "2026-09-10" -> Date UTC tengah malam. */
export function dateKeyToDate(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0));
}

/** Date -> "2026-09-10" (komponen UTC). */
export function toDateKey(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().slice(0, 10);
}

/** Gabungkan "2026-09-10" + "09:00" menjadi timestamp UTC. */
export function combineDateTime(dateKey: string, time: string): Date {
  const [h, min] = time.split(':').map(Number);
  const base = dateKeyToDate(dateKey);
  return new Date(base.getTime() + (h || 0) * 3_600_000 + (min || 0) * 60_000);
}

export function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = (h || 0) * 60 + (m || 0) + minutes;
  const hh = Math.floor((total % 1440) / 60);
  const mm = total % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** Waktu sekarang dalam wall clock zona bisnis (dinyatakan sebagai Date UTC). */
export function businessNow(): Date {
  return new Date(Date.now() + BUSINESS_TZ_OFFSET_MINUTES * 60_000);
}

export function todayKey(): string {
  return toDateKey(businessNow());
}

export function addDaysKey(key: string, days: number): string {
  return toDateKey(new Date(dateKeyToDate(key).getTime() + days * DAY_MS));
}

export function dayOfWeek(key: string): number {
  return dateKeyToDate(key).getUTCDay();
}

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export function formatDateId(date: Date | string, opts: { withDay?: boolean; short?: boolean } = {}) {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '-';
  const day = d.getUTCDate();
  const month = opts.short ? MONTHS[d.getUTCMonth()].slice(0, 3) : MONTHS[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  const prefix = opts.withDay ? `${DAYS[d.getUTCDay()]}, ` : '';
  return `${prefix}${day} ${month} ${year}`;
}

export function formatDateTimeId(date: Date | string) {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '-';
  const local = new Date(d.getTime() + BUSINESS_TZ_OFFSET_MINUTES * 60_000);
  const hh = String(local.getUTCHours()).padStart(2, '0');
  const mm = String(local.getUTCMinutes()).padStart(2, '0');
  return `${formatDateId(local, { short: true })} ${hh}.${mm}`;
}

/** Usia bayi dalam format "3 bulan 12 hari". */
export function babyAge(birthDate: Date | string, at: Date = businessNow()) {
  const b = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;
  if (Number.isNaN(b.getTime())) return '-';
  let years = at.getUTCFullYear() - b.getUTCFullYear();
  let months = at.getUTCMonth() - b.getUTCMonth();
  let days = at.getUTCDate() - b.getUTCDate();
  if (days < 0) {
    months -= 1;
    days += new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), 0)).getUTCDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (years < 0) return '-';
  const totalMonths = years * 12 + months;
  if (totalMonths <= 0) return `${days} hari`;
  if (years === 0) return `${months} bulan${days ? ` ${days} hari` : ''}`;
  return `${years} tahun${months ? ` ${months} bulan` : ''}`;
}

export function ageInMonths(birthDate: Date | string, at: Date = businessNow()) {
  const b = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;
  return (at.getUTCFullYear() - b.getUTCFullYear()) * 12 + (at.getUTCMonth() - b.getUTCMonth());
}

export function monthRange(year: number, month: number) {
  const start = new Date(Date.UTC(year, month, 1));
  const end = new Date(Date.UTC(year, month + 1, 1));
  return { start, end };
}

export function eachDayKey(startKey: string, endKey: string) {
  const out: string[] = [];
  let cur = dateKeyToDate(startKey).getTime();
  const end = dateKeyToDate(endKey).getTime();
  while (cur <= end) {
    out.push(toDateKey(new Date(cur)));
    cur += DAY_MS;
  }
  return out;
}

export function monthLabel(year: number, month: number) {
  return `${MONTHS[month]} ${year}`;
}

export { MONTHS, DAYS };
