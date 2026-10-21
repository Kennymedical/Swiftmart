import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

    // Use Service Role to access auth.users
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Find the user in auth.users
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error) throw error;
    
    const user = users.find(u => u.email === email);
    if (!user) {
      return NextResponse.json({ error: 'No account found with this email' }, { status: 404 });
    }

    // 2. Log this security event
    await supabaseAdmin.from('security_logs').insert({
      user_id: user.id,
      action: 'PIN_RECOVERY_INITIATED',
      user_agent: req.headers.get('user-agent') || 'Unknown device'
    });

    // 3. TODO: Deduct ₦1,000 from their wallet here before sending code.
    // 4. TODO: Generate OTP and send via email/SMS.

    return NextResponse.json({ success: true, message: 'Recovery code sent!' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
