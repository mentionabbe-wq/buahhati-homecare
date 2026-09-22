import Link from 'next/link';
import { MapPin, Phone, Mail } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { getSettings } from '@/services/settings.service';
import { getSession } from '@/lib/auth';
import { homeFor } from '@/lib/rbac';
import { Logo } from '@/components/logo';
import { LandingNavbar } from '@/features/landing/navbar';
import {
  AdvantagesSection,
  CtaSection,
  FaqSection,
  Hero,
  ServicesSection,
  StepsSection,
  TestimonialsSection,
} from '@/features/landing/sections';

export const dynamic = 'force-dynamic';

export default async function LandingPage() {
  const [settings, services, session] = await Promise.all([
    getSettings(),
    prisma.service
      .findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } })
      .catch(() => []),
    getSession().catch(() => null),
  ]);

  return (
    <div className="min-h-dvh">
      <LandingNavbar
        businessName={settings.businessName}
        isLoggedIn={Boolean(session)}
        homeHref={session ? homeFor(session.role) : '/login'}
      />
      <main>
        <Hero whatsapp={settings.businessWhatsapp} businessName={settings.businessName} />
        <ServicesSection services={services} />
        <AdvantagesSection />
        <StepsSection />
        <TestimonialsSection />
        <FaqSection />
        <CtaSection whatsapp={settings.businessWhatsapp} />
      </main>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <div className="flex items-center gap-2">
              <Logo src={settings.businessLogo || null} />
              <span className="font-display text-base font-bold">{settings.businessName}</span>
            </div>
            <p className="mt-3 max-w-sm text-sm text-muted-foreground">{settings.businessTagline}</p>
          </div>
          <div>
            <p className="font-display text-sm font-bold">Kontak</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0" /> {settings.businessAddress}
              </li>
              <li className="flex items-center gap-2">
                <Phone className="size-4 shrink-0" /> {settings.businessWhatsapp}
              </li>
              <li className="flex items-center gap-2">
                <Mail className="size-4 shrink-0" /> {settings.businessEmail}
              </li>
            </ul>
          </div>
          <div>
            <p className="font-display text-sm font-bold">Tautan</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/reservasi" className="hover:text-primary">
                  Reservasi
                </Link>
              </li>
              <li>
                <Link href="/cek-reservasi" className="hover:text-primary">
                  Cek Status Reservasi
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-primary">
                  Masuk
                </Link>
              </li>
              <li>
                <Link href="/daftar" className="hover:text-primary">
                  Daftar Akun
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border px-5 py-5 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} {settings.businessName}. Jam operasional {settings.openHour}–
          {settings.closeHour} WIB.
        </div>
      </footer>
    </div>
  );
}
