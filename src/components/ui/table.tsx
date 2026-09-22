import * as React from 'react';
import { cn } from '@/lib/utils';

/** Wrapper tabel responsif: konten lebar menggulir di dalam kontainernya sendiri. */
export function TableWrapper({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('bh-scroll-x w-full rounded-3xl border border-border bg-card', className)}>
      <table className="w-full min-w-[720px] border-collapse text-sm">{children}</table>
    </div>
  );
}

export const Thead = ({ children }: { children: React.ReactNode }) => (
  <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
    {children}
  </thead>
);

export const Th = ({ className, children, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) => (
  <th className={cn('px-4 py-3 font-semibold', className)} {...props}>
    {children}
  </th>
);

export const Tbody = ({ children }: { children: React.ReactNode }) => (
  <tbody className="divide-y divide-border">{children}</tbody>
);

export const Tr = ({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
  <tr className={cn('transition hover:bg-muted/40', className)} {...props} />
);

export const Td = ({ className, children, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={cn('px-4 py-3 align-middle', className)} {...props}>
    {children}
  </td>
);
