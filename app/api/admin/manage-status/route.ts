import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const { targetId, table, status } = await req.json();

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: adminProfile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single();
    if (adminProfile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    if (table === 'vendors') {
      await supabaseAdmin.from('vendors').update({ status }).eq('id', targetId);
    } else {
      const is_active = status === 'blacklisted' ? false : true;
      await supabaseAdmin.from('profiles').update({ is_active }).eq('id', targetId);
    }

    await supabaseAdmin.from('security_alerts').insert({
      user_id: user.id,
      alert_type: 'ADMIN_ACTION',
      severity: status === 'blacklisted' ? 'high' : 'medium',
      details: { action: `Status changed to ${status} for ${table} ID: ${targetId}` },
      resolved: true
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
