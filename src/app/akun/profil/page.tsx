import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar } from '@/components/ui/misc';
import { AddBabyButton, ProfileForm } from '@/features/customer/profile-form';
import { babyAge, formatDateId } from '@/lib/datetime';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Profil' };

export default async function CustomerProfilePage() {
  const session = await getSession();
  if (!session?.customerId) redirect('/login');

  const customer = await prisma.customer.findUnique({
    where: { id: session.customerId },
    include: { babies: { orderBy: { createdAt: 'asc' } } },
  });
  if (!customer) redirect('/login');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Avatar name={customer.name} className="size-14" />
        <div>
          <h1 className="font-display text-xl font-bold">{customer.name}</h1>
          <p className="text-sm text-muted-foreground">{session.email}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profil bayi</CardTitle>
          <p className="text-sm text-muted-foreground">
            Data bayi hanya dapat dilihat oleh Anda, admin, dan terapis yang bertugas.
          </p>
        </CardHeader>
        <div className="space-y-3 px-5 pb-5">
          {customer.babies.length === 0 ? (
            <p className="rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">
              Belum ada profil bayi.
            </p>
          ) : (
            <ul className="space-y-2">
              {customer.babies.map((baby) => (
                <li key={baby.id} className="rounded-2xl border border-border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{baby.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {babyAge(baby.birthDate)} · lahir {formatDateId(baby.birthDate, { short: true })}
                        {baby.weightKg ? ` · ${baby.weightKg} kg` : ''}
                      </p>
                      {baby.allergies ? (
                        <p className="mt-1 text-xs text-destructive">Alergi: {baby.allergies}</p>
                      ) : null}
                    </div>
                    <span className="rounded-full bg-[var(--color-blush)] px-2.5 py-1 text-[11px] font-semibold text-secondary-foreground">
                      {baby.gender === 'MALE' ? 'Laki-laki' : 'Perempuan'}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <AddBabyButton customerId={customer.id} />
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data orang tua</CardTitle>
        </CardHeader>
        <div className="px-5 pb-5">
          <ProfileForm
            customerId={customer.id}
            initial={{
              name: customer.name,
              phone: customer.phone,
              email: customer.email ?? '',
              address: customer.address ?? '',
              district: customer.district ?? '',
              village: customer.village ?? '',
              landmark: customer.landmark ?? '',
              locationNote: customer.locationNote ?? '',
              mapsUrl: customer.mapsUrl ?? '',
            }}
          />
        </div>
      </Card>
    </div>
  );
}
