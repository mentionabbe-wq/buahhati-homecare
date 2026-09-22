import { PageHeader } from '@/features/admin/shell';
import { PaymentList } from '@/features/admin/payment-list';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Pembayaran' };

export default function AdminPaymentsPage() {
  return (
    <div>
      <PageHeader
        title="Pembayaran"
        description="Verifikasi pembayaran tunai, transfer, QRIS, dan payment gateway."
      />
      <PaymentList />
    </div>
  );
}
