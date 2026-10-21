import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { createDashboardSessionToken, dashboardCookieOptions, hashDashboardPin, type DashboardRole } from '@/lib/auth/dashboard-session';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    if (req.headers.get('origin') !== req.nextUrl.origin) return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
    const supabase = createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    const body = await req.json().catch(() => null);
    const { pin, type } = body || {};
    if ((type !== 'admin' && type !== 'vendor') || typeof pin !== 'string' || !/^\d{6}$/.test(pin)) {
      return NextResponse.json({ error: 'A valid dashboard type and 6-digit PIN are required' }, { status: 400 });
    }
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ error: 'PIN setup is not configured' }, { status: 503 });

    const admin = createSupabaseAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
    const table = type === 'admin' ? 'profiles' : 'vendors';
    const idField = type === 'admin' ? 'id' : 'user_id';
    const { data: record, error: lookupError } = await admin.from(table).select('dashboard_pin_hash, role, status').eq(idField, user.id).maybeSingle();
    if (lookupError || !record) return NextResponse.json({ error: 'Dashboard account not found' }, { status: 404 });
    const role: DashboardRole | null = type === 'admin' ? (record.role === 'admin' || record.role === 'staff' ? record.role : null) : 'vendor';
    if (!role || (type === 'vendor' && record.status !== 'approved')) return NextResponse.json({ error: 'Account is not authorized for this dashboard' }, { status: 403 });
    if (record.dashboard_pin_hash) return NextResponse.json({ error: 'A PIN is already configured. Verify or recover it instead.' }, { status: 409 });

    const hashedPin = await hashDashboardPin(pin);
    const { error: updateError } = await admin.from(table).update({ dashboard_pin_hash: hashedPin, failed_pin_attempts: 0, pin_locked_until: null }).eq(idField, user.id);
    if (updateError) return NextResponse.json({ error: 'Could not save dashboard PIN' }, { status: 500 });
    const response = NextResponse.json({ success: true });
    response.cookies.set(type === 'admin' ? 'swiftmart_admin_pin_session' : 'swiftmart_vendor_pin_session', createDashboardSessionToken(user.id, role), dashboardCookieOptions());
    return response;
  } catch (error) {
    console.error('PIN setup failed:', error);
    return NextResponse.json({ error: 'Unable to set PIN right now' }, { status: 500 });
  }
}
