import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { homeFor } from '@/lib/rbac';
import { Logo } from '@/components/logo';
import { getSettings } from '@/services/settings.service';
import { RegisterForm } from '@/features/auth/register-form';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Daftar Akun' };

export default async function RegisterPage() {
  const session = await getSession();
  if (session) redirect(homeFor(session.role));
  const settings = await getSettings();

  return (
    <div className="bh-gradient flex min-h-dvh items-center justify-center px-5 py-10">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-6 flex items-center justify-center gap-2">
          <Logo src={settings.businessLogo || null} className="size-11" />
          <span className="font-display text-lg font-bold">{settings.businessName}</span>
        </Link>

        <div className="rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
          <h1 className="font-display text-xl font-bold">Buat akun orang tua</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Simpan profil bayi, pantau status reservasi, dan lihat riwayat treatment.
          </p>
          <RegisterForm />
          <p className="mt-5 text-center text-sm text-muted-foreground">
            Sudah punya akun?{' '}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Masuk
            </Link>
          </p>
        </div>

        <p className="mt-5 text-center text-sm">
          <Link href="/" className="text-muted-foreground hover:text-primary">
            ← Kembali ke beranda
          </Link>
        </p>
      </div>
    </div>
  );
}
