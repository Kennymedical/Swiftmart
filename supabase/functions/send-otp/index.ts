// supabase/functions/send-otp/index.ts
//
// Sends an OTP via Termii's Send Token API (Nigeria's most common SMS/OTP
// provider — this is what the product spec asked for instead of Twilio).
// Termii verifies the code itself server-side on their end via a separate
// "verify" call, so we don't need to store/hash codes ourselves the way
// the Twilio-based flow in the other project does.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

const TERMII_API_KEY = Deno.env.get('TERMII_API_KEY');
// TODO: Add your test key here
if (!TERMII_API_KEY) console.warn('TERMII_API_KEY is not set — /send-otp will fail at runtime');

const TERMII_SENDER_ID = Deno.env.get('TERMII_SENDER_ID') ?? 'SwiftMart';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { phone } = await req.json();
    if (!phone || typeof phone !== 'string') {
      return json({ error: 'phone is required, e.g. +2348012345678' }, 400);
    }

    const res = await fetch('https://api.ng.termii.com/api/sms/otp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: TERMII_API_KEY,
        message_type: 'NUMERIC',
        to: phone,
        from: TERMII_SENDER_ID,
        channel: 'generic',
        pin_attempts: 3,
        pin_time_to_live: 10, // minutes
        pin_length: 6,
        pin_placeholder: '< 123456 >',
        message_text: 'Your SwiftMart verification code is < 123456 >. It expires in 10 minutes.',
      }),
    });

    const body = await res.json();
    if (!res.ok) {
      return json({ error: body.message ?? 'Failed to send OTP' }, 502);
    }

    // pinId is what the client must send back (with the code the user
    // typed) to Termii's /verify endpoint — Termii, not us, checks the code.
    return json({ pinId: body.pinId });
  } catch (err) {
    console.error(err);
    return json({ error: 'Internal error' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
