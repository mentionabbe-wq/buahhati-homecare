'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  BabyIcon,
  CalendarDays,
  ClipboardList,
  CreditCard,
  FileBarChart,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Settings,
  Sparkles,
  Stethoscope,
  Users,
  X,
} from 'lucide-react';
import { Logo } from '@/components/logo';
import { Avatar } from '@/components/ui/misc';
import { apiFetch } from '@/lib/client';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/reservasi', label: 'Reservasi', icon: ClipboardList },
  { href: '/admin/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/admin/pelanggan', label: 'Pelanggan', icon: Users },
  { href: '/admin/bayi', label: 'Bayi', icon: BabyIcon },
  { href: '/admin/terapis', label: 'Terapis', icon: Stethoscope },
  { href: '/admin/layanan', label: 'Layanan', icon: Sparkles },
  { href: '/admin/pembayaran', label: 'Pembayaran', icon: CreditCard },
  { href: '/admin/promo', label: 'Promo', icon: MessageSquare },
  { href: '/admin/laporan', label: 'Laporan', icon: FileBarChart },
  { href: '/admin/pengaturan', label: 'Pengaturan', icon: Settings },
];

export function AdminShell({
  children,
  user,
  businessName,
  logo,
}: {
  children: React.ReactNode;
  user: { name: string; email: string };
  businessName: string;
  logo: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

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

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
      {NAV.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={cn(
              'flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-medium transition',
              active ? 'bg-primary text-primary-foreground shadow-sm' : 'text-foreground/75 hover:bg-muted',
            )}
          >
            <item.icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-dvh bg-background">
      <aside className="no-print sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border bg-card lg:flex">
        <div className="flex items-center gap-2 border-b border-border px-4 py-4">
          <Logo src={logo} />
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-bold">{businessName}</p>
            <p className="text-xs text-muted-foreground">Panel Admin</p>
          </div>
        </div>
        {nav}
        <div className="border-t border-border p-3">
          <div className="flex items-center gap-3 rounded-2xl px-2 py-2">
            <Avatar name={user.name} className="size-9" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="mt-1 flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-medium text-destructive transition hover:bg-destructive/10"
          >
            <LogOut className="size-4" /> Keluar
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-card/90 px-4 py-3 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-full p-2 hover:bg-muted"
            aria-label="Buka menu"
          >
            <Menu className="size-5" />
          </button>
          <Logo src={logo} className="size-8" />
          <p className="truncate font-display text-sm font-bold">{businessName}</p>
          <button
            type="button"
            onClick={logout}
            className="ml-auto rounded-full p-2 text-destructive hover:bg-destructive/10"
            aria-label="Keluar"
          >
            <LogOut className="size-5" />
          </button>
        </header>

        {open ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              aria-label="Tutup menu"
              className="absolute inset-0 bg-[#3b332c]/40 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <div className="relative flex h-full w-72 flex-col bg-card">
              <div className="flex items-center gap-2 border-b border-border px-4 py-4">
                <Logo src={logo} />
                <p className="flex-1 truncate font-display text-sm font-bold">{businessName}</p>
                <button type="button" onClick={() => setOpen(false)} className="rounded-full p-2 hover:bg-muted">
                  <X className="size-5" />
                </button>
              </div>
              {nav}
            </div>
          </div>
        ) : null}

        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-7">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-xl font-bold sm:text-2xl">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div className="flex flex-wrap gap-2">{action}</div> : null}
    </div>
  );
}
