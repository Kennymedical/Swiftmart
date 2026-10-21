import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { verifyDashboardPin, type DashboardRole } from '@/lib/auth/dashboard-session';
import { clearSuccessfulPinRecoveryLimits } from '@/lib/auth/pin-recovery-rate-limit';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    if (req.headers.get('origin') !== req.nextUrl.origin) {
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
    }
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user?.email) return NextResponse.json({ error: 'Recovery session required' }, { status: 401 });

    const body = await req.json().catch(() => null);
    const type = body?.type;
    const pin = body?.pin;
    if ((type !== 'admin' && type !== 'vendor') || typeof pin !== 'string' || !/^\d{6}$/.test(pin)) {
      return NextResponse.json({ error: 'A valid dashboard type and new PIN are required' }, { status: 400 });
    }
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) return NextResponse.json({ error: 'PIN recovery is not configured' }, { status: 503 });
    const admin = createSupabaseAdmin(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const table = type === 'admin' ? 'profiles' : 'vendors';
    const idField = type === 'admin' ? 'id' : 'user_id';
    const { data: record, error } = await admin.from(table)
      .select('dashboard_pin_hash, role, status')
      .eq(idField, user.id).maybeSingle();
    if (error || !record) return NextResponse.json({ error: 'Recovery account not found' }, { status: 404 });

    const role: DashboardRole | null = type === 'admin'
      ? (record.role === 'admin' || record.role === 'staff' ? record.role : null)
      : (record.status === 'approved' ? 'vendor' : null);
    if (!role || !(await verifyDashboardPin(pin, record.dashboard_pin_hash || ''))) {
      return NextResponse.json({ error: 'The new PIN has not been confirmed for this account' }, { status: 403 });
    }

    const { error: unlockError } = await admin.from(table).update({ failed_pin_attempts: 0, pin_locked_until: null }).eq(idField, user.id);
    if (unlockError) throw unlockError;
    await clearSuccessfulPinRecoveryLimits(admin, user.id, role, user.email);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PIN recovery rate-limit reset failed:', error);
    return NextResponse.json({ error: 'Unable to finalize PIN recovery right now' }, { status: 500 });
  }
}
