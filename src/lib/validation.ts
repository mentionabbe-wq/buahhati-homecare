import { z } from 'zod';
import {
  COMMISSION_TYPES,
  DISCOUNT_TYPES,
  GENDERS,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  RESERVATION_STATUSES,
  ROLES,
} from './constants';

const enumOf = <T extends readonly [string, ...string[]]>(values: T) => z.enum(values);

export const phoneSchema = z
  .string()
  .trim()
  .min(9, 'Nomor WhatsApp minimal 9 digit')
  .max(20, 'Nomor WhatsApp terlalu panjang')
  .regex(/^[0-9+\-\s()]+$/, 'Nomor WhatsApp hanya boleh berisi angka');

export const dateKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD');

export const timeSchema = z.string().regex(/^\d{2}:\d{2}$/, 'Format jam harus HH:MM');

export const emailSchema = z
  .string()
  .trim()
  .email('Format email tidak valid');

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password wajib diisi'),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Nama minimal 2 karakter').max(80),
  email: emailSchema,
  phone: phoneSchema,
  password: z
    .string()
    .min(8, 'Password minimal 8 karakter')
    .regex(/[a-z]/, 'Password harus memuat huruf kecil')
    .regex(/[A-Z]/, 'Password harus memuat huruf besar')
    .regex(/[0-9]/, 'Password harus memuat angka'),
});

export const babyConditionSchema = z.object({
  conditions: z.array(z.string()).default([]),
  conditionNote: z.string().max(1000).optional().nullable(),
});

export const createReservationSchema = z.object({
  parent: z.object({
    name: z.string().trim().min(2, 'Nama orang tua wajib diisi').max(80),
    phone: phoneSchema,
    email: z.union([emailSchema, z.literal('')]).optional().nullable(),
  }),
  baby: z.object({
    id: z.string().optional().nullable(),
    name: z.string().trim().min(1, 'Nama bayi wajib diisi').max(80),
    birthDate: dateKeySchema,
    gender: enumOf(GENDERS),
    weightKg: z.coerce.number().min(0).max(60).optional().nullable(),
    notes: z.string().max(1000).optional().nullable(),
  }),
  conditions: z.array(z.string()).default([]),
  conditionNote: z.string().max(1000).optional().nullable(),
  serviceId: z.string().min(1, 'Layanan wajib dipilih'),
  therapistId: z.string().optional().nullable(),
  date: dateKeySchema,
  startTime: timeSchema,
  address: z.object({
    address: z.string().trim().min(5, 'Alamat lengkap wajib diisi').max(500),
    district: z.string().trim().max(100).optional().nullable(),
    village: z.string().trim().max(100).optional().nullable(),
    landmark: z.string().trim().max(200).optional().nullable(),
    locationNote: z.string().trim().max(500).optional().nullable(),
    mapsUrl: z.string().trim().max(500).optional().nullable(),
  }),
  promoCode: z.string().trim().max(40).optional().nullable(),
  customerNote: z.string().max(1000).optional().nullable(),
  paymentMethod: enumOf(PAYMENT_METHODS).default('CASH'),
});
export type CreateReservationInput = z.infer<typeof createReservationSchema>;

export const updateReservationSchema = z.object({
  status: enumOf(RESERVATION_STATUSES).optional(),
  therapistId: z.string().nullable().optional(),
  date: dateKeySchema.optional(),
  startTime: timeSchema.optional(),
  address: z.string().max(500).optional(),
  district: z.string().max(100).nullable().optional(),
  village: z.string().max(100).nullable().optional(),
  landmark: z.string().max(200).nullable().optional(),
  locationNote: z.string().max(500).nullable().optional(),
  mapsUrl: z.string().max(500).nullable().optional(),
  transportFee: z.coerce.number().int().min(0).optional(),
  discount: z.coerce.number().int().min(0).optional(),
  adminNote: z.string().max(1000).nullable().optional(),
  cancelReason: z.string().max(500).nullable().optional(),
  paymentStatus: enumOf(PAYMENT_STATUSES).optional(),
});

