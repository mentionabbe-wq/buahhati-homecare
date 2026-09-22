import QRCode from 'qrcode';
import { cn } from '@/lib/utils';

/** QR berisi nomor reservasi, dipindai terapis/admin saat kunjungan. */
export async function ReservationQr({
  code,
  size = 132,
  className,
}: {
  code: string;
  size?: number;
  className?: string;
}) {
  const dataUrl = await QRCode.toDataURL(code, {
    width: size * 2,
    margin: 1,
    color: { dark: '#40382f', light: '#ffffff' },
  }).catch(() => null);

  if (!dataUrl) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={dataUrl}
      alt={`QR nomor reservasi ${code}`}
      width={size}
      height={size}
      className={cn('rounded-2xl border border-border bg-white p-1.5', className)}
    />
  );
}
