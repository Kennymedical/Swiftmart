// supabase/functions/resolve-account/index.ts
//
// GET  ?action=banks                    -> list of Nigerian banks (code + name)
// POST { bankCode, accountNumber }      -> resolves the account holder's name
//
// Protected: requires a valid Supabase user JWT.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeadersFor } from '../_shared/cors.ts';

const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY');
if (!PAYSTACK_SECRET_KEY) {
  console.warn('PAYSTACK_SECRET_KEY is not set — /resolve-account will fail at runtime');
}

serve(async (req) => {
  const cors = corsHeadersFor(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  // ============================================================
  // AUTH CHECK — rejects any caller without a valid user JWT
  // ============================================================
  const authHeader = req.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    return json({ error: 'Authentication required' }, 401, cors);
  }
  const jwt = authHeader.replace('Bearer ', '');

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: `Bearer ${jwt}` } } },
  );

  const { data: userData, error: userError } = await supabase.auth.getUser(jwt);
  if (userError || !userData?.user) {
    return json({ error: 'Invalid or expired session' }, 401, cors);
  }
  // ============================================================

  try {
    if (req.method === 'GET') {
      const url = new URL(req.url);
      if (url.searchParams.get('action') !== 'banks') {
        return json({ error: 'Unknown action' }, 400, cors);
      }
      const res = await fetch('https://api.paystack.co/bank?country=nigeria', {
        headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
      });
      const body = await res.json();
      if (!res.ok) {
        console.error('Paystack bank list failed:', body);
        return json({ error: 'Failed to fetch banks' }, 502, cors);
      }
      return json(
        { banks: body.data.map((b: any) => ({ code: b.code, name: b.name })) },
        200,
        cors,
      );
    }

    const { bankCode, accountNumber } = await req.json();
    if (!bankCode || !accountNumber) {
      return json({ error: 'bankCode and accountNumber are required' }, 400, cors);
    }

    const res = await fetch(
      `https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
      { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } },
    );
    const body = await res.json();

    if (!res.ok || !body.status) {
      // ✅ Log full error internally, but return GENERIC message to caller
      console.error('Paystack resolve failed:', body);
      return json({ error: 'Could not resolve account. Try again later.' }, 400, cors);
    }

    return json({ accountName: body.data.account_name }, 200, cors);
  } catch (err) {
    console.error('Unexpected error:', err);
    return json({ error: 'Internal error' }, 500, cors);
  }
});

function json(body: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}
