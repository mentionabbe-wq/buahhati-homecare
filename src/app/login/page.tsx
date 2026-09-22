import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { homeFor } from '@/lib/rbac';
import { Logo } from '@/components/logo';
import { getSettings } from '@/services/settings.service';
import { LoginForm } from '@/features/auth/login-form';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Masuk' };

export default async function LoginPage() {
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
          <h1 className="font-display text-xl font-bold">Masuk ke akun Anda</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Kelola reservasi dan riwayat treatment si kecil.
          </p>
          <LoginForm />
          <p className="mt-5 text-center text-sm text-muted-foreground">
            Belum punya akun?{' '}
            <Link href="/daftar" className="font-semibold text-primary hover:underline">
              Daftar sekarang
            </Link>
          </p>
        </div>

        {process.env.NODE_ENV !== 'production' ? (
          <div className="mt-5 rounded-2xl border border-dashed border-border bg-card/70 p-4 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">Akun demo (hanya tampil di mode development)</p>
            <p className="mt-1">Admin: admin@example.com / Admin123!</p>
            <p>Terapis: siti@example.com / Terapis123!</p>
            <p>Customer: customer@example.com / Customer123!</p>
          </div>
        ) : null}

        <p className="mt-5 text-center text-sm">
          <Link href="/" className="text-muted-foreground hover:text-primary">
            ← Kembali ke beranda
          </Link>
        </p>
      </div>
    </div>
  );
}
