import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const { email, pin, type } = await req.json(); // type = 'admin' or 'vendor'
    
    // Use service role to bypass RLS and update lock status securely
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Get the user
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
    const user = users.find(u => u.email === email);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // 2. Check current lock status in DB
    const table = type === 'admin' ? 'profiles' : 'vendors';
    const idField = type === 'admin' ? 'id' : 'user_id';
    
    const { data: record, error: fetchErr } = await supabaseAdmin
      .from(table)
      .select('dashboard_pin_hash, failed_pin_attempts, pin_locked_until')
      .eq(idField, user.id)
      .single();

    if (fetchErr || !record) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    // 3. Check if currently locked
    if (record.pin_locked_until && new Date(record.pin_locked_until) > new Date()) {
      return NextResponse.json({ error: 'Dashboard is locked. Try again later.' }, { status: 403 });
    }

    // 4. Verify PIN
    if (record.dashboard_pin_hash === pin) {
      // SUCCESS: Reset attempts
      await supabaseAdmin.from(table).update({ failed_pin_attempts: 0, pin_locked_until: null }).eq(idField, user.id);
      await supabaseAdmin.from('security_logs').insert({ user_id: user.id, action: 'LOGIN_SUCCESS', user_agent: req.headers.get('user-agent') });
      return NextResponse.json({ success: true });
    } else {
      // FAILED: Increment attempts and log
      const newAttempts = (record.failed_pin_attempts || 0) + 1;
      const lockUntil = newAttempts >= 3 ? new Date(Date.now() + 15 * 60000).toISOString() : null; // Lock for 15 mins
      
      await supabaseAdmin.from(table).update({ failed_pin_attempts: newAttempts, pin_locked_until: lockUntil }).eq(idField, user.id);
      await supabaseAdmin.from('security_logs').insert({ user_id: user.id, action: 'PIN_FAILED', user_agent: req.headers.get('user-agent') });

      return NextResponse.json({ 
        error: newAttempts >= 3 ? 'Too many failed attempts. Account locked for 15 minutes.' : `Wrong PIN. ${3 - newAttempts} attempts remaining.`,
        attempts: newAttempts
      }, { status: 401 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
