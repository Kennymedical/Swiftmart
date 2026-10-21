import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { createClient as createSupabaseAnon } from '@supabase/supabase-js';
import { reservePinRecoveryRequest } from '@/lib/auth/pin-recovery-rate-limit';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    if (req.headers.get('origin') !== req.nextUrl.origin) {
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
    }
    const body = await req.json().catch(() => null);
    const email = typeof body?.email === 'string' ? body.email.trim() : '';
    const type = body?.type;
    if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      (type !== 'admin' && type !== 'vendor')) {
      return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !anonKey || !serviceKey) {
      return NextResponse.json({ error: 'PIN recovery is not configured' }, { status: 503 });
    }

    const service = createSupabaseAdmin(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const reservation = await reservePinRecoveryRequest(service, email);
    if (!reservation.allowed) {
      return NextResponse.json({
        error: 'Too many recovery requests. Please wait before trying again.',
        lockedUntil: reservation.lockedUntil,
      }, { status: 429 });
    }

    // Supabase intentionally returns a non-enumerating response for unknown emails.
    // Keep this route's response equally generic so account existence is not leaked.
    const authClient = createSupabaseAnon(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { error } = await authClient.auth.resetPasswordForEmail(email);
    if (error) {
      return NextResponse.json({ error: 'Unable to send a recovery code right now. Please try again later.' }, { status: 503 });
    }
    return NextResponse.json({ success: true, message: 'If the account is eligible, a recovery code has been sent.' });
  } catch (error) {
    console.error('PIN recovery request failed:', error);
    return NextResponse.json({ error: 'Unable to process PIN recovery right now' }, { status: 500 });
  }
}
