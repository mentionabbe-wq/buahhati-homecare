import Link from 'next/link';
import { WifiOff } from 'lucide-react';

export const metadata = { title: 'Offline' };

export default function OfflinePage() {
  return (
    <div className="bh-gradient flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-card">
        <WifiOff className="size-7 text-primary" />
      </span>
      <h1 className="mt-5 font-display text-xl font-bold">Anda sedang offline</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Data reservasi memerlukan koneksi internet. Periksa koneksi Anda lalu muat ulang halaman.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
      >
        Coba lagi
      </Link>
    </div>
  );
}
