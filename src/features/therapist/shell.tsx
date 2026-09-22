'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { CalendarDays, LogOut, ScrollText, UserRound } from 'lucide-react';
import { Logo } from '@/components/logo';
import { apiFetch } from '@/lib/client';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/terapis/jadwal', label: 'Jadwal', icon: CalendarDays },
  { href: '/terapis/riwayat', label: 'Riwayat', icon: ScrollText },
  { href: '/terapis/profil', label: 'Profil', icon: UserRound },
];

export function TherapistShell({
  children,
  businessName,
  logo,
  name,
}: {
  children: React.ReactNode;
  businessName: string;
  logo: string | null;
  name: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
      toast.success('Berhasil keluar');
      router.replace('/login');
      router.refresh();
    } catch {
      toast.error('Gagal keluar');
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-5 py-3">
          <Logo src={logo} />
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-bold">{businessName}</p>
            <p className="truncate text-xs text-muted-foreground">Terapis · {name}</p>
          </div>
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
        aria-label="Navigasi terapis"
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
