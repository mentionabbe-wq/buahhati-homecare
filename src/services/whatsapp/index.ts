import 'server-only';
import { prisma } from '@/lib/prisma';
import { normalizePhone } from '@/lib/utils';
import type { NotificationTemplate } from '@/lib/constants';
import { getSettings } from '../settings.service';
import { getWhatsAppProvider } from './providers';
import { renderTemplate, type TemplateContext } from './templates';

export { renderTemplate, TEMPLATE_LABEL } from './templates';
export { AVAILABLE_WA_PROVIDERS } from './providers';

type QueueInput = {
  template: NotificationTemplate;
  to: string;
  context: Omit<TemplateContext, 'businessName'> & { businessName?: string };
  reservationId?: string | null;
  customerId?: string | null;
  scheduledAt?: Date | null;
  /** true = simpan saja, dikirim oleh worker reminder */
  deferred?: boolean;
};

/**
 * Catat notifikasi ke database lalu kirim lewat provider aktif.
 * Kegagalan pengiriman tidak pernah membatalkan transaksi bisnis —
 * status notifikasi menjadi FAILED dan bisa dikirim ulang dari dashboard.
 */
export async function queueWhatsApp(input: QueueInput) {
  const settings = await getSettings();
  const to = normalizePhone(input.to);
  const message = renderTemplate(input.template, {
    ...input.context,
    businessName: input.context.businessName ?? settings.businessName,
  });

  const notification = await prisma.notification.create({
    data: {
      reservationId: input.reservationId ?? null,
      customerId: input.customerId ?? null,
      channel: 'WHATSAPP',
      template: input.template,
      to,
      message,
      status: 'PENDING',
      provider: settings.waProvider,
      scheduledAt: input.scheduledAt ?? null,
    },
  });

  if (input.deferred || !settings.waEnabled || !to) return notification;
  return sendNotification(notification.id);
}

export async function sendNotification(notificationId: string) {
  const notification = await prisma.notification.findUnique({ where: { id: notificationId } });
  if (!notification) throw new Error('Notifikasi tidak ditemukan');

  const settings = await getSettings();
  const provider = getWhatsAppProvider(settings.waProvider);
  const result = await provider.send(notification.to, notification.message).catch((error) => ({
    ok: false as const,
    error: error instanceof Error ? error.message : 'Gagal mengirim',
  }));

  return prisma.notification.update({
    where: { id: notification.id },
    data: {
      status: result.ok ? 'SENT' : 'FAILED',
      provider: provider.name,
      providerRef: result.ok ? (result as { providerRef?: string }).providerRef ?? null : null,
      error: result.ok ? null : (result as { error?: string }).error ?? 'Gagal mengirim',
      sentAt: result.ok ? new Date() : null,
    },
  });
}

export async function buildReservationContext(reservationId: string) {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: { customer: true, baby: true, service: true, therapist: true },
  });
  if (!reservation) return null;

  return {
    reservation,
    context: {
      customerName: reservation.customer.name,
      babyName: reservation.baby.name,
      serviceName: reservation.service.name,
      date: reservation.date,
      startTime: reservation.startTime,
      therapistName: reservation.therapist?.name ?? '',
      reservationCode: reservation.reservationCode,
      total: reservation.total,
      address: reservation.address,
    } satisfies Omit<TemplateContext, 'businessName'>,
  };
}

/** Helper ringkas: kirim template untuk sebuah reservasi. */
export async function notifyReservation(
  reservationId: string,
  template: NotificationTemplate,
  extra: Partial<TemplateContext> = {},
  options: { deferred?: boolean; scheduledAt?: Date | null } = {},
) {
  const built = await buildReservationContext(reservationId);
  if (!built) return null;
  return queueWhatsApp({
    template,
    to: built.reservation.customer.phone,
    reservationId,
    customerId: built.reservation.customerId,
    context: { ...built.context, ...extra },
    deferred: options.deferred,
    scheduledAt: options.scheduledAt ?? null,
  });
}
