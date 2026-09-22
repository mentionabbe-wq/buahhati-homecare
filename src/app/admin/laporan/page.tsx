import Link from 'next/link';
import { Download, FileSpreadsheet } from 'lucide-react';
import { PageHeader } from '@/features/admin/shell';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, StatCard } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/misc';
import { TableWrapper, Tbody, Td, Th, Thead, Tr } from '@/components/ui/table';
import { PrintButton } from '@/features/admin/print-button';
import {
  reservationReport,
  revenueReport,
  serviceReport,
  therapistReport,
  type ReportKind,
} from '@/services/report.service';
import { addDaysKey, formatDateId, todayKey } from '@/lib/datetime';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { STATUS_LABEL, type ReservationStatus } from '@/lib/constants';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Laporan' };

const KINDS: { value: ReportKind; label: string }[] = [
  { value: 'reservasi', label: 'Reservasi' },
  { value: 'pendapatan', label: 'Pendapatan' },
  { value: 'terapis', label: 'Terapis' },
  { value: 'layanan', label: 'Layanan' },
];

const PRESETS = [
  { label: 'Hari ini', days: 0 },
  { label: '7 hari', days: 6 },
  { label: '30 hari', days: 29 },
  { label: '90 hari', days: 89 },
];

export default async function AdminReportPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const kind = (KINDS.find((k) => k.value === params.kind)?.value ?? 'reservasi') as ReportKind;
  const to = params.to ?? todayKey();
  const from = params.from ?? addDaysKey(to, -29);
  const range = { from, to };

  const query = (next: Partial<{ kind: string; from: string; to: string }>) => {
    const search = new URLSearchParams({ kind, from, to, ...next });
    return `/admin/laporan?${search.toString()}`;
  };

  const exportUrl = (format: string) =>
    `/api/reports/export?kind=${kind}&from=${from}&to=${to}&format=${format}`;

  return (
    <div>
      <PageHeader
        title="Laporan"
        description={`Periode ${formatDateId(`${from}T00:00:00.000Z`, { short: true })} – ${formatDateId(`${to}T00:00:00.000Z`, { short: true })}`}
        action={
          <>
            <Button asChild size="sm" variant="outline">
              <a href={exportUrl('csv')}>
                <Download className="size-4" /> CSV
              </a>
            </Button>
            <Button asChild size="sm" variant="outline">
              <a href={exportUrl('xlsx')}>
                <FileSpreadsheet className="size-4" /> Excel
              </a>
            </Button>
            <PrintButton label="PDF" />
          </>
        }
      />

      <div className="no-print mb-4 space-y-3 rounded-3xl border border-border bg-card p-4">
        <div className="flex flex-wrap gap-2">
          {KINDS.map((item) => (
            <Button
              key={item.value}
              asChild
              size="sm"
              variant={item.value === kind ? 'default' : 'outline'}
            >
              <Link href={query({ kind: item.value })}>{item.label}</Link>
            </Button>
          ))}
        </div>

        <form className="flex flex-wrap items-end gap-2" action="/admin/laporan">
          <input type="hidden" name="kind" value={kind} />
          <label className="text-xs text-muted-foreground">
            Dari
            <Input type="date" name="from" defaultValue={from} className="mt-1 w-40" />
          </label>
          <label className="text-xs text-muted-foreground">
            Sampai
            <Input type="date" name="to" defaultValue={to} className="mt-1 w-40" />
          </label>
          <Button type="submit" size="sm">
            Terapkan
          </Button>
          <span className="mx-2 hidden h-6 w-px bg-border sm:block" />
          {PRESETS.map((preset) => (
            <Button key={preset.label} asChild size="sm" variant="ghost">
              <Link href={query({ from: addDaysKey(todayKey(), -preset.days), to: todayKey() })}>
                {preset.label}
              </Link>
            </Button>
          ))}
        </form>
      </div>

      {kind === 'reservasi' ? <ReservationReportView range={range} /> : null}
      {kind === 'pendapatan' ? <RevenueReportView range={range} /> : null}
      {kind === 'terapis' ? <TherapistReportView range={range} /> : null}
      {kind === 'layanan' ? <ServiceReportView range={range} /> : null}
    </div>
  );
}

async function ReservationReportView({ range }: { range: { from: string; to: string } }) {
  const { rows, summary } = await reservationReport(range);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Total reservasi" value={formatNumber(summary.total)} tone="cream" />
        <StatCard label="Selesai" value={formatNumber(summary.completed)} tone="primary" />
        <StatCard label="Menunggu" value={formatNumber(summary.pending)} tone="blush" />
        <StatCard label="Dibatalkan" value={formatNumber(summary.cancelled)} tone="sky" />
        <StatCard label="Tidak hadir" value={formatNumber(summary.noShow)} />
      </div>

      {rows.length === 0 ? (
        <EmptyState title="Tidak ada reservasi pada periode ini" />
      ) : (
        <TableWrapper>
          <Thead>
            <tr>
              <Th>Kode</Th>
              <Th>Tanggal</Th>
              <Th>Pelanggan</Th>
              <Th>Bayi</Th>
              <Th>Layanan</Th>
              <Th>Terapis</Th>
              <Th>Status</Th>
              <Th className="text-right">Total</Th>
            </tr>
          </Thead>
          <Tbody>
            {rows.map((row) => (
              <Tr key={row.id}>
                <Td className="font-mono text-xs">{row.reservationCode}</Td>
                <Td>
                  {formatDateId(row.date, { short: true })} {row.startTime}
                </Td>
                <Td>{row.customer.name}</Td>
                <Td>{row.baby.name}</Td>
                <Td>{row.service.name}</Td>
                <Td>{row.therapist?.name ?? '—'}</Td>
                <Td>{STATUS_LABEL[row.status as ReservationStatus] ?? row.status}</Td>
                <Td className="text-right">{formatCurrency(row.total)}</Td>
              </Tr>
            ))}
          </Tbody>
        </TableWrapper>
      )}
    </div>
  );
}