export const serviceSchema = z.object({
  name: z.string().trim().min(2, 'Nama layanan wajib diisi').max(100),
  description: z.string().max(2000).optional().nullable(),
  durationMinutes: z.coerce.number().int().min(15, 'Durasi minimal 15 menit').max(480),
  price: z.coerce.number().int().min(0, 'Harga tidak boleh negatif'),
  imageUrl: z.string().max(500).optional().nullable(),
  isActive: z.boolean().default(true),
  maxPerSlot: z.coerce.number().int().min(1).max(20).default(1),
  requirements: z.string().max(1000).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

export const therapistScheduleSchema = z.object({
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startTime: timeSchema,
  endTime: timeSchema,
  isDayOff: z.boolean().default(false),
});

export const therapistSchema = z.object({
  name: z.string().trim().min(2, 'Nama terapis wajib diisi').max(80),
  phone: phoneSchema,
  email: z.union([emailSchema, z.literal('')]).optional().nullable(),
  photoUrl: z.string().max(500).optional().nullable(),
  bio: z.string().max(1000).optional().nullable(),
  skills: z.string().max(500).optional().nullable(),
  serviceAreas: z.string().max(500).optional().nullable(),
  isActive: z.boolean().default(true),
  commissionType: enumOf(COMMISSION_TYPES).default('PERCENT'),
  commissionValue: z.coerce.number().min(0).max(1_000_000).default(20),
  maxDailyBooking: z.coerce.number().int().min(1).max(20).default(6),
  schedules: z.array(therapistScheduleSchema).optional(),
  createAccount: z.boolean().optional(),
  accountPassword: z.string().min(8).optional().nullable(),
});

export const customerSchema = z.object({
  name: z.string().trim().min(2, 'Nama wajib diisi').max(80),
  phone: phoneSchema,
  email: z.union([emailSchema, z.literal('')]).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  district: z.string().max(100).optional().nullable(),
  village: z.string().max(100).optional().nullable(),
  landmark: z.string().max(200).optional().nullable(),
  locationNote: z.string().max(500).optional().nullable(),
  mapsUrl: z.string().max(500).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export const babySchema = z.object({
  customerId: z.string().min(1),
  name: z.string().trim().min(1, 'Nama bayi wajib diisi').max(80),
  birthDate: dateKeySchema,
  gender: enumOf(GENDERS),
  weightKg: z.coerce.number().min(0).max(60).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  allergies: z.string().max(1000).optional().nullable(),
  isActive: z.boolean().default(true),
});

export const treatmentSchema = z.object({
  reservationId: z.string().min(1),
  conditionBefore: z.string().max(1000).optional().nullable(),
  conditionDuring: z.string().max(1000).optional().nullable(),
  conditionAfter: z.string().max(1000).optional().nullable(),
  treatmentAreas: z.array(z.string()).default([]),
  durationMinutes: z.coerce.number().int().min(0).max(480).default(0),
  babyResponse: z.string().max(1000).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  recommendation: z.string().max(2000).optional().nullable(),
  signatureName: z.string().max(100).optional().nullable(),
});

export const paymentSchema = z.object({
  reservationId: z.string().min(1),
  method: enumOf(PAYMENT_METHODS),
  amount: z.coerce.number().int().min(0),
  status: enumOf(PAYMENT_STATUSES).default('PENDING'),
  reference: z.string().max(100).optional().nullable(),
  proofUrl: z.string().max(500).optional().nullable(),
  note: z.string().max(500).optional().nullable(),
});

export const promoSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3, 'Kode promo minimal 3 karakter')
      .max(40)
      .regex(/^[A-Za-z0-9_-]+$/, 'Kode promo hanya boleh huruf, angka, - dan _'),
    name: z.string().trim().min(2, 'Nama promo wajib diisi').max(100),
    description: z.string().max(1000).optional().nullable(),
    discountType: enumOf(DISCOUNT_TYPES),
    discountValue: z.coerce.number().int().min(1, 'Nilai diskon wajib diisi'),
    minTransaction: z.coerce.number().int().min(0).default(0),
    maxDiscount: z.coerce.number().int().min(0).optional().nullable(),
    startDate: dateKeySchema,
    endDate: dateKeySchema,
    quota: z.coerce.number().int().min(0).optional().nullable(),
    isActive: z.boolean().default(true),
    serviceIds: z.array(z.string()).optional().nullable(),
  })
  .refine((v) => v.endDate >= v.startDate, {
    message: 'Tanggal berakhir harus setelah tanggal mulai',
    path: ['endDate'],
  })
  .refine((v) => v.discountType !== 'PERCENT' || v.discountValue <= 100, {
    message: 'Diskon persentase maksimal 100%',
    path: ['discountValue'],
  });

export const settingsSchema = z.record(z.string(), z.string());

export const userSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: emailSchema,
  role: enumOf(ROLES),
  password: z.string().min(8).optional().nullable(),
  isActive: z.boolean().default(true),
});

export const availabilityQuerySchema = z.object({
  date: dateKeySchema,
  serviceId: z.string().min(1),
  therapistId: z.string().optional().nullable(),
  excludeReservationId: z.string().optional().nullable(),
});
