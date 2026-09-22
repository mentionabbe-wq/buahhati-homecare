'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/misc';
import { formatCurrency, formatNumber } from '@/lib/utils';

const PALETTE = ['#5f9e88', '#f0a5bb', '#8fc4e8', '#e3b778', '#a99bd8', '#7fc7b1'];
const AXIS = { stroke: '#b6aca2', fontSize: 11 };

const chartTooltip = {
  contentStyle: {
    borderRadius: '0.9rem',
    border: '1px solid #ece2d7',
    fontSize: 12,
    boxShadow: '0 8px 24px -12px rgba(96,78,62,0.4)',
  },
};

export function DailyReservationChart({
  data,
}: {
  data: { label: string; reservations: number; revenue: number }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Reservasi per hari</CardTitle>
        <p className="text-sm text-muted-foreground">14 hari terakhir</p>
      </CardHeader>
      <div className="h-64 px-2 pb-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 6, right: 12, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0e8df" vertical={false} />
            <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} />
            <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip {...chartTooltip} formatter={(value) => [formatNumber(Number(value)), 'Reservasi']} />
            <Bar dataKey="reservations" fill="#5f9e88" radius={[8, 8, 0, 0]} maxBarSize={26} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export function DailyRevenueChart({ data }: { data: { label: string; revenue: number }[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pendapatan per hari</CardTitle>
        <p className="text-sm text-muted-foreground">Reservasi berstatus selesai</p>
      </CardHeader>
      <div className="h-64 px-2 pb-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 6, right: 12, left: -6, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f0a5bb" stopOpacity={0.7} />
                <stop offset="100%" stopColor="#f0a5bb" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0e8df" vertical={false} />
            <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} />
            <YAxis
              tick={AXIS}
              tickLine={false}
              axisLine={false}
              width={64}
              tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`}
            />
            <Tooltip {...chartTooltip} formatter={(value) => [formatCurrency(Number(value)), 'Pendapatan']} />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#e0819c"
              strokeWidth={2}
              fill="url(#revenueFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export function ServiceShareChart({ data }: { data: { name: string; count: number }[] }) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Reservasi per layanan</CardTitle>
        </CardHeader>
        <div className="px-5 pb-5">
          <EmptyState title="Belum ada data" description="Data muncul setelah ada reservasi bulan ini." />
        </div>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Reservasi per layanan</CardTitle>
        <p className="text-sm text-muted-foreground">Bulan berjalan</p>
      </CardHeader>
      <div className="h-64 pb-4">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="name"
              innerRadius={48}
              outerRadius={78}
              paddingAngle={3}
            >
              {data.map((entry, index) => (
                <Cell key={entry.name} fill={PALETTE[index % PALETTE.length]} />
              ))}
            </Pie>
            <Legend
              verticalAlign="bottom"
              iconType="circle"
              formatter={(value: string) => <span className="text-xs text-muted-foreground">{value}</span>}
            />
            <Tooltip {...chartTooltip} formatter={(value) => [`${Number(value)} reservasi`, '']} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export function TherapistPerformanceChart({
  data,
}: {
  data: { name: string; count: number; revenue: number }[];
}) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Performa terapis</CardTitle>
        </CardHeader>
        <div className="px-5 pb-5">
          <EmptyState title="Belum ada treatment selesai" />
        </div>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Performa terapis</CardTitle>
        <p className="text-sm text-muted-foreground">Treatment selesai bulan ini</p>
      </CardHeader>
      <div className="h-64 px-2 pb-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 6, right: 16, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0e8df" horizontal={false} />
            <XAxis type="number" tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
            <YAxis type="category" dataKey="name" tick={AXIS} tickLine={false} axisLine={false} width={90} />
            <Tooltip {...chartTooltip} formatter={(value) => [`${Number(value)} treatment`, '']} />
            <Bar dataKey="count" fill="#8fc4e8" radius={[0, 8, 8, 0]} maxBarSize={22} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
