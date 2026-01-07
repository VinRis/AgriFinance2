import type {Metadata} from 'next';
import './globals.css';
import {ThemeProvider} from '@/components/theme-provider';
import {Toaster} from '@/components/ui/toaster';
import {AppProvider} from '@/contexts/app-context';
import { PWALifecycle } from '@/components/pwa-lifecycle';
import { InstallPWA } from '@/components/install-pwa';

declare global {
  interface Window {
    workbox: any;
  }
}

export const metadata: Metadata = {
  title: 'Agri Finance',
  description: 'Financial management for your livestock enterprise.',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap"
          rel="stylesheet"
        />
        <meta name="theme-color" content="#ffffff" />
      </head>
      <body suppressHydrationWarning={true}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <AppProvider>
              <PWALifecycle />
              <InstallPWA />
              {children}
              <Toaster />
            </AppProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
