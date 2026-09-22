import { cn } from '@/lib/utils';

export function Logo({ className, src }: { className?: string; src?: string | null }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="Logo" className={cn('size-9 rounded-2xl object-cover', className)} />;
  }
  return (
    <span
      className={cn(
        'inline-flex size-9 items-center justify-center rounded-2xl bg-gradient-to-br from-[#fdf3e7] via-[#fbe2e9] to-[#dbeefa]',
        className,
      )}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="size-5 text-primary" fill="currentColor">
        <path d="M12 20c-.4 0-.8-.15-1.1-.45l-4.8-4.65C4.4 13.3 4.4 10.7 6.1 9.1c1.55-1.5 4.05-1.5 5.6 0l.3.3.3-.3c1.55-1.5 4.05-1.5 5.6 0 1.7 1.6 1.7 4.2 0 5.8l-4.8 4.65c-.3.3-.7.45-1.1.45Z" />
      </svg>
    </span>
  );
}
