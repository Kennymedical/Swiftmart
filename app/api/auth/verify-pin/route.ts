import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import {
  createDashboardSessionToken,
  dashboardCookieOptions,
  hashDashboardPin,
  isLegacyPin,
  verifyDashboardPin,
  type DashboardRole,
} from '@/lib/auth/dashboard-session';
import { reserveDashboardPinAttempt, resetDashboardPinAttempts } from '@/lib/auth/pin-rate-limit';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    if (req.headers.get('origin') !== req.nextUrl.origin) {
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
    }
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

    const body = await req.json().catch(() => null);
    const pin = body?.pin;
    const type = body?.type;
    if ((type !== 'admin' && type !== 'vendor') || typeof pin !== 'string' || !/^\d{6}$/.test(pin)) {
      return NextResponse.json({ error: 'A valid dashboard type and 6-digit PIN are required' }, { status: 400 });
    }
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'PIN verification is not configured' }, { status: 503 });
    }

    const admin = createSupabaseAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const table = type === 'admin' ? 'profiles' : 'vendors';
    const idField = type === 'admin' ? 'id' : 'user_id';
    const { data: record, error: fetchError } = await admin.from(table)
      .select('dashboard_pin_hash, failed_pin_attempts, pin_locked_until, role, status, full_name, business_name')
      .eq(idField, user.id).maybeSingle();
    if (fetchError || !record) return NextResponse.json({ error: 'Dashboard account not found' }, { status: 404 });

    const role: DashboardRole | null = type === 'admin'
      ? (record.role === 'admin' || record.role === 'staff' ? record.role : null)
      : 'vendor';
    if (!role || (type === 'vendor' && record.status !== 'approved')) {
      return NextResponse.json({ error: 'Account is not authorized for this dashboard' }, { status: 403 });
    }

    // Persist attempt reservations in Postgres before checking the PIN. This is
    // atomic across serverless instances and fails closed if the limiter is down.
    const reservation = await reserveDashboardPinAttempt(admin, user.id, role);
    if (!reservation.allowed) {
      return NextResponse.json({
        error: 'Too many PIN attempts. Try again after the temporary lockout.',
        attempts: reservation.attempts,
        lockedUntil: reservation.lockedUntil,
      }, { status: 429 });
    }

    if (record.pin_locked_until && new Date(record.pin_locked_until).getTime() > Date.now()) {
      return NextResponse.json({ error: 'Dashboard is locked. Try again later.' }, { status: 423 });
    }

    const storedPin = typeof record.dashboard_pin_hash === 'string' ? record.dashboard_pin_hash : '';
    if (!storedPin || !(await verifyDashboardPin(pin, storedPin))) {
      const attempts = Math.max(Number(record.failed_pin_attempts || 0) + 1, reservation.attempts);
      const lockUntil = attempts >= 3 ? new Date(Date.now() + 15 * 60_000).toISOString() : null;
      await admin.from(table).update({ failed_pin_attempts: attempts, pin_locked_until: lockUntil }).eq(idField, user.id);
      await admin.from('security_alerts').insert({
        user_id: user.id,
        alert_type: attempts >= 3 ? 'PIN_LOCKOUT' : 'PIN_VERIFICATION_FAILED',
        severity: attempts >= 3 ? 'critical' : 'medium',
        details: { role, attempts },
        resolved: false,
      });
      return NextResponse.json({ error: attempts >= 3 ? 'Too many failed attempts. Account locked.' : `Wrong PIN. ${3 - attempts} attempts left.`, attempts }, { status: 401 });
    }

    if (isLegacyPin(storedPin)) {
      const upgradedPin = await hashDashboardPin(pin);
      const { error } = await admin.from(table).update({ dashboard_pin_hash: upgradedPin }).eq(idField, user.id);
      if (error) return NextResponse.json({ error: 'Could not securely upgrade the PIN. Please retry.' }, { status: 500 });
    }
    await admin.from(table).update({ failed_pin_attempts: 0, pin_locked_until: null }).eq(idField, user.id);
    await resetDashboardPinAttempts(admin, user.id, role);
    await admin.from('security_alerts').insert({
      user_id: user.id,
      alert_type: 'LOGIN_SUCCESS',
      severity: 'low',
      details: { email: user.email, name: type === 'admin' ? record.full_name : record.business_name, role },
      resolved: true,
    });

    const response = NextResponse.json({ success: true });
    const cookieName = type === 'admin' ? 'swiftmart_admin_pin_session' : 'swiftmart_vendor_pin_session';
    response.cookies.set(cookieName, createDashboardSessionToken(user.id, role), dashboardCookieOptions());
    return response;
  } catch (error) {
    console.error('PIN verification failed:', error);
    return NextResponse.json({ error: 'Unable to verify PIN right now' }, { status: 500 });
  }
}
