import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDateTimeId } from '@/lib/datetime';
import { reservationTimeline } from '@/services/reservation.service';

export function ReservationTimeline({
  history,
  status,
}: {
  history: { status: string; createdAt: Date; note: string | null; changedBy: string | null }[];
  status: string;
}) {
  const steps = reservationTimeline(history, status);
  const cancelled = history.find((h) => h.status === 'CANCELLED' || h.status === 'NO_SHOW');

  return (
    <ol className="space-y-0.5">
      {steps.map((step, index) => (
        <li key={step.key} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span
              className={cn(
                'flex size-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold',
                step.done
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-muted-foreground',
              )}
            >
              {step.done ? <Check className="size-3.5" strokeWidth={3} /> : index + 1}
            </span>
            {index < steps.length - 1 ? (
              <span className={cn('w-px flex-1', step.done ? 'bg-primary/40' : 'bg-border')} />
            ) : null}
          </div>
          <div className="pb-5">
            <p className={cn('text-sm font-medium', !step.done && 'text-muted-foreground')}>
              {step.label}
            </p>
            {step.at ? (
              <p className="text-xs text-muted-foreground">
                {formatDateTimeId(step.at)}
                {step.by ? ` · ${step.by}` : ''}
              </p>
            ) : null}
          </div>
        </li>
      ))}

      {cancelled ? (
        <li className="flex gap-3">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-destructive bg-destructive text-[10px] font-bold text-destructive-foreground">
            !
          </span>
          <div>
            <p className="text-sm font-medium text-destructive">
              {cancelled.status === 'CANCELLED' ? 'Reservasi dibatalkan' : 'Tidak hadir'}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDateTimeId(cancelled.createdAt)}
              {cancelled.note ? ` · ${cancelled.note}` : ''}
            </p>
          </div>
        </li>
      ) : null}
    </ol>
  );
}
