import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/Header';
import { LoaderProvider } from '@/components/LoaderContext';

export const metadata: Metadata = {
  title: 'SwiftMart',
  description: 'Shop, sell, and pay — all in one feed.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-100 antialiased">
        <LoaderProvider>
          <Header />
          {children}
        </LoaderProvider>
      </body>
    </html>
  );
}
