import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AdminNav } from './AdminNav';
import { ShieldCheck } from 'lucide-react';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') redirect('/');

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0A1931] via-[#0D1D3A] to-[#0F2140] text-[#F5F7FA]">
      {/* Admin Console Top Bar */}
      <header className="sticky top-0 z-50 bg-[#0A1931]/95 backdrop-blur-md border-b border-[#D4AF37]/25 px-4 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-[#142850] border border-[#D4AF37]/30 text-[#D4AF37]">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-black text-[#D4AF37] tracking-wider uppercase">
              Admin Console
            </h1>
            <p className="text-[10px] text-[#A8B0C5] tracking-wide">
              SwiftMart Private Banking & Treasury
            </p>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <AdminNav />

      {/* Main Screen Content */}
      <main className="pt-2 pb-12">{children}</main>
    </div>
  );
}
