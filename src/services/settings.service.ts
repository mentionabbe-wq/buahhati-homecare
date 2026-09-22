import 'server-only';
import { prisma } from '@/lib/prisma';
import { SETTING_KEYS } from '@/lib/constants';

export type AppSettings = {
  businessName: string;
  businessTagline: string;
  businessLogo: string;
  businessWhatsapp: string;
  businessAddress: string;
  businessEmail: string;
  openHour: string;
  closeHour: string;
  slotMinutes: number;
  slotTimes: string[];
  minLeadHours: number;
  maxAdvanceDays: number;
  cancelPolicyHours: number;
  cancelPolicyText: string;
  transportFee: number;
  bankAccount: string;
  qrisImage: string;
  waProvider: string;
  waEnabled: boolean;
  reminderH1: boolean;
  reminderH2h: boolean;
};

export const DEFAULT_SETTINGS: AppSettings = {
  businessName: process.env.NEXT_PUBLIC_APP_NAME || 'BuahHati Home Care',
  businessTagline: 'Baby Massage & Baby Spa profesional langsung di rumah Anda',
  businessLogo: '',
  businessWhatsapp: '6281200000000',
  businessAddress: 'Jl. Melati No. 12, Yogyakarta',
  businessEmail: 'halo@buahhati.care',
  openHour: '09:00',
  closeHour: '17:00',
  slotMinutes: 60,
  slotTimes: ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'],
  minLeadHours: 3,
  maxAdvanceDays: 30,
  cancelPolicyHours: 12,
  cancelPolicyText:
    'Pembatalan atau reschedule gratis bila dilakukan minimal 12 jam sebelum jadwal treatment.',
  transportFee: 15000,
  bankAccount: 'BCA 1234567890 a.n. BuahHati Home Care',
  qrisImage: '',
  waProvider: process.env.WHATSAPP_PROVIDER || 'mock',
  waEnabled: true,
  reminderH1: true,
  reminderH2h: true,
};

const KEY_MAP: Record<keyof AppSettings, string> = {
  businessName: SETTING_KEYS.businessName,
  businessTagline: SETTING_KEYS.businessTagline,
  businessLogo: SETTING_KEYS.businessLogo,
  businessWhatsapp: SETTING_KEYS.businessWhatsapp,
  businessAddress: SETTING_KEYS.businessAddress,
  businessEmail: SETTING_KEYS.businessEmail,
  openHour: SETTING_KEYS.openHour,
  closeHour: SETTING_KEYS.closeHour,
  slotMinutes: SETTING_KEYS.slotMinutes,
  slotTimes: SETTING_KEYS.slotTimes,
  minLeadHours: SETTING_KEYS.minLeadHours,
  maxAdvanceDays: SETTING_KEYS.maxAdvanceDays,
  cancelPolicyHours: SETTING_KEYS.cancelPolicyHours,
  cancelPolicyText: SETTING_KEYS.cancelPolicyText,
  transportFee: SETTING_KEYS.transportFee,
  bankAccount: SETTING_KEYS.bankAccount,
  qrisImage: SETTING_KEYS.qrisImage,
  waProvider: SETTING_KEYS.waProvider,
  waEnabled: SETTING_KEYS.waEnabled,
  reminderH1: SETTING_KEYS.reminderH1,
  reminderH2h: SETTING_KEYS.reminderH2h,
};

function parseValue<K extends keyof AppSettings>(key: K, raw: string): AppSettings[K] {
  const fallback = DEFAULT_SETTINGS[key];
  if (typeof fallback === 'number') return (Number(raw) || fallback) as AppSettings[K];
  if (typeof fallback === 'boolean') return (raw === 'true') as AppSettings[K];
  if (Array.isArray(fallback)) {
    try {
      const parsed = JSON.parse(raw);
      return (Array.isArray(parsed) && parsed.length ? parsed : fallback) as AppSettings[K];
    } catch {
      return fallback;
    }
  }
  return (raw ?? fallback) as AppSettings[K];
}

export function serializeValue(value: unknown) {
  if (Array.isArray(value)) return JSON.stringify(value);
  return String(value ?? '');
}

/** Baca seluruh pengaturan; nilai yang belum ada memakai default. */
export async function getSettings(): Promise<AppSettings> {
  const rows = await prisma.setting.findMany().catch(() => []);
  const byKey = new Map(rows.map((row) => [row.key, row.value]));
  const result = { ...DEFAULT_SETTINGS };
  (Object.keys(KEY_MAP) as (keyof AppSettings)[]).forEach((field) => {
    const raw = byKey.get(KEY_MAP[field]);
    if (raw !== undefined && raw !== '') {
      // @ts-expect-error index assignment across union types
      result[field] = parseValue(field, raw);
    }
  });
  return result;
}

export async function saveSettings(patch: Partial<Record<keyof AppSettings, unknown>>) {
  const entries = Object.entries(patch) as [keyof AppSettings, unknown][];
  await prisma.$transaction(
    entries
      .filter(([field]) => KEY_MAP[field])
      .map(([field, value]) =>
        prisma.setting.upsert({
          where: { key: KEY_MAP[field] },
          update: { value: serializeValue(value) },
          create: {
            key: KEY_MAP[field],
            value: serializeValue(value),
            group: KEY_MAP[field].split('.')[0],
          },
        }),
      ),
  );
}

export function settingKeyOf(field: keyof AppSettings) {
  return KEY_MAP[field];
}
