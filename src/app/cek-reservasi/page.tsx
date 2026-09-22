import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/logo';
import { getSettings } from '@/services/settings.service';
import { LookupForm } from '@/features/reservation/lookup-form';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Cek Status Reservasi' };

export default async function LookupPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const [{ code }, settings] = await Promise.all([searchParams, getSettings()]);

  return (
    <div className="bh-gradient min-h-dvh px-5 py-8">
      <div className="mx-auto w-full max-w-lg">
        <Link href="/" className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
          <ArrowLeft className="size-4" /> Kembali ke beranda
        </Link>

        <div className="mb-5 flex items-center gap-2">
          <Logo src={settings.businessLogo || null} className="size-11" />
          <div>
            <p className="font-display text-lg font-bold">Cek Status Reservasi</p>
            <p className="text-xs text-muted-foreground">{settings.businessName}</p>
          </div>
        </div>

        <LookupForm defaultCode={code ?? ''} whatsapp={settings.businessWhatsapp} />
      </div>
    </div>
  );
}
