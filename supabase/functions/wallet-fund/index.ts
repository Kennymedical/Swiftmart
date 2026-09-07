// supabase/functions/wallet-fund/index.ts
//
// Deployed as `wallet-fund` (Supabase CLI function names can't contain
// slashes); call it at /functions/v1/wallet-fund. Initializes a Paystack
// charge tagged with metadata.purpose = "wallet_funding" — the actual
// balance credit happens in /verify-payment once Paystack confirms.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY');
// TODO: Add your test key here
if (!PAYSTACK_SECRET_KEY) console.warn('PAYSTACK_SECRET_KEY is not set — /wallet/fund will fail at runtime');

const MIN_FUND_KOBO = 10_000; // ₦100 floor to avoid dust transactions

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing Authorization header' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) return json({ error: 'Invalid session' }, 401);

    const { amountKobo } = await req.json();
    if (!amountKobo || amountKobo < MIN_FUND_KOBO) {
      return json({ error: `amountKobo must be at least ${MIN_FUND_KOBO} (₦100)` }, 400);
    }

    const reference = `WFUND-${user.id.slice(0, 8)}-${Date.now()}`;

    const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: user.email,
        amount: amountKobo,
        reference,
        channels: ['card', 'bank_transfer', 'ussd', 'mobile_money'],
        metadata: { purpose: 'wallet_funding', userId: user.id },
        callback_url: `${Deno.env.get('FRONTEND_URL')}/wallet/history`,
      }),
    });
    const paystackBody = await paystackRes.json();

    if (!paystackRes.ok || !paystackBody.status) {
      return json({ error: paystackBody.message ?? 'Paystack initialization failed' }, 502);
    }

    return json({
      authorizationUrl: paystackBody.data.authorization_url,
      reference: paystackBody.data.reference,
    });
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
