'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Check, MessageCircle, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { PaymentBadge, StatusBadge } from '@/components/ui/badge';
import { ApiClientError, apiFetch } from '@/lib/client';
import { formatDateId, formatDateTimeId } from '@/lib/datetime';
import { cn, formatCurrency, waLink } from '@/lib/utils';

type LookupResult = {
  reservationCode: string;
  customerName: string;
  babyName: string;
  serviceName: string;
  durationMinutes: number;
  date: string;
  startTime: string;
  endTime: string;
  therapistName: string | null;
  status: string;
  paymentStatus: string;
  total: number;
  timeline: { label: string; done: boolean; at: string | null }[];
};

export function LookupForm({ defaultCode, whatsapp }: { defaultCode: string; whatsapp: string }) {
  const [code, setCode] = useState(defaultCode);
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<LookupResult | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      const data = await apiFetch<LookupResult>('/api/reservations/lookup', {
        method: 'POST',
        json: { code, phone },
      });
      setResult(data);
    } catch (error) {
      setResult(null);
      toast.error(error instanceof ApiClientError ? error.message : 'Gagal mencari reservasi');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="space-y-4 rounded-3xl border border-border bg-card p-5">
        <Field label="Nomor reservasi" htmlFor="lookup-code" required>
          <Input
            id="lookup-code"
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="HC-20260910-0001"
            className="font-mono"
            required
          />
        </Field>
        <Field
          label="Nomor WhatsApp pemesan"
          htmlFor="lookup-phone"
          required
          hint="Digunakan untuk memastikan hanya pemesan yang dapat melihat data."
        >
          <Input
            id="lookup-phone"
            inputMode="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="08xxxxxxxxxx"
            required
          />
        </Field>
        <Button type="submit" className="w-full" loading={busy}>
          <Search className="size-4" /> Cek status
        </Button>
      </form>

      {result ? (
        <div className="space-y-4 rounded-3xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-mono text-sm font-bold text-primary">{result.reservationCode}</p>
              <p className="font-display text-lg font-bold">{result.serviceName}</p>
              <p className="text-sm text-muted-foreground">
                {result.babyName} · {formatDateId(result.date, { withDay: true })}
              </p>
              <p className="text-sm text-muted-foreground">
                {result.startTime}–{result.endTime} WIB · {result.durationMinutes} menit
              </p>
              <p className="text-sm text-muted-foreground">
                Terapis: {result.therapistName ?? 'Akan ditentukan admin'}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <StatusBadge status={result.status} />
              <PaymentBadge status={result.paymentStatus} />
              <span className="font-semibold">{formatCurrency(result.total)}</span>
            </div>
          </div>

          <ol className="space-y-2 border-t border-border pt-4">
            {result.timeline.map((step) => (
              <li key={step.label} className="flex items-center gap-3">
                <span
                  className={cn(
                    'flex size-5 items-center justify-center rounded-full border text-[10px]',
                    step.done
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border text-muted-foreground',
                  )}
                >
                  {step.done ? <Check className="size-3" strokeWidth={3} /> : '○'}
                </span>
                <span className={cn('text-sm', !step.done && 'text-muted-foreground')}>
                  {step.label}
                </span>
                {step.at ? (
                  <span className="ml-auto text-xs text-muted-foreground">
                    {formatDateTimeId(step.at)}
                  </span>
                ) : null}
              </li>
            ))}
          </ol>

          <Button asChild variant="secondary" className="w-full">
            <a
              href={waLink(whatsapp, `Halo, saya ingin bertanya tentang reservasi ${result.reservationCode}.`)}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle className="size-4" /> Hubungi admin
            </a>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
