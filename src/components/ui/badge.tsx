import * as React from 'react';
import { cn } from '@/lib/utils';
import {
  PAYMENT_STATUS_CLASS,
  PAYMENT_STATUS_LABEL,
  STATUS_CLASS,
  STATUS_DOT,
  STATUS_LABEL,
  type PaymentStatus,
  type ReservationStatus,
} from '@/lib/constants';

export function Badge({
  className,
  variant = 'default',
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: 'default' | 'outline' | 'soft' }) {
  const variants = {
    default: 'bg-primary/10 text-primary border-primary/20',
    outline: 'bg-transparent text-muted-foreground border-border',
    soft: 'bg-muted text-muted-foreground border-transparent',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold',
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const key = (status as ReservationStatus) ?? 'PENDING';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold',
        STATUS_CLASS[key] ?? STATUS_CLASS.PENDING,
        className,
      )}
    >
      <span className={cn('size-1.5 rounded-full', STATUS_DOT[key] ?? STATUS_DOT.PENDING)} />
      {STATUS_LABEL[key] ?? status}
    </span>
  );
}

export function PaymentBadge({ status, className }: { status: string; className?: string }) {
  const key = (status as PaymentStatus) ?? 'UNPAID';
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold',
        PAYMENT_STATUS_CLASS[key] ?? PAYMENT_STATUS_CLASS.UNPAID,
        className,
      )}
    >
      {PAYMENT_STATUS_LABEL[key] ?? status}
    </span>
  );
}
