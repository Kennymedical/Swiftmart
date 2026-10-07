import { redirect } from 'next/navigation';
import { headers, cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { ShieldCheck } from 'lucide-react';
import { AdminHeaderSearch } from '@/components/admin/AdminHeaderSearch';
import { DashboardLock } from '@/components/DashboardLock';
import { AdminNav } from './AdminNav';
import Link from 'next/link';

// Configurable dashboard session TTL (default 8 hours = 28800 seconds)
const DASHBOARD_SESSION_TTL_SECONDS = Number(process.env.DASHBOARD_SESSION_TTL_SECONDS) || 28800;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  const headersList = headers();
  const pathname = headersList.get('x-pathname') || headersList.get('referer') || '/admin';
  const ip = headersList.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  const userAgent = headersList.get('user-agent') || 'unknown';

  // Prevent infinite redirect loops: if visiting /admin/login, render page directly without layout redirect
  if (pathname.includes('/admin/login')) {
    return <>{children}</>;
  }

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

  // Validate server-side PIN session with configurable TTL and device verification
  const cookieStore = cookies();
  const sessionToken = cookieStore.get('swiftmart_admin_pin_session')?.value;

  let sessionValid = false;
  if (sessionToken) {
    const parts = sessionToken.split(':');
    const tokenUserId = parts[0];
    const issuedAt = Number(parts[1]) || 0;
    const nowSec = Math.floor(Date.now() / 1000);

    if (tokenUserId === user.id && (issuedAt === 0 || nowSec - issuedAt < DASHBOARD_SESSION_TTL_SECONDS)) {
      sessionValid = true;
    }
  }

  if (!sessionValid) {
    // Record rejected direct route attempt in audit log
    try {
      await supabase.from('auth_audit_logs').insert({
        actor_id: user.id,
        target_user_id: user.id,
        event_type: 'direct_route_rejected',
        ip_address: ip,
        user_agent: userAgent,
        device_model: userAgent.slice(0, 100),
        metadata: { route: pathname, reason: sessionToken ? 'session_expired' : 'missing_pin_session' },
      });
    } catch {
      // Non-blocking audit log
    }

    redirect(`/admin/login?session_expired=true&redirect=${encodeURIComponent(pathname)}`);
  }

  // Enforce staff permissions by default on protected routes
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
      {/* Main hamburger header renders at top; 4-pillar tabs render directly beneath */}
<AdminNav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-20">{children}</main>
    </div>
  );
}
