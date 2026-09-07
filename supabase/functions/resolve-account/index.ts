// supabase/functions/resolve-account/index.ts
//
// GET  ?action=banks                                -> list of Nigerian banks (code + name)
// POST { bankCode, accountNumber }                  -> resolves the account holder's name
//
// Used by the "Send to bank" flow so the user sees "JOHN A. DOE" before
// confirming a transfer, the same confidence check OPay/Paystack give you —
// instead of blindly trusting a typed account number.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY');
// TODO: Add your test key here
if (!PAYSTACK_SECRET_KEY) console.warn('PAYSTACK_SECRET_KEY is not set — /resolve-account will fail at runtime');

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (req.method === 'GET') {
      const url = new URL(req.url);
      if (url.searchParams.get('action') !== 'banks') {
        return json({ error: 'Unknown action' }, 400);
      }
      const res = await fetch('https://api.paystack.co/bank?country=nigeria', {
        headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
      });
      const body = await res.json();
      if (!res.ok) return json({ error: body.message ?? 'Failed to fetch banks' }, 502);
      return json({
        banks: body.data.map((b: any) => ({ code: b.code, name: b.name })),
      });
    }

    const { bankCode, accountNumber } = await req.json();
    if (!bankCode || !accountNumber) {
      return json({ error: 'bankCode and accountNumber are required' }, 400);
    }

    const res = await fetch(
      `https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
      { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } },
    );
    const body = await res.json();
    if (!res.ok || !body.status) {
      return json({ error: body.message ?? 'Could not resolve account' }, 400);
    }

    return json({ accountName: body.data.account_name });
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
