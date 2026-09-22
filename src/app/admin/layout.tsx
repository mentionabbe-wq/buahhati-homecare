import { requirePageAuth } from '@/lib/rbac';
import { getSettings } from '@/services/settings.service';
import { AdminShell } from '@/features/admin/shell';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requirePageAuth(['ADMIN']);
  const settings = await getSettings();

  return (
    <AdminShell
      user={{ name: session.name, email: session.email }}
      businessName={settings.businessName}
      logo={settings.businessLogo || null}
    >
      {children}
    </AdminShell>
  );
}
