'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';

const LINKS = [
  { href: '#layanan', label: 'Layanan' },
  { href: '#keunggulan', label: 'Keunggulan' },
  { href: '#cara', label: 'Cara Reservasi' },
  { href: '#faq', label: 'FAQ' },
];

export function LandingNavbar({
  businessName,
  isLoggedIn,
  homeHref,
}: {
  businessName: string;
  isLoggedIn: boolean;
  homeHref: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-5 py-3">
        <Link href="/" className="flex items-center gap-2">
          <Logo className="size-9" />
          <span className="font-display text-base font-bold">{businessName}</span>
        </Link>

        <nav className="ml-auto hidden items-center gap-6 md:flex">
          {LINKS.map((link) => (
            <a key={link.href} href={link.href} className="text-sm font-medium text-foreground/75 hover:text-primary">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-2 md:ml-4 md:flex">
          <Button asChild variant="ghost" size="sm">
            <Link href={isLoggedIn ? homeHref : '/login'}>{isLoggedIn ? 'Dashboard' : 'Masuk'}</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/reservasi">Reservasi</Link>
          </Button>
        </div>

        <button
          type="button"
          className="ml-auto rounded-full p-2 md:hidden"
          aria-label="Buka menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-border bg-card px-5 py-4 md:hidden">
          <nav className="flex flex-col gap-3">
            {LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="text-sm font-medium text-foreground/80"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="mt-4 flex gap-2">
            <Button asChild variant="outline" className="flex-1">
              <Link href={isLoggedIn ? homeHref : '/login'}>{isLoggedIn ? 'Dashboard' : 'Masuk'}</Link>
            </Button>
            <Button asChild className="flex-1">
              <Link href="/reservasi">Reservasi</Link>
            </Button>
          </div>
        </div>
      ) : null}
    </header>
  );
}
