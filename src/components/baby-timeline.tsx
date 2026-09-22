import Link from 'next/link';
import { StatusBadge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/misc';
import { formatDateId } from '@/lib/datetime';
import { parseJsonArray } from '@/lib/utils';

export type TimelineEntry = {
  id: string;
  reservationCode: string;
  date: Date;
  startTime: string;
  status: string;
  service: { name: string; durationMinutes: number };
  therapist: { name: string } | null;
  treatment?: {
    notes: string | null;
    recommendation: string | null;
    treatmentAreas: string | null;
    babyResponse: string | null;
  } | null;
};

/** Timeline riwayat treatment seorang bayi. */
export function BabyTimeline({
  entries,
  hrefPrefix,
}: {
  entries: TimelineEntry[];
  hrefPrefix: string;
}) {
  if (entries.length === 0) {
    return (
      <EmptyState
        title="Belum ada riwayat treatment"
        description="Riwayat akan muncul setelah kunjungan pertama selesai."
      />
    );
  }

  return (
    <ol className="space-y-3">
      {entries.map((entry) => {
        const areas = parseJsonArray(entry.treatment?.treatmentAreas);
        return (
          <li key={entry.id} className="relative rounded-2xl border border-border p-4 pl-11">
            <span className="absolute left-4 top-5 size-2.5 rounded-full bg-primary" />
            <span className="absolute bottom-0 left-[1.32rem] top-9 w-px bg-border last:hidden" />
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-display text-sm font-bold">
                  {formatDateId(entry.date, { withDay: false })}
                </p>
                <p className="text-sm">{entry.service.name}</p>
                <p className="text-xs text-muted-foreground">
                  {entry.startTime} WIB · {entry.service.durationMinutes} menit ·{' '}
                  {entry.therapist ? `Terapis: ${entry.therapist.name}` : 'Tanpa terapis'}
                </p>
              </div>
              <StatusBadge status={entry.status} />
            </div>

            {entry.treatment ? (
              <div className="mt-3 space-y-1.5 rounded-xl bg-muted/60 p-3 text-xs">
                {areas.length ? (
                  <p>
                    <span className="text-muted-foreground">Area treatment:</span> {areas.join(', ')}
                  </p>
                ) : null}
                {entry.treatment.babyResponse ? (
                  <p>
                    <span className="text-muted-foreground">Respon bayi:</span>{' '}
                    {entry.treatment.babyResponse}
                  </p>
                ) : null}
                {entry.treatment.notes ? (
                  <p>
                    <span className="text-muted-foreground">Catatan:</span> {entry.treatment.notes}
                  </p>
                ) : null}
                {entry.treatment.recommendation ? (
                  <p>
                    <span className="text-muted-foreground">Rekomendasi:</span>{' '}
                    {entry.treatment.recommendation}
                  </p>
                ) : null}
              </div>
            ) : null}

            <Link
              href={`${hrefPrefix}/${entry.id}`}
              className="mt-2 inline-block text-xs font-semibold text-primary hover:underline"
            >
              Lihat detail {entry.reservationCode}
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
