import { requirePageAuth } from '@/lib/rbac';
import { getSettings } from '@/services/settings.service';
import { CustomerShell } from '@/features/customer/shell';

export const dynamic = 'force-dynamic';

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  await requirePageAuth(['CUSTOMER', 'ADMIN']);
  const settings = await getSettings();

  return (
    <CustomerShell businessName={settings.businessName} logo={settings.businessLogo || null}>
      {children}
    </CustomerShell>
  );
}
