'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { BadgeCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/select';
import { PaymentBadge } from '@/components/ui/badge';
import { EmptyState, Skeleton } from '@/components/ui/misc';
import { TableWrapper, Tbody, Td, Th, Thead, Tr } from '@/components/ui/table';
import { apiFetch } from '@/lib/client';
import { PAYMENT_METHOD_LABEL, PAYMENT_STATUSES, PAYMENT_STATUS_LABEL } from '@/lib/constants';
import { formatDateTimeId } from '@/lib/datetime';
import { formatCurrency } from '@/lib/utils';

type Payment = {
  id: string;
  method: string;
  status: string;
  amount: number;
  reference: string | null;
  createdAt: string;
  paidAt: string | null;
  reservationId: string;
  reservation: {
    reservationCode: string;
    total: number;
    customer: { name: string; phone: string };
  };
};

export function PaymentList() {
  const [status, setStatus] = useState('ALL');
  const [rows, setRows] = useState<Payment[] | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setRows(null);
    try {
      const data = await apiFetch<Payment[]>(`/api/payments?status=${status}`);
      setRows(data);
    } catch (error) {
      setRows([]);
      toast.error(error instanceof Error ? error.message : 'Gagal memuat pembayaran');
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function confirm(id: string) {
    setBusy(true);
    try {
      await apiFetch(`/api/payments/${id}`, { method: 'PATCH', json: { status: 'PAID' } });
      toast.success('Pembayaran dikonfirmasi');
      void load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal mengonfirmasi');
    } finally {
      setBusy(false);
    }
  }

  const totalPaid = (rows ?? [])
    .filter((row) => row.status === 'PAID')
    .reduce((sum, row) => sum + row.amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <NativeSelect
          aria-label="Filter status pembayaran"
          className="w-auto min-w-48"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="ALL">Semua status</option>
          {PAYMENT_STATUSES.map((value) => (
            <option key={value} value={value}>
              {PAYMENT_STATUS_LABEL[value]}
            </option>
          ))}
        </NativeSelect>
        <span className="text-sm text-muted-foreground">
          {rows?.length ?? 0} transaksi · lunas {formatCurrency(totalPaid)}
        </span>
      </div>

      {rows === null ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState title="Belum ada transaksi" description="Transaksi muncul saat reservasi dibuat." />
      ) : (
        <>
          <ul className="space-y-2 lg:hidden">
            {rows.map((row) => (
              <li key={row.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link
                      href={`/admin/reservasi/${row.reservationId}`}
                      className="font-mono text-xs font-semibold hover:text-primary"
                    >
                      {row.reservation.reservationCode}
                    </Link>
                    <p className="text-sm">{row.reservation.customer.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {PAYMENT_METHOD_LABEL[row.method as keyof typeof PAYMENT_METHOD_LABEL]} ·{' '}
                      {formatDateTimeId(row.createdAt)}
                    </p>
                  </div>
                  <PaymentBadge status={row.status} />
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="font-semibold">{formatCurrency(row.amount)}</span>
                  {row.status !== 'PAID' ? (
                    <Button size="sm" variant="secondary" disabled={busy} onClick={() => confirm(row.id)}>
                      <BadgeCheck className="size-4" /> Konfirmasi
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>

          <div className="hidden lg:block">
            <TableWrapper>
              <Thead>
                <tr>
                  <Th>Kode reservasi</Th>
                  <Th>Pelanggan</Th>
                  <Th>Metode</Th>
                  <Th>Dibuat</Th>
                  <Th>Dibayar</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Jumlah</Th>
                  <Th />
                </tr>
              </Thead>
              <Tbody>
                {rows.map((row) => (
                  <Tr key={row.id}>
                    <Td>
                      <Link
                        href={`/admin/reservasi/${row.reservationId}`}
                        className="font-mono text-xs font-semibold hover:text-primary"
                      >
                        {row.reservation.reservationCode}
                      </Link>
                    </Td>
                    <Td>
                      <span className="block text-sm">{row.reservation.customer.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {row.reservation.customer.phone}
                      </span>
                    </Td>
                    <Td>{PAYMENT_METHOD_LABEL[row.method as keyof typeof PAYMENT_METHOD_LABEL]}</Td>
                    <Td className="text-xs text-muted-foreground">{formatDateTimeId(row.createdAt)}</Td>
                    <Td className="text-xs text-muted-foreground">
                      {row.paidAt ? formatDateTimeId(row.paidAt) : '—'}
                    </Td>
                    <Td>
                      <PaymentBadge status={row.status} />
                    </Td>
                    <Td className="text-right font-semibold">{formatCurrency(row.amount)}</Td>
                    <Td>
                      {row.status !== 'PAID' ? (
                        <Button size="sm" variant="secondary" disabled={busy} onClick={() => confirm(row.id)}>
                          <BadgeCheck className="size-4" /> Konfirmasi
                        </Button>
                      ) : null}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </TableWrapper>
          </div>
        </>
      )}
    </div>
  );
}
