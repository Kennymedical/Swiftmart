import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const { userId, pin, type } = await req.json();
    
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    if (!userId) return NextResponse.json({ error: 'User ID required' }, { status: 400 });

    const table = type === 'admin' ? 'profiles' : 'vendors';
    const idField = type === 'admin' ? 'id' : 'user_id';
    
    const { data: record, error: fetchErr } = await supabaseAdmin
      .from(table)
      .select('dashboard_pin_hash, failed_pin_attempts, pin_locked_until')
      .eq(idField, userId)
      .single();

    if (fetchErr || !record) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    if (record.pin_locked_until && new Date(record.pin_locked_until) > new Date()) {
      return NextResponse.json({ error: 'Dashboard is locked. Try again later.' }, { status: 403 });
    }

    if (record.dashboard_pin_hash === pin) {
      // SUCCESS: Reset attempts
      await supabaseAdmin.from(table).update({ failed_pin_attempts: 0, pin_locked_until: null }).eq(idField, userId);
      
      // 🔥 LOG TO SECURITY_ALERTS
      await supabaseAdmin.from('security_alerts').insert({ 
        user_id: userId, 
        alert_type: 'LOGIN_SUCCESS',
        severity: 'low',
        resolved: true
      });
      
      return NextResponse.json({ success: true });
    } else {
      // FAILED: Increment attempts, Lock if needed
      const newAttempts = (record.failed_pin_attempts || 0) + 1;
      const lockUntil = newAttempts >= 3 ? new Date(Date.now() + 15 * 60000).toISOString() : null;
      
      await supabaseAdmin.from(table).update({ failed_pin_attempts: newAttempts, pin_locked_until: lockUntil }).eq(idField, userId);
      
      // 🔥 LOG TO SECURITY_ALERTS
      await supabaseAdmin.from('security_alerts').insert({ 
        user_id: userId, 
        alert_type: newAttempts >= 3 ? 'PIN_LOCKOUT' : 'PIN_VERIFICATION_FAILED',
        severity: newAttempts >= 3 ? 'critical' : 'medium',
        resolved: false
      });

      return NextResponse.json({ 
        error: newAttempts >= 3 ? 'Too many failed attempts. Account locked.' : `Wrong PIN. ${3 - newAttempts} attempts left.`,
        attempts: newAttempts
      }, { status: 401 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
