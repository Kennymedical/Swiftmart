import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const { userId, table, status } = await req.json();

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Verify the caller is an admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const { data: { user } } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: adminProfile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single();
    if (adminProfile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // 2. Update the status
    if (table === 'vendors') {
      await supabaseAdmin.from('vendors').update({ status }).eq('user_id', userId);
    } else {
      // For users, we toggle is_active based on blacklist
      const is_active = status === 'blacklisted' ? false : true;
      await supabaseAdmin.from('profiles').update({ is_active }).eq('id', userId);
    }

    // 3. Log the action in security_alerts
    await supabaseAdmin.from('security_alerts').insert({
      user_id: userId,
      alert_type: 'ADMIN_ACTION',
      severity: status === 'blacklisted' ? 'high' : 'medium',
      details: { action: `Status changed to ${status} by admin`, table },
      resolved: true
    });

    return NextResponse.json({ success: true, message: `User marked as ${status}` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
