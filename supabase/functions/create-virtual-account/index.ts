// supabase/functions/create-virtual-account/index.ts
//
// One-time setup per user: creates a Paystack Customer, then a Dedicated
// Virtual Account (DVA) tied to that customer, and stores both on the
// wallet row. After this, any bank transfer to that account number lands
// in the user's SwiftMart wallet automatically — no "fund" flow needed.
//
// Idempotent: if the wallet already has a virtual_account_number, this
// just returns it instead of creating a duplicate.
//
// Note: Paystack DVAs currently require a business account that has the
// "Dedicated NUBAN" feature enabled and only issues accounts at specific
// partner banks (Wema Bank / Titan-Paystack as of this writing) — this is
// a Paystack account-level setting, not something this function controls.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts';

const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY');
// TODO: Add your test key here
if (!PAYSTACK_SECRET_KEY) console.warn('PAYSTACK_SECRET_KEY is not set — /create-virtual-account will fail at runtime');

// Paystack test mode only issues DVAs against this specific partner bank —
// override via secret if your live account uses a different one.
const PREFERRED_BANK = Deno.env.get('PAYSTACK_DVA_PREFERRED_BANK') ?? 'wema-bank';

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

    const admin = getSupabaseAdmin();

    const { data: wallet } = await admin
      .from('wallets')
      .select('id, paystack_customer_code, virtual_account_number, virtual_account_bank')
      .eq('user_id', user.id)
      .single();
    if (!wallet) return json({ error: 'Wallet not found' }, 404);

    if (wallet.virtual_account_number) {
      return json({
        virtualAccountNumber: wallet.virtual_account_number,
        virtualAccountBank: wallet.virtual_account_bank,
        alreadyExisted: true,
      });
    }

    const { data: profile } = await admin
      .from('profiles')
      .select('full_name, phone, phone_verified')
      .eq('id', user.id)
      .single();
    if (!profile?.phone || !profile.phone_verified) {
      return json({ error: 'Verify your phone number before setting up bank transfer funding' }, 400);
    }

    // Step 1: ensure a Paystack Customer exists for this user.
    let customerCode = wallet.paystack_customer_code;
    if (!customerCode) {
      const [firstName, ...rest] = (profile.full_name ?? 'SwiftMart User').split(' ');
      const customerRes = await fetch('https://api.paystack.co/customer', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email,
          first_name: firstName || 'SwiftMart',
          last_name: rest.join(' ') || 'User',
          phone: profile.phone,
        }),
      });
      const customerBody = await customerRes.json();
      if (!customerRes.ok || !customerBody.status) {
        return json({ error: customerBody.message ?? 'Failed to create Paystack customer' }, 502);
      }
      customerCode = customerBody.data.customer_code;
      await admin.from('wallets').update({ paystack_customer_code: customerCode }).eq('id', wallet.id);
    }

    // Step 2: create the Dedicated Virtual Account against that customer.
    const dvaRes = await fetch('https://api.paystack.co/dedicated_account', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ customer: customerCode, preferred_bank: PREFERRED_BANK }),
    });
    const dvaBody = await dvaRes.json();
    if (!dvaRes.ok || !dvaBody.status) {
      return json({ error: dvaBody.message ?? 'Failed to create virtual account' }, 502);
    }

    const accountNumber = dvaBody.data.account_number;
    const bankName = dvaBody.data.bank.name;

    await admin
      .from('wallets')
      .update({ virtual_account_number: accountNumber, virtual_account_bank: bankName })
      .eq('id', wallet.id);

    return json({ virtualAccountNumber: accountNumber, virtualAccountBank: bankName, alreadyExisted: false });
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
