'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<unknown> };

/**
 * Mendaftarkan service worker dan menampilkan tombol "Pasang aplikasi"
 * ketika browser menawarkan instalasi PWA.
 */
export function PwaRegister() {
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    }
    setDismissed(localStorage.getItem('bh-install-dismissed') === '1');

    const handler = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!installEvent || dismissed) return null;

  return (
    <div className="no-print fixed inset-x-3 bottom-24 z-40 flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-[var(--shadow-soft)] sm:left-auto sm:right-4 sm:w-80">
      <div className="flex-1">
        <p className="text-sm font-semibold">Pasang aplikasi</p>
        <p className="text-xs text-muted-foreground">Akses reservasi lebih cepat dari layar utama.</p>
      </div>
      <button
        type="button"
        onClick={() => {
          installEvent.prompt();
          setInstallEvent(null);
        }}
        className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
      >
        <Download className="size-3.5" /> Pasang
      </button>
      <button
        type="button"
        aria-label="Tutup"
        onClick={() => {
          localStorage.setItem('bh-install-dismissed', '1');
          setDismissed(true);
        }}
        className="rounded-full p-1 text-muted-foreground hover:bg-muted"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
