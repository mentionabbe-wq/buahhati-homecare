'use client';

import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Cetak / simpan sebagai PDF lewat dialog print browser. */
export function PrintButton({ label = 'Cetak / Simpan PDF' }: { label?: string }) {
  return (
    <Button size="sm" onClick={() => window.print()}>
      <Printer className="size-4" /> {label}
    </Button>
  );
}
