/**
 * Seed database BuahHati Home Care.
 * Menyediakan akun demo, master data, dan reservasi contoh agar dashboard
 * langsung terlihat hidup setelah aplikasi dijalankan.
 *
 * Jangan gunakan password seed ini di produksi.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DAY_MS = 86_400_000;

function dateKey(offsetDays: number) {
  const now = new Date(Date.now() + 420 * 60_000); // WIB
  const base = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return new Date(base.getTime() + offsetDays * DAY_MS).toISOString().slice(0, 10);
}

function toDate(key: string) {
  return new Date(`${key}T00:00:00.000Z`);
}

function combine(key: string, time: string) {
  const [h, m] = time.split(':').map(Number);
  return new Date(toDate(key).getTime() + h * 3_600_000 + m * 60_000);
}

function addMinutes(time: string, minutes: number) {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

const SETTINGS: [string, string, string][] = [
  ['business.name', 'BuahHati Home Care', 'business'],
  ['business.tagline', 'Baby Massage & Baby Spa profesional langsung di rumah Anda', 'business'],
  ['business.whatsapp', '6281200000000', 'business'],
  ['business.address', 'Jl. Melati No. 12, Sleman, Yogyakarta', 'business'],
  ['business.email', 'halo@buahhati.care', 'business'],
  ['schedule.openHour', '09:00', 'schedule'],
  ['schedule.closeHour', '17:00', 'schedule'],
  ['schedule.slotMinutes', '60', 'schedule'],
  ['schedule.slotTimes', JSON.stringify(['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00']), 'schedule'],
  ['schedule.minLeadHours', '3', 'schedule'],
  ['schedule.maxAdvanceDays', '30', 'schedule'],
  ['schedule.cancelPolicyHours', '12', 'schedule'],
  [
    'schedule.cancelPolicyText',
    'Pembatalan atau reschedule gratis bila dilakukan minimal 12 jam sebelum jadwal treatment.',
    'schedule',
  ],
  ['payment.transportFee', '15000', 'payment'],
  ['payment.bankAccount', 'BCA 1234567890 a.n. BuahHati Home Care', 'payment'],
  ['notification.waProvider', process.env.WHATSAPP_PROVIDER ?? 'mock', 'notification'],
  ['notification.waEnabled', 'true', 'notification'],
  ['notification.reminderH1', 'true', 'notification'],
  ['notification.reminderH2h', 'true', 'notification'],
];

const SERVICES = [
  {
    name: 'Baby Massage 30 Menit',
    slug: 'baby-massage-30',
    durationMinutes: 30,
    price: 100_000,
    description: 'Pijat lembut untuk melancarkan peredaran darah dan membantu bayi tidur lebih nyenyak.',
    requirements: 'Bayi dalam kondisi sehat dan tidak demam.',
    sortOrder: 1,
  },
  {
    name: 'Baby Massage 60 Menit',
    slug: 'baby-massage-60',
    durationMinutes: 60,
    price: 150_000,
    description: 'Sesi pijat lengkap dengan stimulasi motorik ringan dan relaksasi menyeluruh.',
    requirements: 'Bayi sudah menyusu minimal 30 menit sebelum treatment.',
    sortOrder: 2,
  },
  {
    name: 'Baby Spa',
    slug: 'baby-spa',
    durationMinutes: 60,
    price: 175_000,
    description: 'Berenang menggunakan neck ring khusus dilanjutkan pijat relaksasi dan perawatan kulit.',
    requirements: 'Membutuhkan ruangan hangat dan sumber air bersih.',
    sortOrder: 3,
  },
  {
    name: 'Baby Massage + Baby Spa',
    slug: 'baby-massage-spa',
    durationMinutes: 90,
    price: 225_000,
    description: 'Paket lengkap: pijat bayi menyeluruh dilanjutkan sesi baby spa.',
    requirements: 'Disarankan untuk bayi usia di atas 3 bulan.',
    sortOrder: 4,
  },
  {
    name: 'Pijat Relaksasi Bayi',
    slug: 'pijat-relaksasi-bayi',
    durationMinutes: 45,
    price: 120_000,
    description: 'Pijat ringan untuk bayi rewel, membantu menenangkan dan memperbaiki pola tidur.',
    sortOrder: 5,
  },
];

const THERAPISTS = [
  {
    name: 'Siti Nurhaliza',
    shortName: 'Siti',
    phone: '6281234567001',
    email: 'siti@example.com',
    skills: 'Baby massage, Baby spa, Pijat tuina',
    serviceAreas: 'Sleman, Depok, Ngaglik',
    bio: 'Terapis bayi bersertifikat dengan pengalaman lebih dari 6 tahun.',
    dayOff: 3,
    commissionValue: 25,
  },
  {
    name: 'Rina Kartika',
    shortName: 'Rina',
    phone: '6281234567002',
    email: 'rina@example.com',
    skills: 'Baby massage, Baby gym',
    serviceAreas: 'Kota Yogyakarta, Bantul',
    bio: 'Berpengalaman menangani bayi newborn dan bayi prematur.',
    dayOff: 1,
    commissionValue: 22,
  },
  {
    name: 'Dewi Anggraini',
    shortName: 'Dewi',
    phone: '6281234567003',
    email: 'dewi@example.com',
    skills: 'Baby spa, Pijat relaksasi, Baby massage',
    serviceAreas: 'Sleman, Kota Yogyakarta',
    bio: 'Fokus pada baby spa dan stimulasi motorik bayi.',
    dayOff: 0,
    commissionValue: 20,
  },
];

const CUSTOMERS = [
  {
    name: 'Rani Puspita',
    phone: '6281377700001',
    email: 'rani@example.com',
    address: 'Perum Griya Asri Blok C2 No. 8',
    district: 'Depok',
    village: 'Condongcatur',
    landmark: 'Depan minimarket, pagar putih',
    babies: [
      { name: 'Aisyah', months: 5, gender: 'FEMALE', weightKg: 6.8 },
    ],
    account: { email: 'customer@example.com', password: 'Customer123!' },
  },
  {
    name: 'Dinda Maharani',
    phone: '6281377700002',
    email: 'dinda@example.com',
    address: 'Jl. Kaliurang KM 8 No. 45',
    district: 'Ngaglik',
    village: 'Sinduharjo',
    landmark: 'Sebelah apotek',
    babies: [{ name: 'Kenzo', months: 8, gender: 'MALE', weightKg: 8.4 }],
  },
  {
    name: 'Yoga Pratama',
    phone: '6281377700003',
    email: 'yoga@example.com',
    address: 'Jl. Wates KM 5, Gamping',
    district: 'Gamping',
    village: 'Ambarketawang',
    landmark: 'Rumah cat hijau',
    babies: [{ name: 'Naura', months: 3, gender: 'FEMALE', weightKg: 5.5 }],
  },
  {
    name: 'Prita Ayu',
    phone: '6281377700004',
    email: 'prita@example.com',
    address: 'Jl. Godean KM 4 No. 12',
    district: 'Godean',
    village: 'Sidoarum',
    babies: [
      { name: 'Bima', months: 11, gender: 'MALE', weightKg: 9.2 },
      { name: 'Bila', months: 11, gender: 'FEMALE', weightKg: 8.9 },
    ],
  },
  {
    name: 'Sekar Ayu',
    phone: '6281377700005',
    email: 'sekar@example.com',
    address: 'Jl. Magelang KM 6, Mlati',
    district: 'Mlati',
    village: 'Sendangadi',
    babies: [{ name: 'Arka', months: 2, gender: 'MALE', weightKg: 5.1 }],
  },
];

async function main() {
  console.log('› Menyiapkan seed…');

  // urutan hapus mengikuti relasi agar seed idempotent
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.reservationStatusHistory.deleteMany();
  await prisma.treatment.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.promo.deleteMany();
  await prisma.baby.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.therapistSchedule.deleteMany();
  await prisma.therapistTimeOff.deleteMany();
  await prisma.therapist.deleteMany();
  await prisma.service.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.setting.deleteMany();

  for (const [key, value, group] of SETTINGS) {
    await prisma.setting.create({ data: { key, value, group } });
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!';
  await prisma.user.create({
    data: {
      email: adminEmail,
      name: 'Admin BuahHati',
      phone: '6281200000000',
      role: 'ADMIN',
      passwordHash: await bcrypt.hash(adminPassword, 12),
    },
  });

  const services = [];
  for (const service of SERVICES) {
    services.push(await prisma.service.create({ data: { ...service, isActive: true, maxPerSlot: 2 } }));
  }

  const therapists = [];
  for (const t of THERAPISTS) {
    const user = await prisma.user.create({
      data: {
        email: t.email,
        name: t.name,
        phone: t.phone,
        role: 'THERAPIST',
        passwordHash: await bcrypt.hash('Terapis123!', 12),
      },
    });
    const therapist = await prisma.therapist.create({
      data: {
        userId: user.id,
        name: t.name,
        phone: t.phone,
        email: t.email,
        bio: t.bio,
        skills: t.skills,
        serviceAreas: t.serviceAreas,
        commissionType: 'PERCENT',
        commissionValue: t.commissionValue,
        maxDailyBooking: 6,
        schedules: {
          create: Array.from({ length: 7 }, (_, day) => ({
            dayOfWeek: day,
            startTime: day === 6 ? '09:00' : '09:00',
            endTime: day === 6 ? '14:00' : '17:00',
            isDayOff: day === t.dayOff,
          })),
        },
      },
    });
    therapists.push(therapist);
  }

  await prisma.promo.createMany({
    data: [
      {
        code: 'WELCOME10',
        name: 'Diskon Pelanggan Baru',
        description: 'Potongan 10% untuk reservasi pertama.',
        discountType: 'PERCENT',
        discountValue: 10,
        minTransaction: 100_000,
        maxDiscount: 30_000,
        startDate: toDate(dateKey(-30)),
        endDate: toDate(dateKey(60)),
        quota: 100,
        isActive: true,
      },
      {
        code: 'SPA25',
        name: 'Potongan Baby Spa',
        description: 'Potongan Rp25.000 untuk layanan Baby Spa.',
        discountType: 'NOMINAL',
        discountValue: 25_000,
        minTransaction: 150_000,
        startDate: toDate(dateKey(-10)),
        endDate: toDate(dateKey(30)),
        quota: 50,
        isActive: true,
        serviceIds: JSON.stringify([services[2].id]),
      },
    ],
  });

  const customers = [];
  for (const c of CUSTOMERS) {
    let userId: string | null = null;
    if (c.account) {
      const user = await prisma.user.create({
        data: {
          email: c.account.email,
          name: c.name,
          phone: c.phone,
          role: 'CUSTOMER',
          passwordHash: await bcrypt.hash(c.account.password, 12),
        },
      });
      userId = user.id;
    }
    const customer = await prisma.customer.create({
      data: {
        userId,
        name: c.name,
        phone: c.phone,
        email: c.email,
        address: c.address,
        district: c.district,
        village: c.village,
        landmark: c.landmark ?? null,
        babies: {
          create: c.babies.map((b) => ({
            name: b.name,
            gender: b.gender,
            weightKg: b.weightKg,
            birthDate: toDate(dateKey(-b.months * 30)),
          })),
        },
      },
      include: { babies: true },
    });
    customers.push(customer);
  }

  // ---- Reservasi demo -------------------------------------------------
  const plan: {
    customerIndex: number;
    babyIndex?: number;
    serviceIndex: number;
    therapistIndex: number;
    dayOffset: number;
    time: string;
    status: string;
    paymentStatus: string;
    paymentMethod: string;
  }[] = [
    { customerIndex: 0, serviceIndex: 1, therapistIndex: 0, dayOffset: -21, time: '09:00', status: 'COMPLETED', paymentStatus: 'PAID', paymentMethod: 'CASH' },
    { customerIndex: 1, serviceIndex: 2, therapistIndex: 1, dayOffset: -18, time: '10:00', status: 'COMPLETED', paymentStatus: 'PAID', paymentMethod: 'TRANSFER' },
    { customerIndex: 2, serviceIndex: 0, therapistIndex: 2, dayOffset: -14, time: '11:00', status: 'COMPLETED', paymentStatus: 'PAID', paymentMethod: 'QRIS' },
    { customerIndex: 3, serviceIndex: 3, therapistIndex: 0, dayOffset: -12, time: '13:00', status: 'COMPLETED', paymentStatus: 'PAID', paymentMethod: 'CASH' },
    { customerIndex: 0, serviceIndex: 2, therapistIndex: 1, dayOffset: -9, time: '14:00', status: 'COMPLETED', paymentStatus: 'PAID', paymentMethod: 'TRANSFER' },
    { customerIndex: 4, serviceIndex: 4, therapistIndex: 2, dayOffset: -7, time: '09:00', status: 'COMPLETED', paymentStatus: 'PAID', paymentMethod: 'CASH' },
    { customerIndex: 1, serviceIndex: 1, therapistIndex: 0, dayOffset: -6, time: '15:00', status: 'CANCELLED', paymentStatus: 'CANCELLED', paymentMethod: 'CASH' },
    { customerIndex: 2, serviceIndex: 3, therapistIndex: 1, dayOffset: -4, time: '10:00', status: 'COMPLETED', paymentStatus: 'PAID', paymentMethod: 'QRIS' },
    { customerIndex: 3, serviceIndex: 0, therapistIndex: 2, dayOffset: -3, time: '11:00', status: 'COMPLETED', paymentStatus: 'PAID', paymentMethod: 'CASH' },
    { customerIndex: 4, serviceIndex: 2, therapistIndex: 0, dayOffset: -2, time: '13:00', status: 'NO_SHOW', paymentStatus: 'CANCELLED', paymentMethod: 'CASH' },
    { customerIndex: 0, serviceIndex: 3, therapistIndex: 1, dayOffset: -1, time: '14:00', status: 'COMPLETED', paymentStatus: 'PAID', paymentMethod: 'TRANSFER' },
    { customerIndex: 1, serviceIndex: 0, therapistIndex: 2, dayOffset: 0, time: '09:00', status: 'COMPLETED', paymentStatus: 'PAID', paymentMethod: 'CASH' },
    { customerIndex: 2, serviceIndex: 1, therapistIndex: 0, dayOffset: 0, time: '11:00', status: 'IN_SERVICE', paymentStatus: 'UNPAID', paymentMethod: 'CASH' },
    { customerIndex: 3, serviceIndex: 2, therapistIndex: 1, dayOffset: 0, time: '14:00', status: 'CONFIRMED', paymentStatus: 'PENDING', paymentMethod: 'TRANSFER' },
    { customerIndex: 4, serviceIndex: 4, therapistIndex: 2, dayOffset: 0, time: '16:00', status: 'PENDING', paymentStatus: 'UNPAID', paymentMethod: 'CASH' },
    { customerIndex: 0, serviceIndex: 1, therapistIndex: 0, dayOffset: 1, time: '10:00', status: 'CONFIRMED', paymentStatus: 'UNPAID', paymentMethod: 'CASH' },
    { customerIndex: 1, serviceIndex: 3, therapistIndex: 1, dayOffset: 2, time: '13:00', status: 'CONFIRMED', paymentStatus: 'PENDING', paymentMethod: 'QRIS' },
    { customerIndex: 2, serviceIndex: 2, therapistIndex: 2, dayOffset: 3, time: '15:00', status: 'PENDING', paymentStatus: 'UNPAID', paymentMethod: 'CASH' },
    { customerIndex: 3, serviceIndex: 0, therapistIndex: 0, dayOffset: 4, time: '09:00', status: 'PENDING', paymentStatus: 'UNPAID', paymentMethod: 'CASH' },
    { customerIndex: 4, serviceIndex: 1, therapistIndex: 1, dayOffset: 5, time: '11:00', status: 'CONFIRMED', paymentStatus: 'UNPAID', paymentMethod: 'CASH' },
  ];

  const counters = new Map<string, number>();
  const transportFee = 15_000;
  let created = 0;

  for (const item of plan) {
    const customer = customers[item.customerIndex];
    const baby = customer.babies[item.babyIndex ?? 0];
    const service = services[item.serviceIndex];
    const therapist = therapists[item.therapistIndex];
    const key = dateKey(item.dayOffset);
    const compact = key.replace(/-/g, '');
    const next = (counters.get(compact) ?? 0) + 1;
    counters.set(compact, next);

    const endTime = addMinutes(item.time, service.durationMinutes);
    const startAt = combine(key, item.time);
    const endAt = combine(key, endTime);
    const discount = item.serviceIndex === 3 ? 20_000 : 0;
    const total = service.price + transportFee - discount;

    const reservation = await prisma.reservation.create({
      data: {
        reservationCode: `HC-${compact}-${String(next).padStart(4, '0')}`,
        customerId: customer.id,
        babyId: baby.id,
        serviceId: service.id,
        therapistId: therapist.id,
        date: toDate(key),
        startTime: item.time,
        endTime,
        startAt,
        endAt,
        address: customer.address ?? '',
        district: customer.district,
        village: customer.village,
        landmark: customer.landmark,
        babyConditions: JSON.stringify(['SEHAT']),
        servicePrice: service.price,
        transportFee,
        discount,
        total,
        status: item.status,
        paymentStatus: item.paymentStatus,
        customerNote: item.dayOffset === 0 ? 'Mohon datang tepat waktu ya kak.' : null,
        confirmedAt: item.status === 'PENDING' ? null : new Date(startAt.getTime() - 8 * 3_600_000),
        completedAt: item.status === 'COMPLETED' ? endAt : null,
        cancelledAt: item.status === 'CANCELLED' ? new Date(startAt.getTime() - 20 * 3_600_000) : null,
        cancelReason: item.status === 'CANCELLED' ? 'Bayi sedang kurang sehat' : null,
      },
    });
    created += 1;

    const history: { status: string; note: string; at: Date }[] = [
      { status: 'PENDING', note: 'Reservasi dibuat oleh customer', at: new Date(startAt.getTime() - 2 * DAY_MS) },
    ];
    if (!['PENDING', 'CANCELLED'].includes(item.status)) {
      history.push({ status: 'CONFIRMED', note: 'Dikonfirmasi admin', at: new Date(startAt.getTime() - 8 * 3_600_000) });
    }
    if (['IN_SERVICE', 'COMPLETED'].includes(item.status)) {
      history.push({ status: 'ON_THE_WAY', note: 'Terapis berangkat', at: new Date(startAt.getTime() - 30 * 60_000) });
      history.push({ status: 'ARRIVED', note: 'Terapis tiba', at: new Date(startAt.getTime() - 5 * 60_000) });
      history.push({ status: 'IN_SERVICE', note: 'Treatment dimulai', at: startAt });
    }
    if (item.status === 'COMPLETED') history.push({ status: 'COMPLETED', note: 'Treatment selesai', at: endAt });
    if (item.status === 'CANCELLED') {
      history.push({ status: 'CANCELLED', note: 'Bayi sedang kurang sehat', at: new Date(startAt.getTime() - 20 * 3_600_000) });
    }
    if (item.status === 'NO_SHOW') {
      history.push({ status: 'NO_SHOW', note: 'Customer tidak dapat dihubungi', at: endAt });
    }

    for (const h of history) {
      await prisma.reservationStatusHistory.create({
        data: {
          reservationId: reservation.id,
          status: h.status,
          note: h.note,
          changedBy: h.status === 'PENDING' ? customer.name : 'Admin BuahHati',
          createdAt: h.at,
        },
      });
    }

    await prisma.payment.create({
      data: {
        reservationId: reservation.id,
        method: item.paymentMethod,
        status: item.paymentStatus === 'PAID' ? 'PAID' : item.paymentStatus === 'PENDING' ? 'PENDING' : item.paymentStatus === 'CANCELLED' ? 'CANCELLED' : 'UNPAID',
        amount: total,
        paidAt: item.paymentStatus === 'PAID' ? endAt : null,
        confirmedBy: item.paymentStatus === 'PAID' ? 'Admin BuahHati' : null,
        reference: item.paymentMethod === 'TRANSFER' ? `TRF-${compact}-${next}` : null,
      },
    });

    if (item.status === 'COMPLETED') {
      await prisma.treatment.create({
        data: {
          reservationId: reservation.id,
          therapistId: therapist.id,
          babyId: baby.id,
          conditionBefore: 'Bayi sehat, aktif, dan sudah menyusu.',
          conditionDuring: 'Bayi tenang dan menikmati pijatan.',
          conditionAfter: 'Bayi rileks dan tertidur setelah treatment.',
          treatmentAreas: JSON.stringify(['Kaki', 'Perut', 'Punggung', 'Tangan']),
          durationMinutes: service.durationMinutes,
          babyResponse: 'Responsif, tidak rewel.',
          notes: 'Tidak ditemukan keluhan berarti selama sesi berlangsung.',
          recommendation: 'Lanjutkan rutinitas pijat 1–2 kali per minggu dan jaga kehangatan ruangan.',
          signatureName: customer.name,
          signedAt: endAt,
          createdAt: endAt,
        },
      });
    }

    await prisma.notification.create({
      data: {
        reservationId: reservation.id,
        customerId: customer.id,
        channel: 'WHATSAPP',
        template: 'RESERVATION_CREATED',
        to: customer.phone,
        message: `Hallo Kak ${customer.name}, terima kasih telah melakukan reservasi di BuahHati Home Care.\n\nNomor Reservasi: ${reservation.reservationCode}\nBayi: ${baby.name}\nLayanan: ${service.name}\nStatus: Menunggu Konfirmasi.`,
        status: 'SENT',
        provider: 'mock',
        sentAt: new Date(startAt.getTime() - 2 * DAY_MS),
      },
    });
  }

  // total transaksi pelanggan
  for (const customer of customers) {
    const agg = await prisma.reservation.aggregate({
      where: { customerId: customer.id },
      _count: { _all: true },
    });
    const paid = await prisma.reservation.aggregate({
      where: { customerId: customer.id, status: 'COMPLETED' },
      _sum: { total: true },
    });
    await prisma.customer.update({
      where: { id: customer.id },
      data: { totalReservations: agg._count._all, totalSpent: paid._sum.total ?? 0 },
    });
  }

  console.log(`✓ ${services.length} layanan, ${therapists.length} terapis, ${customers.length} pelanggan, ${created} reservasi`);
  console.log('\nAkun demo:');
  console.log(`  ADMIN     : ${adminEmail} / ${adminPassword}`);
  console.log('  TERAPIS   : siti@example.com / Terapis123!');
  console.log('  CUSTOMER  : customer@example.com / Customer123!');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
