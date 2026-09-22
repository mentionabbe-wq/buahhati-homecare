'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Eye, RotateCcw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/select';
import { PaymentBadge, StatusBadge } from '@/components/ui/badge';
import { EmptyState, Skeleton } from '@/components/ui/misc';
import { Tbody, Td, Th, Thead, TableWrapper, Tr } from '@/components/ui/table';
import { apiFetch } from '@/lib/client';
import { RESERVATION_STATUSES, STATUS_LABEL } from '@/lib/constants';
import { formatDateId, toDateKey } from '@/lib/datetime';
import { formatCurrency } from '@/lib/utils';

type Row = {
  id: string;
  reservationCode: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  paymentStatus: string;
  total: number;
  customer: { name: string; phone: string };
  baby: { name: string };
  service: { name: string };
  therapist: { name: string } | null;
};

type Options = {
  therapists: { id: string; name: string }[];
  services: { id: string; name: string }[];
};

export function ReservationTable({
  options,
  initialStatus = 'ALL',
  initialFrom = '',
  initialTo = '',
}: {
  options: Options;
  initialStatus?: string;
  initialFrom?: string;
  initialTo?: string;
}) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    q: '',
    status: initialStatus,
    therapistId: 'ALL',
    serviceId: 'ALL',
    from: initialFrom,
    to: initialTo,
  });

  const load = useCallback(
    async (targetPage = page) => {
      setRows(null);
      const params = new URLSearchParams({ page: String(targetPage), pageSize: '20' });
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'ALL') params.set(key, value);
      });
      try {
        const data = await apiFetch<{
          items: Row[];
          total: number;
          totalPages: number;
          page: number;
        }>(`/api/reservations?${params.toString()}`);
        setRows(data.items);
        setTotal(data.total);
        setTotalPages(data.totalPages);
        setPage(data.page);
      } catch (error) {
        setRows([]);
        toast.error(error instanceof Error ? error.message : 'Gagal memuat data');
      }
    },
    [filters, page],
  );

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-3xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-6">
        <div className="relative sm:col-span-2">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari kode, nama, atau nomor HP"
            className="pl-10"
            defaultValue={filters.q}
            onChange={(event) => {
              const value = event.target.value;
              window.clearTimeout((window as unknown as { __t?: number }).__t);
              (window as unknown as { __t?: number }).__t = window.setTimeout(
                () => setFilters((f) => ({ ...f, q: value })),
                350,
              );
            }}
          />
        </div>
        <NativeSelect
          aria-label="Filter status"
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
        >
          <option value="ALL">Semua status</option>
          {RESERVATION_STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABEL[status]}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect
          aria-label="Filter terapis"
          value={filters.therapistId}
          onChange={(e) => setFilters((f) => ({ ...f, therapistId: e.target.value }))}
        >
          <option value="ALL">Semua terapis</option>
          {options.therapists.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect
          aria-label="Filter layanan"
          value={filters.serviceId}
          onChange={(e) => setFilters((f) => ({ ...f, serviceId: e.target.value }))}
        >
          <option value="ALL">Semua layanan</option>
          {options.services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </NativeSelect>
        <div className="flex gap-2">
          <Input
            type="date"
            aria-label="Dari tanggal"
            value={filters.from}
            onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
          />
          <Input
            type="date"
            aria-label="Sampai tanggal"
            value={filters.to}
            onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
          />
        </div>
        <div className="flex gap-2 sm:col-span-2 lg:col-span-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setFilters({ q: '', status: 'ALL', therapistId: 'ALL', serviceId: 'ALL', from: '', to: '' })
            }
          >
            <RotateCcw className="size-4" /> Reset filter
          </Button>
          <span className="self-center text-xs text-muted-foreground">{total} reservasi ditemukan</span>
        </div>
      </div>

      {rows === null ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          title="Tidak ada reservasi"
          description="Coba ubah kata kunci atau filter tanggal."
        />
      ) : (
        <>
          {/* Tampilan kartu untuk layar kecil */}
          <ul className="space-y-2 lg:hidden">
            {rows.map((row) => (
              <li key={row.id}>
                <Link
                  href={`/admin/reservasi/${row.id}`}
                  className="block rounded-2xl border border-border bg-card p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-display text-sm font-bold">{row.reservationCode}</p>
                      <p className="truncate text-sm">
                        {row.baby.name} · {row.service.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{row.customer.name}</p>
                    </div>
                    <StatusBadge status={row.status} />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs">
                    <span>
                      {formatDateId(row.date, { short: true })} · {row.startTime}
                    </span>
                    <span className="font-semibold">{formatCurrency(row.total)}</span>
                    <PaymentBadge status={row.paymentStatus} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          <div className="hidden lg:block">
            <TableWrapper>
              <Thead>
                <tr>
                  <Th>Kode</Th>
                  <Th>Jadwal</Th>
                  <Th>Pelanggan</Th>
                  <Th>Bayi</Th>
                  <Th>Layanan</Th>
                  <Th>Terapis</Th>
                  <Th>Status</Th>
                  <Th>Bayar</Th>
                  <Th className="text-right">Total</Th>
                  <Th />
                </tr>
              </Thead>
              <Tbody>
                {rows.map((row) => (
                  <Tr key={row.id}>
                    <Td className="font-mono text-xs font-semibold">{row.reservationCode}</Td>
                    <Td>
                      <span className="block text-sm">{formatDateId(row.date, { short: true })}</span>
                      <span className="text-xs text-muted-foreground">
                        {row.startTime}–{row.endTime}
                      </span>
                    </Td>
                    <Td>
                      <span className="block text-sm">{row.customer.name}</span>
                      <span className="text-xs text-muted-foreground">{row.customer.phone}</span>
                    </Td>
                    <Td>{row.baby.name}</Td>
                    <Td>{row.service.name}</Td>
                    <Td>{row.therapist?.name ?? '—'}</Td>
                    <Td>
                      <StatusBadge status={row.status} />
                    </Td>
                    <Td>
                      <PaymentBadge status={row.paymentStatus} />
                    </Td>
                    <Td className="text-right font-semibold">{formatCurrency(row.total)}</Td>
                    <Td>
                      <Button asChild size="sm" variant="ghost">
                        <Link href={`/admin/reservasi/${row.id}`} aria-label="Lihat detail">
                          <Eye className="size-4" />
                        </Link>
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </TableWrapper>
          </div>

          {totalPages > 1 ? (
            <div className="flex items-center justify-between gap-3">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => load(page - 1)}>
                Sebelumnya
              </Button>
              <span className="text-xs text-muted-foreground">
                Halaman {page} dari {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => load(page + 1)}
              >
                Berikutnya
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

export function todayRange() {
  const key = toDateKey(new Date());
  return { from: key, to: key };
}