async function RevenueReportView({ range }: { range: { from: string; to: string } }) {
  const { rows, summary } = await revenueReport(range);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Gross revenue" value={formatCurrency(summary.gross)} tone="cream" />
        <StatCard label="Biaya home care" value={formatCurrency(summary.transport)} tone="sky" />
        <StatCard label="Total diskon" value={formatCurrency(summary.discount)} tone="blush" />
        <StatCard label="Net revenue" value={formatCurrency(summary.net)} tone="primary" />
        <StatCard
          label="Belum tertagih"
          value={formatCurrency(summary.outstanding)}
          hint={`${summary.count} transaksi selesai`}
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState title="Belum ada pendapatan pada periode ini" />
      ) : (
        <TableWrapper>
          <Thead>
            <tr>
              <Th>Kode</Th>
              <Th>Tanggal</Th>
              <Th>Layanan</Th>
              <Th className="text-right">Harga layanan</Th>
              <Th className="text-right">Transport</Th>
              <Th className="text-right">Diskon</Th>
              <Th className="text-right">Total</Th>
              <Th>Status bayar</Th>
            </tr>
          </Thead>
          <Tbody>
            {rows.map((row) => (
              <Tr key={row.reservationCode}>
                <Td className="font-mono text-xs">{row.reservationCode}</Td>
                <Td>{formatDateId(row.date, { short: true })}</Td>
                <Td>{row.service.name}</Td>
                <Td className="text-right">{formatCurrency(row.servicePrice)}</Td>
                <Td className="text-right">{formatCurrency(row.transportFee)}</Td>
                <Td className="text-right">{formatCurrency(row.discount)}</Td>
                <Td className="text-right font-semibold">{formatCurrency(row.total)}</Td>
                <Td>{row.paymentStatus}</Td>
              </Tr>
            ))}
          </Tbody>
        </TableWrapper>
      )}
    </div>
  );
}

async function TherapistReportView({ range }: { range: { from: string; to: string } }) {
  const rows = await therapistReport(range);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Kinerja & komisi terapis</CardTitle>
        <p className="text-sm text-muted-foreground">
          Komisi dihitung dari harga layanan pada reservasi berstatus selesai.
        </p>
      </CardHeader>
      <div className="px-5 pb-5">
        {rows.length === 0 ? (
          <EmptyState title="Belum ada data terapis" />
        ) : (
          <TableWrapper className="border-0">
            <Thead>
              <tr>
                <Th>Terapis</Th>
                <Th className="text-right">Treatment</Th>
                <Th className="text-right">Revenue</Th>
                <Th>Skema komisi</Th>
                <Th className="text-right">Komisi</Th>
              </tr>
            </Thead>
            <Tbody>
              {rows.map((row) => (
                <Tr key={row.id}>
                  <Td className="font-medium">{row.name}</Td>
                  <Td className="text-right">{row.treatments}</Td>
                  <Td className="text-right">{formatCurrency(row.revenue)}</Td>
                  <Td>
                    {row.commissionType === 'PERCENT'
                      ? `${row.commissionValue}%`
                      : `${formatCurrency(row.commissionValue)}/treatment`}
                  </Td>
                  <Td className="text-right font-semibold">{formatCurrency(row.commission)}</Td>
                </Tr>
              ))}
            </Tbody>
          </TableWrapper>
        )}
      </div>
    </Card>
  );
}

async function ServiceReportView({ range }: { range: { from: string; to: string } }) {
  const rows = await serviceReport(range);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performa layanan</CardTitle>
      </CardHeader>
      <div className="px-5 pb-5">
        {rows.length === 0 ? (
          <EmptyState title="Belum ada data layanan" />
        ) : (
          <TableWrapper className="border-0">
            <Thead>
              <tr>
                <Th>Layanan</Th>
                <Th className="text-right">Harga</Th>
                <Th className="text-right">Booking</Th>
                <Th className="text-right">Selesai</Th>
                <Th className="text-right">Revenue</Th>
                <Th className="text-right">Porsi</Th>
              </tr>
            </Thead>
            <Tbody>
              {rows.map((row) => (
                <Tr key={row.id}>
                  <Td className="font-medium">{row.name}</Td>
                  <Td className="text-right">{formatCurrency(row.price)}</Td>
                  <Td className="text-right">{row.bookings}</Td>
                  <Td className="text-right">{row.completed}</Td>
                  <Td className="text-right">{formatCurrency(row.revenue)}</Td>
                  <Td className="text-right">{row.share}%</Td>
                </Tr>
              ))}
            </Tbody>
          </TableWrapper>
        )}
      </div>
    </Card>
  );
}
