export const ROLES = ['ADMIN', 'THERAPIST', 'CUSTOMER'] as const;
export type Role = (typeof ROLES)[number];

export const RESERVATION_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'ON_THE_WAY',
  'ARRIVED',
  'IN_SERVICE',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
] as const;
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

export const PAYMENT_STATUSES = ['UNPAID', 'PENDING', 'PAID', 'REFUNDED', 'CANCELLED'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_METHODS = ['CASH', 'TRANSFER', 'QRIS', 'GATEWAY'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const GENDERS = ['MALE', 'FEMALE'] as const;
export const DISCOUNT_TYPES = ['NOMINAL', 'PERCENT'] as const;
export const COMMISSION_TYPES = ['PERCENT', 'NOMINAL'] as const;

export const STATUS_LABEL: Record<ReservationStatus, string> = {
  PENDING: 'Menunggu Konfirmasi',
  CONFIRMED: 'Dikonfirmasi',
  ON_THE_WAY: 'Terapis Menuju Lokasi',
  ARRIVED: 'Terapis Tiba',
  IN_SERVICE: 'Sedang Treatment',
  COMPLETED: 'Selesai',
  CANCELLED: 'Dibatalkan',
  NO_SHOW: 'Tidak Hadir',
};

/** Kelas Tailwind untuk badge status — sengaja ditulis lengkap agar tidak di-purge. */
export const STATUS_CLASS: Record<ReservationStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-800 border-amber-200',
  CONFIRMED: 'bg-sky-100 text-sky-800 border-sky-200',
  ON_THE_WAY: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  ARRIVED: 'bg-violet-100 text-violet-800 border-violet-200',
  IN_SERVICE: 'bg-teal-100 text-teal-800 border-teal-200',
  COMPLETED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  CANCELLED: 'bg-rose-100 text-rose-800 border-rose-200',
  NO_SHOW: 'bg-zinc-200 text-zinc-700 border-zinc-300',
};

export const STATUS_DOT: Record<ReservationStatus, string> = {
  PENDING: 'bg-amber-500',
  CONFIRMED: 'bg-sky-500',
  ON_THE_WAY: 'bg-indigo-500',
  ARRIVED: 'bg-violet-500',
  IN_SERVICE: 'bg-teal-500',
  COMPLETED: 'bg-emerald-500',
  CANCELLED: 'bg-rose-500',
  NO_SHOW: 'bg-zinc-500',
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  UNPAID: 'Belum Bayar',
  PENDING: 'Menunggu Verifikasi',
  PAID: 'Lunas',
  REFUNDED: 'Dikembalikan',
  CANCELLED: 'Dibatalkan',
};

export const PAYMENT_STATUS_CLASS: Record<PaymentStatus, string> = {
  UNPAID: 'bg-zinc-100 text-zinc-700 border-zinc-200',
  PENDING: 'bg-amber-100 text-amber-800 border-amber-200',
  PAID: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  REFUNDED: 'bg-sky-100 text-sky-800 border-sky-200',
  CANCELLED: 'bg-rose-100 text-rose-800 border-rose-200',
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  CASH: 'Tunai',
  TRANSFER: 'Transfer Bank',
  QRIS: 'QRIS',
  GATEWAY: 'Payment Gateway',
};

/** Status berikutnya yang boleh dituju dari sebuah status (state machine). */
export const STATUS_TRANSITIONS: Record<ReservationStatus, ReservationStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['ON_THE_WAY', 'IN_SERVICE', 'CANCELLED', 'NO_SHOW'],
  ON_THE_WAY: ['ARRIVED', 'CANCELLED', 'NO_SHOW'],
  ARRIVED: ['IN_SERVICE', 'CANCELLED', 'NO_SHOW'],
  IN_SERVICE: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

export const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export type BabyConditionOption = {
  value: string;
  label: string;
  /** true = butuh review admin/terapis sebelum reservasi dikonfirmasi */
  flag: boolean;
};

export const BABY_CONDITIONS: BabyConditionOption[] = [
  { value: 'SEHAT', label: 'Sehat', flag: false },
  { value: 'BATUK_PILEK', label: 'Batuk/Pilek', flag: true },
  { value: 'DEMAM', label: 'Demam', flag: true },
  { value: 'DIARE', label: 'Diare', flag: true },
  { value: 'MUNTAH', label: 'Muntah', flag: true },
  { value: 'MINUM_OBAT', label: 'Sedang minum obat', flag: true },
  { value: 'KULIT', label: 'Kondisi kulit tertentu', flag: true },
  { value: 'ALERGI', label: 'Riwayat alergi', flag: true },
  { value: 'LAINNYA', label: 'Lainnya', flag: true },
];

export const CONDITION_WARNING =
  'Terima kasih. Demi keamanan bayi, kondisi ini perlu dikonfirmasi terlebih dahulu oleh admin/terapis sebelum reservasi dapat dilakukan.';

export const TREATMENT_AREAS = [
  'Kaki',
  'Perut',
  'Dada',
  'Tangan',
  'Punggung',
  'Wajah',
  'Kepala',
  'Relaksasi umum',
];

export const NOTIFICATION_TEMPLATES = [
  'RESERVATION_CREATED',
  'RESERVATION_CONFIRMED',
  'THERAPIST_ON_THE_WAY',
  'RESERVATION_COMPLETED',
  'RESERVATION_CANCELLED',
  'REMINDER_H1',
  'REMINDER_H2H',
  'PAYMENT_CONFIRMED',
] as const;
export type NotificationTemplate = (typeof NOTIFICATION_TEMPLATES)[number];

export const SETTING_KEYS = {
  businessName: 'business.name',
  businessTagline: 'business.tagline',
  businessLogo: 'business.logo',
  businessWhatsapp: 'business.whatsapp',
  businessAddress: 'business.address',
  businessEmail: 'business.email',
  openHour: 'schedule.openHour',
  closeHour: 'schedule.closeHour',
  slotMinutes: 'schedule.slotMinutes',
  slotTimes: 'schedule.slotTimes',
  minLeadHours: 'schedule.minLeadHours',
  maxAdvanceDays: 'schedule.maxAdvanceDays',
  cancelPolicyHours: 'schedule.cancelPolicyHours',
  cancelPolicyText: 'schedule.cancelPolicyText',
  transportFee: 'payment.transportFee',
  bankAccount: 'payment.bankAccount',
  qrisImage: 'payment.qrisImage',
  waProvider: 'notification.waProvider',
  waEnabled: 'notification.waEnabled',
  reminderH1: 'notification.reminderH1',
  reminderH2h: 'notification.reminderH2h',
} as const;
