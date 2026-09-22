'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { CalendarDays, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/select';
import { StatusBadge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/misc';
import { apiFetch } from '@/lib/client';
import { STATUS_DOT, STATUS_LABEL, type ReservationStatus } from '@/lib/constants';
import { DAYS, MONTHS, addDaysKey, dayOfWeek, formatDateId, toDateKey, todayKey } from '@/lib/datetime';
import { cn } from '@/lib/utils';

type Item = {
  id: string;
  reservationCode: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  baby: { name: string };
  service: { name: string };
  therapist: { name: string } | null;
  customer: { name: string };
};

type View = 'bulan' | 'minggu' | 'hari';

export function CalendarBoard({
  slotTimes,
  therapists,
}: {
  slotTimes: string[];
  therapists: { id: string; name: string }[];
}) {
  const [view, setView] = useState<View>('bulan');
  const [anchor, setAnchor] = useState(todayKey());
  const [therapistId, setTherapistId] = useState('ALL');
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState<string | null>(null);

  const range = useMemo(() => {
    if (view === 'hari') return { from: anchor, to: anchor };
    if (view === 'minggu') {
      const start = addDaysKey(anchor, -dayOfWeek(anchor));
      return { from: start, to: addDaysKey(start, 6) };
    }
    const year = Number(anchor.slice(0, 4));
    const month = Number(anchor.slice(5, 7)) - 1;
    const first = `${anchor.slice(0, 7)}-01`;
    const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    return { from: first, to: `${anchor.slice(0, 7)}-${String(lastDay).padStart(2, '0')}` };
  }, [view, anchor]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        from: range.from,
        to: range.to,
        pageSize: '200',
      });
      if (therapistId !== 'ALL') params.set('therapistId', therapistId);
      const data = await apiFetch<{ items: Item[] }>(`/api/reservations?${params.toString()}`);
      setItems(data.items);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal memuat kalender');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to, therapistId]);

  useEffect(() => {
    void load();
  }, [load]);

  const byDay = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const item of items) {
      const key = toDateKey(item.date);
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.startTime.localeCompare(b.startTime));
    return map;
  }, [items]);

  async function moveReservation(id: string, dateKey: string, startTime?: string) {
    try {
      await apiFetch(`/api/reservations/${id}`, {
        method: 'PATCH',
        json: { date: dateKey, ...(startTime ? { startTime } : {}) },
      });
      toast.success('Jadwal diperbarui');
      void load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal memindahkan jadwal');
    } finally {
      setDragging(null);
    }
  }

  function shift(direction: number) {
    if (view === 'hari') setAnchor(addDaysKey(anchor, direction));
    else if (view === 'minggu') setAnchor(addDaysKey(anchor, direction * 7));
    else {
      const year = Number(anchor.slice(0, 4));
      const month = Number(anchor.slice(5, 7)) - 1 + direction;
      const next = new Date(Date.UTC(year, month, 1));
      setAnchor(toDateKey(next));
    }
  }

  const title =
    view === 'bulan'
      ? `${MONTHS[Number(anchor.slice(5, 7)) - 1]} ${anchor.slice(0, 4)}`
      : view === 'minggu'
        ? `${formatDateId(`${range.from}T00:00:00.000Z`, { short: true })} – ${formatDateId(`${range.to}T00:00:00.000Z`, { short: true })}`
        : formatDateId(`${anchor}T00:00:00.000Z`, { withDay: true });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-border bg-card p-3">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => shift(-1)} aria-label="Sebelumnya">
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => shift(1)} aria-label="Berikutnya">
            <ChevronRight className="size-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setAnchor(todayKey())}>
            Hari ini
          </Button>
        </div>
        <p className="font-display text-base font-bold">{title}</p>
        {loading ? <Loader2 className="size-4 animate-spin text-primary" /> : null}

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <NativeSelect
            aria-label="Filter terapis"
            className="h-9 w-auto min-w-40 text-xs"
            value={therapistId}
            onChange={(e) => setTherapistId(e.target.value)}
          >
            <option value="ALL">Semua terapis</option>
            {therapists.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </NativeSelect>
          <Tabs value={view} onValueChange={(value) => setView(value as View)}>
            <TabsList>
              <TabsTrigger value="bulan">Bulan</TabsTrigger>
              <TabsTrigger value="minggu">Minggu</TabsTrigger>
              <TabsTrigger value="hari">Hari</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Seret kartu reservasi ke tanggal atau jam lain untuk reschedule. Sistem tetap memeriksa
        ketersediaan terapis dan slot.
      </p>

      {view === 'bulan' ? (
        <MonthView
          anchor={anchor}
          byDay={byDay}
          onDrop={(dateKey) => dragging && moveReservation(dragging, dateKey)}
          onDragStart={setDragging}
        />
      ) : view === 'minggu' ? (
        <WeekView
          from={range.from}
          slotTimes={slotTimes}
          byDay={byDay}
          onDrop={(dateKey, time) => dragging && moveReservation(dragging, dateKey, time)}
          onDragStart={setDragging}
        />
      ) : (
        <DayView anchor={anchor} slotTimes={slotTimes} items={byDay.get(anchor) ?? []} />
      )}
    </div>
  );
}

