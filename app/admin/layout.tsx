import { redirect } from 'next/navigation';
import { headers, cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { ShieldCheck, Wallet, ShoppingBag, Users } from 'lucide-react';
import { AdminHeaderSearch } from '@/components/admin/AdminHeaderSearch';
import { DashboardLock } from '@/components/DashboardLock';
import { AdminNav } from './AdminNav';
import Link from 'next/link';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/admin/login?session_expired=true&redirect=/admin');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, staff_permissions')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || (profile.role !== 'admin' && profile.role !== 'staff')) {
    redirect('/');
  }

  const cookieStore = cookies();
  const adminPinSession = cookieStore.get('swiftmart_admin_pin_session')?.value;

  if (!adminPinSession || adminPinSession !== user.id) {
    redirect('/admin/login?session_expired=true&redirect=/admin');
  }


  // Enforce staff permissions by default on protected routes
  const headersList = headers();
  const pathname = headersList.get('x-pathname') || headersList.get('referer') || '';

  if (profile.role === 'staff') {
    const perms = (profile.staff_permissions as Record<string, boolean>) || {};

    if (pathname.includes('/admin/staff') || pathname.includes('/admin/users')) {
      redirect('/admin?unauthorized=staff_management');
    }
    if (pathname.includes('/admin/payouts') && !perms.manage_payouts) {
      redirect('/admin?unauthorized=payouts');
    }
    if (pathname.includes('/admin/commissions') && !perms.manage_commissions) {
      redirect('/admin?unauthorized=commissions');
    }
    if (pathname.includes('/admin/orders') && !perms.manage_orders) {
      redirect('/admin?unauthorized=orders');
    }
    if (pathname.includes('/admin/kyc') && !perms.manage_kyc) {
      redirect('/admin?unauthorized=kyc');
    }
    if (pathname.includes('/admin/posts') && !perms.manage_posts) {
      redirect('/admin?unauthorized=posts');
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0A1931] via-[#0D1D3A] to-[#0F2140] text-[#F5F7FA]">
      <DashboardLock />
      <header className="sticky top-0 z-50 bg-[#0A1931]/95 backdrop-blur-md border-b border-[#D4AF37]/25 px-4 sm:px-6 lg:px-8 py-3 shadow-md">
        {/* Desktop and Main Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center justify-between">
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
                <p className="text-[11px] text-[#A8B0C5] tracking-wide">
                  {profile.role === 'admin' ? 'Super Admin Workspace' : 'Staff Operations Workspace'}
                </p>
              </div>
            </div>
          </div>

          {/* Search Bar - Full Width on Mobile, Inline on Desktop */}
          <div className="w-full sm:w-auto flex-1 max-w-md sm:mx-4">
            <AdminHeaderSearch />
          </div>

          {/* Quick action buttons attached to search bar removed as requested */}
        </div>
      </header>

      {/* Primary 4-Pillar Navigation Bar with sub-tabs */}
      <AdminNav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-20">{children}</main>
    </div>
  );
}
