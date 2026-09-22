'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { CalendarHeart, Home, LogOut, ScrollText, UserRound } from 'lucide-react';
import { Logo } from '@/components/logo';
import { apiFetch } from '@/lib/client';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/akun/beranda', label: 'Home', icon: Home },
  { href: '/akun/reservasi', label: 'Reservasi', icon: CalendarHeart },
  { href: '/akun/riwayat', label: 'Riwayat', icon: ScrollText },
  { href: '/akun/profil', label: 'Profil', icon: UserRound },
];

export function CustomerShell({
  children,
  businessName,
  logo,
}: {
  children: React.ReactNode;
  businessName: string;
  logo: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
      toast.success('Berhasil keluar');
      router.replace('/');
      router.refresh();
    } catch {
      toast.error('Gagal keluar');
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-5 py-3">
          <Link href="/akun/beranda" className="flex items-center gap-2">
            <Logo src={logo} />
            <span className="font-display text-sm font-bold">{businessName}</span>
          </Link>
          <button
            type="button"
            onClick={logout}
            className="ml-auto rounded-full p-2 text-muted-foreground transition hover:bg-muted"
            aria-label="Keluar"
          >
            <LogOut className="size-5" />
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-5 pb-28">{children}</main>

      <nav
        aria-label="Navigasi utama"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur"
      >
        <ul className="mx-auto flex max-w-3xl">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  className={cn(
                    'flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition',
                    active ? 'text-primary' : 'text-muted-foreground',
                  )}
                >
                  <span
                    className={cn(
                      'flex size-9 items-center justify-center rounded-2xl transition',
                      active ? 'bg-[var(--color-sage)]' : '',
                    )}
                  >
                    <item.icon className="size-5" />
                  </span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>
    </div>
  );
}
