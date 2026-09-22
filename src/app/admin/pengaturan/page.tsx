import Link from 'next/link';
import { MessageSquare } from 'lucide-react';
import { PageHeader } from '@/features/admin/shell';
import { Button } from '@/components/ui/button';
import { SettingsForm } from '@/features/admin/settings-form';
import { getSettings } from '@/services/settings.service';
import { AVAILABLE_WA_PROVIDERS } from '@/services/whatsapp';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Pengaturan' };

export default async function AdminSettingsPage() {
  const settings = await getSettings();

  return (
    <div>
      <PageHeader
        title="Pengaturan"
        description="Identitas bisnis, jam operasional, slot booking, pembayaran, dan notifikasi."
        action={
          <Button asChild size="sm" variant="outline">
            <Link href="/admin/notifikasi">
              <MessageSquare className="size-4" /> Log notifikasi
            </Link>
          </Button>
        }
      />
      <SettingsForm settings={settings} providers={AVAILABLE_WA_PROVIDERS} />
    </div>
  );
}
