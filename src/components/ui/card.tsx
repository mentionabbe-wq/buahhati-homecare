import * as React from 'react';
import { cn } from '@/lib/utils';

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('rounded-3xl border border-border bg-card text-card-foreground shadow-[var(--shadow-card)]', className)}
      {...props}
    />
  ),
);
Card.displayName = 'Card';

export const CardHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col gap-1 p-5 pb-3', className)} {...props} />
);

export const CardTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn('font-display text-lg font-bold leading-tight', className)} {...props} />
);

export const CardDescription = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn('text-sm text-muted-foreground', className)} {...props} />
);

export const CardContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('p-5 pt-0', className)} {...props} />
);

export const CardFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex items-center gap-2 p-5 pt-0', className)} {...props} />
);

/** Kartu statistik ringkas untuk dashboard. */
export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'default',
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: 'default' | 'primary' | 'blush' | 'sky' | 'cream';
  className?: string;
}) {
  const tones: Record<string, string> = {
    default: 'bg-card',
    primary: 'bg-[var(--color-sage)]',
    blush: 'bg-[var(--color-blush)]',
    sky: 'bg-[var(--color-sky)]',
    cream: 'bg-[var(--color-cream)]',
  };
  return (
    <div
      className={cn(
        'rounded-3xl border border-border p-4 shadow-[var(--shadow-card)] sm:p-5',
        tones[tone],
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        {icon ? <span className="text-primary/80">{icon}</span> : null}
      </div>
      <p className="mt-2 font-display text-2xl font-bold leading-none sm:text-3xl">{value}</p>
      {hint ? <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
