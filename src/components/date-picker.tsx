'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DAYS, MONTHS, toDateKey, todayKey } from '@/lib/datetime';

const DAY_MS = 86_400_000;

/** Kalender bulanan sederhana; seluruh perhitungan memakai komponen UTC. */
export function DatePicker({
  value,
  onChange,
  minKey,
  maxKey,
  disabledKeys = [],
  className,
}: {
  value: string | null;
  onChange: (key: string) => void;
  minKey?: string;
  maxKey?: string;
  disabledKeys?: string[];
  className?: string;
}) {
  const initial = value ?? minKey ?? todayKey();
  const [cursor, setCursor] = useState(() => ({
    year: Number(initial.slice(0, 4)),
    month: Number(initial.slice(5, 7)) - 1,
  }));

  const cells = useMemo(() => {
    const first = new Date(Date.UTC(cursor.year, cursor.month, 1));
    const startOffset = first.getUTCDay();
    const daysInMonth = new Date(Date.UTC(cursor.year, cursor.month + 1, 0)).getUTCDate();
    const list: (string | null)[] = Array.from({ length: startOffset }, () => null);
    for (let day = 1; day <= daysInMonth; day++) {
      list.push(toDateKey(new Date(Date.UTC(cursor.year, cursor.month, day))));
    }
    return list;
  }, [cursor]);

  const disabled = new Set(disabledKeys);
  const today = todayKey();

  function shift(delta: number) {
    setCursor((prev) => {
      const next = new Date(Date.UTC(prev.year, prev.month + delta, 1));
      return { year: next.getUTCFullYear(), month: next.getUTCMonth() };
    });
  }

  const canGoPrev = !minKey || `${cursor.year}-${String(cursor.month + 1).padStart(2, '0')}` > minKey.slice(0, 7);
  const canGoNext = !maxKey || `${cursor.year}-${String(cursor.month + 1).padStart(2, '0')}` < maxKey.slice(0, 7);

  return (
    <div className={cn('rounded-3xl border border-border bg-card p-4', className)}>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => shift(-1)}
          disabled={!canGoPrev}
          className="rounded-full p-2 text-muted-foreground transition hover:bg-muted disabled:opacity-30"
          aria-label="Bulan sebelumnya"
        >
          <ChevronLeft className="size-4" />
        </button>
        <p className="font-display text-sm font-bold">
          {MONTHS[cursor.month]} {cursor.year}
        </p>
        <button
          type="button"
          onClick={() => shift(1)}
          disabled={!canGoNext}
          className="rounded-full p-2 text-muted-foreground transition hover:bg-muted disabled:opacity-30"
          aria-label="Bulan berikutnya"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-muted-foreground">
        {DAYS.map((day) => (
          <span key={day}>{day.slice(0, 3)}</span>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((key, index) => {
          if (!key) return <span key={`empty-${index}`} />;
          const outOfRange = (minKey && key < minKey) || (maxKey && key > maxKey);
          const isDisabled = Boolean(outOfRange) || disabled.has(key);
          const isSelected = key === value;
          return (
            <button
              key={key}
              type="button"
              disabled={isDisabled}
              onClick={() => onChange(key)}
              aria-pressed={isSelected}
              className={cn(
                'relative flex h-10 items-center justify-center rounded-2xl text-sm transition',
                isSelected
                  ? 'bg-primary font-bold text-primary-foreground'
                  : isDisabled
                    ? 'cursor-not-allowed text-muted-foreground/35'
                    : 'hover:bg-muted',
              )}
            >
              {Number(key.slice(8))}
              {key === today && !isSelected ? (
                <span className="absolute bottom-1.5 size-1 rounded-full bg-primary" />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function addDays(key: string, days: number) {
  return toDateKey(new Date(new Date(`${key}T00:00:00.000Z`).getTime() + days * DAY_MS));
}
