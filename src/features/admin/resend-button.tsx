'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/client';

export function ResendButton({ notificationId }: { notificationId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <Button
      size="sm"
      variant="outline"
      className="mt-2"
      loading={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await apiFetch('/api/notifications/whatsapp', {
            method: 'POST',
            json: { notificationId },
          });
          toast.success('Notifikasi dikirim ulang');
          router.refresh();
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Gagal mengirim ulang');
        } finally {
          setBusy(false);
        }
      }}
    >
      <Send className="size-4" /> Kirim ulang
    </Button>
  );
}
