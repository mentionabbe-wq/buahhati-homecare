import type { Metadata, Viewport } from 'next';
import { Toaster } from 'sonner';
import { PwaRegister } from '@/components/pwa-register';
import './globals.css';

const appName = process.env.NEXT_PUBLIC_APP_NAME || 'BuahHati Home Care';

export const metadata: Metadata = {
  title: {
    default: `${appName} — Baby Massage & Baby Spa Home Care`,
    template: `%s · ${appName}`,
  },
  description:
    'Layanan Baby Massage dan Baby Spa profesional dengan terapis berpengalaman, langsung di rumah Anda.',
  manifest: '/manifest.webmanifest',
  applicationName: appName,
  appleWebApp: { capable: true, statusBarStyle: 'default', title: appName },
  icons: {
    icon: [
      { url: '/icons/icon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/icons/icon-192.png',
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: '#5f9e88',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Quicksand:wght@500;600;700&display=swap"
        />
      </head>
      <body>
        {children}
        <Toaster
          position="top-center"
          richColors
          closeButton
          toastOptions={{ style: { borderRadius: '1rem' } }}
        />
        <PwaRegister />
      </body>
    </html>
  );
}
