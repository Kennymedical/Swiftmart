import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/layout/bottom-nav';
import { LoaderProvider } from '@/components/LoaderContext';

export const metadata: Metadata = {
  title: 'SwiftMart',
  description: 'Shop, sell, and pay — all in one feed.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gradient-to-b from-[#0A1931] via-[#0D1D3A] to-[#0F2140] text-[#F5F7FA] antialiased min-h-screen selection:bg-[#D4AF37]/30 selection:text-[#F5C445]">
        <LoaderProvider>
          <Header />
          {children}
          <BottomNav />
        </LoaderProvider>
      </body>
    </html>
  );
}
