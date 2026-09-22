'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { ApiClientError, apiFetch } from '@/lib/client';

export function RegisterForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setLoading(true);
    setErrors({});
    try {
      const result = await apiFetch<{ redirectTo: string }>('/api/auth/register', {
        method: 'POST',
        json: {
          name: String(form.get('name') ?? ''),
          email: String(form.get('email') ?? ''),
          phone: String(form.get('phone') ?? ''),
          password: String(form.get('password') ?? ''),
        },
      });
      toast.success('Akun berhasil dibuat');
      router.replace(result.redirectTo);
      router.refresh();
    } catch (error) {
      if (error instanceof ApiClientError) {
        setErrors(error.errors ?? {});
        toast.error(error.message);
      } else {
        toast.error('Tidak dapat terhubung ke server.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
      <Field label="Nama lengkap" htmlFor="name" required error={errors.name}>
        <Input id="name" name="name" placeholder="Nama orang tua" autoComplete="name" required />
      </Field>
      <Field label="Nomor WhatsApp" htmlFor="phone" required error={errors.phone}>
        <Input id="phone" name="phone" inputMode="tel" placeholder="08xxxxxxxxxx" required />
      </Field>
      <Field label="Email" htmlFor="email" required error={errors.email}>
        <Input id="email" name="email" type="email" placeholder="nama@email.com" required />
      </Field>
      <Field
        label="Password"
        htmlFor="password"
        required
        error={errors.password}
        hint="Minimal 8 karakter, mengandung huruf besar, huruf kecil, dan angka."
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          required
        />
      </Field>
      <Button type="submit" className="w-full" loading={loading}>
        Daftar
      </Button>
    </form>
  );
}
