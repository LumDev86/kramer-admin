import type { Metadata } from 'next';
import { Nunito } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';

const nunito = Nunito({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: 'Admin · Kiosco Kramer',
  description: 'Panel de administración de Kiosco Kramer.',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
    shortcut: '/logo.png',
  },
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${nunito.className} bg-gray-100 min-h-screen`} suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
