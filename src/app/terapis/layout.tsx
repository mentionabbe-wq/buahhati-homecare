import { requirePageAuth } from '@/lib/rbac';
import { getSettings } from '@/services/settings.service';
import { TherapistShell } from '@/features/therapist/shell';

export const dynamic = 'force-dynamic';

export default async function TherapistLayout({ children }: { children: React.ReactNode }) {
  const session = await requirePageAuth(['THERAPIST', 'ADMIN']);
  const settings = await getSettings();

  return (
    <TherapistShell
      businessName={settings.businessName}
      logo={settings.businessLogo || null}
      name={session.name}
    >
      {children}
    </TherapistShell>
  );
}