function Chip({
  item,
  onDragStart,
}: {
  item: Item;
  onDragStart: (id: string) => void;
}) {
  return (
    <Link
      href={`/admin/reservasi/${item.id}`}
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', item.id);
        onDragStart(item.id);
      }}
      className="block cursor-grab rounded-lg border border-border bg-card px-1.5 py-1 text-[11px] leading-tight transition hover:bg-muted active:cursor-grabbing"
    >
      <span className="flex items-center gap-1">
        <span className={cn('size-1.5 shrink-0 rounded-full', STATUS_DOT[item.status as ReservationStatus])} />
        <span className="font-semibold">{item.startTime}</span>
        <span className="truncate">{item.baby.name}</span>
      </span>
      <span className="block truncate text-muted-foreground">{item.service.name}</span>
    </Link>
  );
}

function MonthView({
  anchor,
  byDay,
  onDrop,
  onDragStart,
}: {
  anchor: string;
  byDay: Map<string, Item[]>;
  onDrop: (dateKey: string) => void;
  onDragStart: (id: string) => void;
}) {
  const year = Number(anchor.slice(0, 4));
  const month = Number(anchor.slice(5, 7)) - 1;
  const firstDow = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: (string | null)[] = [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length: days }, (_, i) => `${anchor.slice(0, 7)}-${String(i + 1).padStart(2, '0')}`),
  ];
  const today = todayKey();

  return (
    <div className="bh-scroll-x rounded-3xl border border-border bg-card p-2">
      <div className="min-w-[720px]">
        <div className="grid grid-cols-7 gap-1 px-1 pb-1 text-center text-[11px] font-semibold uppercase text-muted-foreground">
          {DAYS.map((day) => (
            <span key={day}>{day.slice(0, 3)}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((key, index) => {
            if (!key) return <div key={`empty-${index}`} className="min-h-24 rounded-xl bg-muted/30" />;
            const list = byDay.get(key) ?? [];
            return (
              <div
                key={key}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  onDrop(key);
                }}
                className={cn(
                  'min-h-24 space-y-1 rounded-xl border p-1.5',
                  key === today ? 'border-primary bg-[var(--color-sage)]/40' : 'border-border',
                )}
              >
                <p className="text-[11px] font-bold text-muted-foreground">{Number(key.slice(8))}</p>
                {list.slice(0, 4).map((item) => (
                  <Chip key={item.id} item={item} onDragStart={onDragStart} />
                ))}
                {list.length > 4 ? (
                  <p className="text-[10px] text-muted-foreground">+{list.length - 4} lainnya</p>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function WeekView({
  from,
  slotTimes,
  byDay,
  onDrop,
  onDragStart,
}: {
  from: string;
  slotTimes: string[];
  byDay: Map<string, Item[]>;
  onDrop: (dateKey: string, time: string) => void;
  onDragStart: (id: string) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDaysKey(from, i));
  const today = todayKey();

  return (
    <div className="bh-scroll-x rounded-3xl border border-border bg-card p-2">
      <div className="min-w-[820px]">
        <div className="grid grid-cols-[64px_repeat(7,1fr)] gap-1 pb-1">
          <span />
          {days.map((key) => (
            <span
              key={key}
              className={cn(
                'rounded-lg py-1 text-center text-[11px] font-semibold',
                key === today ? 'bg-[var(--color-sage)] text-primary' : 'text-muted-foreground',
              )}
            >
              {DAYS[dayOfWeek(key)].slice(0, 3)} {Number(key.slice(8))}
            </span>
          ))}
        </div>
        {slotTimes.map((time) => (
          <div key={time} className="grid grid-cols-[64px_repeat(7,1fr)] gap-1 pb-1">
            <span className="pt-2 text-right text-[11px] font-semibold text-muted-foreground">{time}</span>
            {days.map((key) => {
              const list = (byDay.get(key) ?? []).filter((item) => item.startTime === time);
              return (
                <div
                  key={`${key}-${time}`}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    onDrop(key, time);
                  }}
                  className="min-h-12 space-y-1 rounded-lg border border-dashed border-border p-1"
                >
                  {list.map((item) => (
                    <Chip key={item.id} item={item} onDragStart={onDragStart} />
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function DayView({
  anchor,
  slotTimes,
  items,
}: {
  anchor: string;
  slotTimes: string[];
  items: Item[];
}) {
  return (
    <div className="rounded-3xl border border-border bg-card p-4">
      {items.length === 0 ? (
        <p className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <CalendarDays className="size-4" /> Tidak ada reservasi pada{' '}
          {formatDateId(`${anchor}T00:00:00.000Z`)}
        </p>
      ) : (
        <ul className="space-y-2">
          {slotTimes.map((time) => {
            const list = items.filter((item) => item.startTime === time);
            if (list.length === 0) return null;
            return list.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/admin/reservasi/${item.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-border p-3 transition hover:bg-muted/50"
                >
                  <span className="flex w-16 shrink-0 flex-col items-center rounded-xl bg-[var(--color-cream)] px-2 py-1.5">
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
            ));
          })}
        </ul>
      )}
      <p className="mt-4 text-xs text-muted-foreground">
        Status: {Object.values(STATUS_LABEL).slice(0, 6).join(' · ')}
      </p>
    </div>
  );
}
