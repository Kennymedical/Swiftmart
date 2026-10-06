import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ShieldCheck, Wallet, ShoppingBag } from 'lucide-react';
import { AdminHeaderSearch } from '@/components/admin/AdminHeaderSearch';
import { DashboardLock } from '@/components/DashboardLock';
import Link from 'next/link';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login?session_expired=true&redirect=/admin');
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0A1931] via-[#0D1D3A] to-[#0F2140] text-[#F5F7FA]">
      <DashboardLock />
      <header className="sticky top-0 z-50 bg-[#0A1931]/95 backdrop-blur-md border-b border-[#D4AF37]/25 px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-[#142850] to-[#1B2F5E] border border-[#D4AF37]/35 text-[#D4AF37] shadow-[0_0_12px_rgba(212,175,55,0.15)]">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Link href="/admin" className="text-base sm:text-lg font-black text-[#D4AF37] tracking-wider uppercase hover:opacity-90">
                SwiftMart Console
              </Link>
            </div>
            <p className="hidden sm:block text-[11px] text-[#A8B0C5] tracking-wide">Enterprise Marketplace & FinTech Admin</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <AdminHeaderSearch />
          <Link
            href="/admin/wallet"
            className="hidden sm:flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#D4AF37] border border-[#D4AF37]/40 rounded-xl hover:bg-[#142850] transition shrink-0"
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Ledger</span>
          </Link>
          <Link
            href="/admin/products"
            className="hidden sm:flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#D4AF37] border border-[#D4AF37]/40 rounded-xl hover:bg-[#142850] transition shrink-0"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Marketplace</span>
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-20">{children}</main>
    </div>
  );
}
