import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { WebSocketProvider } from '@/components/providers/WebSocketProvider';
import { PWAProvider } from '@/components/providers/PWAProvider';
import '../styles/globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Dream AI Girl - Girlfriend IA Française',
  description: 'La meilleure plateforme française de girlfriend IA avec conversations ultra-réalistes',
  keywords: 'girlfriend ai, ia girlfriend, girlfriend virtuelle, chat ai, france',
  authors: [{ name: 'Dream AI Girl' }],
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover'
  },
  themeColor: '#ec4899',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: [
      { url: '/icons/icon-152x152.png', sizes: '152x152' },
      { url: '/icons/icon-192x192.png', sizes: '192x192' }
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Dream AI Girl'
  },
  formatDetection: {
    telephone: false
  },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: 'https://dreamaigirl.com',
    title: 'Dream AI Girl - Girlfriend IA Française',
    description: 'La meilleure plateforme française de girlfriend IA',
    siteName: 'Dream AI Girl'
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={inter.variable}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="antialiased bg-dark-950 text-white">
        <PWAProvider>
          <WebSocketProvider>
            {children}
          </WebSocketProvider>
        </PWAProvider>
      </body>
    </html>
  );
}
