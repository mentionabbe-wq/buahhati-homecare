import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { getSettings } from '@/services/settings.service';
import { Logo } from '@/components/logo';
import { ReservationWizard } from '@/features/reservation/wizard';
import { toDateKey } from '@/lib/datetime';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Reservasi Home Care' };

export default async function ReservationPage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string }>;
}) {
  const params = await searchParams;
  const session = await getSession();
  const [settings, services] = await Promise.all([
    getSettings(),
    prisma.service.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } }),
  ]);

  const customer = session?.customerId
    ? await prisma.customer.findUnique({
        where: { id: session.customerId },
        include: { babies: { where: { isActive: true }, orderBy: { createdAt: 'asc' } } },
      })
    : null;

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-5 py-4">
          <Link
            href={session ? '/akun/beranda' : '/'}
            className="rounded-full p-2 text-muted-foreground transition hover:bg-muted"
            aria-label="Kembali"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <Logo src={settings.businessLogo || null} />
          <div>
            <p className="font-display text-base font-bold">Formulir Reservasi</p>
            <p className="text-xs text-muted-foreground">{settings.businessName}</p>
          </div>
        </div>
      </header>

      <main className="px-5 py-6 sm:py-10">
        <ReservationWizard
          services={services.map((s) => ({
            id: s.id,
            name: s.name,
            description: s.description,
            durationMinutes: s.durationMinutes,
            price: s.price,
            requirements: s.requirements,
          }))}
          settings={{
            transportFee: settings.transportFee,
            minLeadHours: settings.minLeadHours,
            maxAdvanceDays: settings.maxAdvanceDays,
            cancelPolicyText: settings.cancelPolicyText,
            businessName: settings.businessName,
            bankAccount: settings.bankAccount,
          }}
          preselectedServiceId={params.service}
          isLoggedIn={Boolean(session)}
          prefill={
            customer
              ? {
                  name: customer.name,
                  phone: customer.phone,
                  email: customer.email ?? '',
                  address: {
                    address: customer.address ?? '',
                    district: customer.district ?? '',
                    village: customer.village ?? '',
                    landmark: customer.landmark ?? '',
                    locationNote: customer.locationNote ?? '',
                    mapsUrl: customer.mapsUrl ?? '',
                  },
                }
              : null
          }
          babies={
            customer?.babies.map((baby) => ({
              id: baby.id,
              name: baby.name,
              birthDate: toDateKey(baby.birthDate),
              gender: baby.gender,
              weightKg: baby.weightKg,
              notes: baby.notes,
            })) ?? []
          }
        />
      </main>
    </div>
  );
}
