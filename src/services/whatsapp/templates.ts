import { formatDateId } from '@/lib/datetime';
import { formatCurrency } from '@/lib/utils';
import type { NotificationTemplate } from '@/lib/constants';

export type TemplateContext = {
  businessName: string;
  customerName: string;
  babyName: string;
  serviceName: string;
  date: Date | string;
  startTime: string;
  therapistName: string;
  reservationCode: string;
  total?: number;
  address?: string;
  reason?: string;
};

function base(ctx: TemplateContext) {
  return {
    tanggal: formatDateId(ctx.date, { withDay: true }),
    jam: `${ctx.startTime} WIB`,
    terapis: ctx.therapistName || 'Akan ditentukan admin',
  };
}

/** Semua isi pesan WhatsApp dikumpulkan di satu tempat agar mudah diubah. */
export function renderTemplate(template: NotificationTemplate, ctx: TemplateContext): string {
  const b = base(ctx);
  switch (template) {
    case 'RESERVATION_CREATED':
      return [
        `Hallo Kak ${ctx.customerName}, terima kasih telah melakukan reservasi di ${ctx.businessName}.`,
        '',
        `Nomor Reservasi: ${ctx.reservationCode}`,
        `Bayi: ${ctx.babyName}`,
        `Layanan: ${ctx.serviceName}`,
        `Tanggal: ${b.tanggal}`,
        `Jam: ${b.jam}`,
        `Terapis: ${b.terapis}`,
        ctx.total !== undefined ? `Total: ${formatCurrency(ctx.total)}` : '',
        'Status: Menunggu Konfirmasi.',
        '',
        'Terima kasih.',
      ]
        .filter(Boolean)
        .join('\n');

    case 'RESERVATION_CONFIRMED':
      return [
        `Hallo Kak ${ctx.customerName},`,
        `Reservasi Anda telah DIKONFIRMASI.`,
        '',
        `Nomor Reservasi: ${ctx.reservationCode}`,
        `Bayi: ${ctx.babyName}`,
        `Layanan: ${ctx.serviceName}`,
        `Tanggal: ${b.tanggal}`,
        `Jam: ${b.jam}`,
        `Terapis: ${b.terapis}`,
        '',
        `Terima kasih telah mempercayakan si kecil pada ${ctx.businessName}.`,
      ].join('\n');

    case 'THERAPIST_ON_THE_WAY':
      return [
        `Hallo Kak ${ctx.customerName},`,
        `Terapis ${b.terapis} sedang menuju lokasi Anda.`,
        '',
        `Nomor Reservasi: ${ctx.reservationCode}`,
        `Jam treatment: ${b.jam}`,
        'Mohon siapkan ruangan yang nyaman untuk si kecil ya.',
      ].join('\n');

    case 'RESERVATION_COMPLETED':
      return [
        `Hallo Kak ${ctx.customerName},`,
        `Terima kasih telah menggunakan layanan ${ctx.businessName}.`,
        '',
        `Nomor Reservasi: ${ctx.reservationCode}`,
        `Layanan: ${ctx.serviceName} untuk ${ctx.babyName}`,
        ctx.total !== undefined ? `Total: ${formatCurrency(ctx.total)}` : '',
        '',
        'Catatan treatment sudah tersedia di aplikasi. Sampai jumpa di sesi berikutnya!',
      ]
        .filter(Boolean)
        .join('\n');

    case 'RESERVATION_CANCELLED':
      return [
        `Hallo Kak ${ctx.customerName},`,
        `Reservasi ${ctx.reservationCode} pada ${b.tanggal} ${b.jam} telah DIBATALKAN.`,
        ctx.reason ? `Alasan: ${ctx.reason}` : '',
        '',
        'Silakan hubungi kami bila ingin menjadwalkan ulang.',
      ]
        .filter(Boolean)
        .join('\n');

    case 'REMINDER_H1':
      return [
        `Hallo Kak ${ctx.customerName},`,
        `Besok ada jadwal ${ctx.serviceName} untuk ${ctx.babyName}.`,
        '',
        `Tanggal: ${b.tanggal}`,
        `Jam: ${b.jam}`,
        `Terapis: ${b.terapis}`,
        ctx.address ? `Alamat: ${ctx.address}` : '',
        '',
        'Sampai jumpa besok!',
      ]
        .filter(Boolean)
        .join('\n');

    case 'REMINDER_H2H':
      return [
        `Reminder: treatment bayi Anda akan dimulai pukul ${ctx.startTime}.`,
        '',
        `Nomor Reservasi: ${ctx.reservationCode}`,
        `Terapis: ${b.terapis}`,
        'Mohon pastikan si kecil sudah selesai menyusu 30 menit sebelum treatment ya.',
      ].join('\n');

    case 'PAYMENT_CONFIRMED':
      return [
        `Hallo Kak ${ctx.customerName},`,
        `Pembayaran untuk reservasi ${ctx.reservationCode} telah kami terima.`,
        ctx.total !== undefined ? `Total: ${formatCurrency(ctx.total)}` : '',
        '',
        'Terima kasih.',
      ]
        .filter(Boolean)
        .join('\n');

    default:
      return `Informasi reservasi ${ctx.reservationCode} dari ${ctx.businessName}.`;
  }
}

export const TEMPLATE_LABEL: Record<NotificationTemplate, string> = {
  RESERVATION_CREATED: 'Reservasi dibuat',
  RESERVATION_CONFIRMED: 'Reservasi dikonfirmasi',
  THERAPIST_ON_THE_WAY: 'Terapis berangkat',
  RESERVATION_COMPLETED: 'Reservasi selesai',
  RESERVATION_CANCELLED: 'Reservasi dibatalkan',
  REMINDER_H1: 'Reminder H-1',
  REMINDER_H2H: 'Reminder H-2 jam',
  PAYMENT_CONFIRMED: 'Pembayaran dikonfirmasi',
};
