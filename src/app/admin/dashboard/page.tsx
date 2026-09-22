import Link from 'next/link';
import {
  BabyIcon,
  CalendarCheck,
  CheckCircle2,
  Clock,
  CreditCard,
  Hourglass,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, StatCard } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/features/admin/shell';
import {
  DailyReservationChart,
  DailyRevenueChart,
  ServiceShareChart,
  TherapistPerformanceChart,
} from '@/features/admin/dashboard-charts';
import { getDashboardData } from '@/services/dashboard.service';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { formatDateId, todayKey } from '@/lib/datetime';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Dashboard' };

export default async function AdminDashboardPage() {
  const data = await getDashboardData();

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={`Ringkasan operasional ${formatDateId(`${todayKey()}T00:00:00.000Z`, { withDay: true })}`}
        action={
          <Button asChild size="sm">
            <Link href="/admin/reservasi">Kelola reservasi</Link>
          </Button>
        }
      />

      <section aria-label="Statistik hari ini" className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <StatCard label="Reservasi hari ini" value={data.today.total} tone="cream" icon={<CalendarCheck className="size-4" />} />
        <StatCard label="Pending" value={data.today.pending} tone="blush" icon={<Hourglass className="size-4" />} />
        <StatCard label="Dikonfirmasi" value={data.today.confirmed} tone="sky" icon={<CheckCircle2 className="size-4" />} />
        <StatCard label="Sedang berjalan" value={data.today.inProgress} tone="primary" icon={<Clock className="size-4" />} />
        <StatCard label="Selesai" value={data.today.completed} icon={<CheckCircle2 className="size-4" />} />
        <StatCard
          label="Pendapatan hari ini"
          value={formatCurrency(data.today.revenue)}
          icon={<CreditCard className="size-4" />}
          className="col-span-2 lg:col-span-1"
        />
      </section>

      <section aria-label="Statistik bulan ini" className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Reservasi bulan ini"
          value={formatNumber(data.month.reservations)}
          hint={`${data.month.completed} selesai · ${data.month.cancelled} batal`}
          icon={<CalendarCheck className="size-4" />}
        />
        <StatCard
          label="Total pelanggan"
          value={formatNumber(data.month.customers)}
          hint={`${data.month.uniqueCustomers} aktif bulan ini`}
          icon={<Users className="size-4" />}
        />
        <StatCard label="Total bayi" value={formatNumber(data.month.babies)} icon={<BabyIcon className="size-4" />} />
        <StatCard
          label="Pendapatan bulan ini"
          value={formatCurrency(data.month.revenue)}
          icon={<TrendingUp className="size-4" />}
        />
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <DailyReservationChart data={data.charts.daily} />
        <DailyRevenueChart data={data.charts.daily} />
        <ServiceShareChart data={data.charts.byService} />
        <TherapistPerformanceChart data={data.charts.byTherapist} />
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Jadwal hari ini</CardTitle>
            <p className="text-sm text-muted-foreground">
              {data.today.total} reservasi terjadwal hari ini
            </p>
          </CardHeader>
          <div className="px-5 pb-5">
            {data.today.list.length === 0 ? (
              <EmptyState
                title="Belum ada reservasi hari ini"
                description="Reservasi baru akan muncul di sini secara otomatis."
              />
            ) : (
              <ul className="space-y-2">
                {data.today.list.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/admin/reservasi/${item.id}`}
                      className="flex items-center gap-3 rounded-2xl border border-border p-3 transition hover:bg-muted/50"
                    >
                      <span className="flex w-14 shrink-0 flex-col items-center rounded-xl bg-[var(--color-cream)] px-2 py-1.5">
                        <span className="font-display text-sm font-bold text-primary">{item.startTime}</span>
                        <span className="text-[10px] text-muted-foreground">{item.endTime}</span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">
                          {item.baby.name} · {item.service.name}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {item.customer.name} · {item.therapist?.name ?? 'Belum ada terapis'}
                        </span>
                      </span>
                      <StatusBadge status={item.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Layanan terlaris</CardTitle>
            <p className="text-sm text-muted-foreground">Bulan berjalan</p>
          </CardHeader>
          <div className="px-5 pb-5">
            {data.charts.byService.length === 0 ? (
              <EmptyState title="Belum ada data" />
            ) : (
              <ul className="space-y-3">
                {data.charts.byService.slice(0, 5).map((item, index) => (
                  <li key={item.name} className="flex items-center gap-3">
                    <span className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-bold">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{item.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {item.count} reservasi · {formatCurrency(item.revenue)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </section>
    </div>
  );
}
