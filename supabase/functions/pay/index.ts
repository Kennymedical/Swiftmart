// supabase/functions/pay/index.ts
//
// Initializes a Paystack transaction to pay for an existing order.
// (Wallet top-ups have their own function: see wallet-fund/index.ts —
// keeping the two apart avoids one function silently doing two jobs.)
//
// This function never touches the wallet balance itself — it only asks
// Paystack for a checkout link. The order only moves to "paid" once
// Paystack confirms payment via the /verify-payment webhook.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts';

const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY');
// TODO: Add your test key here
if (!PAYSTACK_SECRET_KEY) console.warn('PAYSTACK_SECRET_KEY is not set — /pay will fail at runtime');

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Missing Authorization header' }, 401);
    }

    // Identify the caller using their own JWT against the anon client —
    // this is how we get a trustworthy user id without the client being
    // able to claim to be someone else.
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

    const { orderId } = await req.json();
    if (!orderId) return json({ error: 'orderId is required' }, 400);

    const admin = getSupabaseAdmin();

    const { data: order, error: orderError } = await admin
      .from('orders')
      .select('id, total_kobo, status, customer_id, order_number')
      .eq('id', orderId)
      .single();
    if (orderError || !order) return json({ error: 'Order not found' }, 404);
    if (order.customer_id !== user.id) return json({ error: 'Not your order' }, 403);
    if (order.status !== 'pending_payment') {
      return json({ error: 'Order is not payable' }, 400);
    }

    const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: user.email,
        amount: order.total_kobo, // kobo — Paystack's native unit for NGN
        reference: order.order_number,
        channels: ['card', 'bank_transfer', 'ussd', 'mobile_money'], // mobile_money covers OPay/PalmPay-linked numbers
        metadata: { purpose: 'order', orderId: order.id },
        callback_url: `${Deno.env.get('FRONTEND_URL')}/orders/${order.id}`,
      }),
    });
    const paystackBody = await paystackRes.json();

    if (!paystackRes.ok || !paystackBody.status) {
      return json({ error: paystackBody.message ?? 'Paystack initialization failed' }, 502);
    }

    await admin.from('orders').update({ payment_reference: order.order_number }).eq('id', orderId);

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
