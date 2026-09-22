import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getSettings } from '@/services/settings.service';
import { ReservationQr } from '@/components/qr-code';
import { PrintButton } from '@/features/admin/print-button';
import { formatDateId, formatDateTimeId } from '@/lib/datetime';
import { formatCurrency } from '@/lib/utils';
import { PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL, type PaymentStatus } from '@/lib/constants';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Invoice' };

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [reservation, settings] = await Promise.all([
    prisma.reservation.findUnique({
      where: { id },
      include: {
        customer: true,
        baby: true,
        service: true,
        therapist: true,
        payments: { orderBy: { createdAt: 'desc' } },
      },
    }),
    getSettings(),
  ]);
  if (!reservation) notFound();

  return (
    <div className="mx-auto max-w-2xl bg-white p-6 text-[#40382f] sm:p-8 print:p-0">
      <div className="no-print mb-5 flex justify-end">
        <PrintButton />
      </div>

      <div className="flex items-start justify-between gap-6 border-b border-[#ece2d7] pb-5">
        <div>
          <h1 className="font-display text-xl font-bold">{settings.businessName}</h1>
          <p className="mt-1 text-xs text-[#8a8078]">{settings.businessAddress}</p>
          <p className="text-xs text-[#8a8078]">
            {settings.businessWhatsapp} · {settings.businessEmail}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-[#8a8078]">Invoice</p>
          <p className="font-display text-lg font-bold">{reservation.reservationCode}</p>
          <p className="text-xs text-[#8a8078]">{formatDateTimeId(reservation.createdAt)}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-[#8a8078]">Ditagihkan kepada</p>
          <p className="mt-1 font-semibold">{reservation.customer.name}</p>
          <p className="text-sm">{reservation.customer.phone}</p>
          <p className="mt-1 text-sm text-[#8a8078]">{reservation.address}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-[#8a8078]">Detail treatment</p>
          <p className="mt-1 text-sm">Bayi: {reservation.baby.name}</p>
          <p className="text-sm">
            {formatDateId(reservation.date, { withDay: true })} · {reservation.startTime}–
            {reservation.endTime} WIB
          </p>
          <p className="text-sm">Terapis: {reservation.therapist?.name ?? '-'}</p>
        </div>
      </div>

      <table className="mt-6 w-full border-collapse text-sm">
        <thead>
          <tr className="border-y border-[#ece2d7] text-left text-xs uppercase text-[#8a8078]">
            <th className="py-2">Deskripsi</th>
            <th className="py-2 text-right">Jumlah</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-[#f4efe9]">
            <td className="py-2.5">
              {reservation.service.name}
              <span className="block text-xs text-[#8a8078]">
                Durasi {reservation.service.durationMinutes} menit
              </span>
            </td>
            <td className="py-2.5 text-right">{formatCurrency(reservation.servicePrice)}</td>
          </tr>
          <tr className="border-b border-[#f4efe9]">
            <td className="py-2.5">Biaya home care</td>
            <td className="py-2.5 text-right">{formatCurrency(reservation.transportFee)}</td>
          </tr>
          {reservation.discount > 0 ? (
            <tr className="border-b border-[#f4efe9]">
              <td className="py-2.5">Diskon</td>
              <td className="py-2.5 text-right">- {formatCurrency(reservation.discount)}</td>
            </tr>
          ) : null}
          <tr>
            <td className="py-3 font-display text-base font-bold">Total</td>
            <td className="py-3 text-right font-display text-base font-bold">
              {formatCurrency(reservation.total)}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4 rounded-2xl bg-[#fdf3e7] p-4 text-sm">
        <div>
          <p className="font-semibold">
            Status pembayaran:{' '}
            {PAYMENT_STATUS_LABEL[reservation.paymentStatus as PaymentStatus] ?? reservation.paymentStatus}
          </p>
          {reservation.payments.map((payment) => (
            <p key={payment.id} className="text-xs text-[#8a8078]">
              {PAYMENT_METHOD_LABEL[payment.method as keyof typeof PAYMENT_METHOD_LABEL] ?? payment.method}
              {' · '}
              {formatCurrency(payment.amount)}
              {payment.paidAt ? ` · ${formatDateTimeId(payment.paidAt)}` : ''}
            </p>
          ))}
          <p className="mt-2 text-xs text-[#8a8078]">Rekening: {settings.bankAccount}</p>
        </div>
        <ReservationQr code={reservation.reservationCode} size={92} />
      </div>

      <p className="mt-6 text-center text-xs text-[#8a8078]">
        Terima kasih telah mempercayakan perawatan si kecil kepada {settings.businessName}.
      </p>
    </div>
  );
}
