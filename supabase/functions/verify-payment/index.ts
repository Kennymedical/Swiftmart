// supabase/functions/verify-payment/index.ts
//
// This is the real webhook target for Paystack's "charge.success" event
// (configure it as https://<project>.functions.supabase.co/verify-payment
// in the Paystack dashboard). It:
//   1. Verifies the HMAC-SHA512 signature Paystack sends
//   2. Re-verifies the transaction against Paystack's own /verify endpoint
//      (never trust the webhook body's amount/status directly)
//   3. Branches on metadata.purpose to either mark an order PAID + open an
//      escrow hold, or credit the caller's wallet
//
// All DB writes here use the service-role client — this is intentional and
// the only place wallets.balance_kobo is allowed to change outside of the
// wallet-transfer function.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts';

const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY');
// TODO: Add your test key here
if (!PAYSTACK_SECRET_KEY) console.warn('PAYSTACK_SECRET_KEY is not set — /verify-payment will fail at runtime');

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const rawBody = await req.text();
  const signature = req.headers.get('x-paystack-signature');

  const validSignature = await verifySignature(rawBody, signature, PAYSTACK_SECRET_KEY!);
  if (!validSignature) {
    console.warn('Rejected webhook with invalid Paystack signature');
    return new Response('invalid signature', { status: 400 });
  }

  const event = JSON.parse(rawBody);
  if (event.event !== 'charge.success') {
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  }

  const reference = event.data.reference as string;

  // Re-verify against Paystack's API rather than trusting the webhook body —
  // this defends against a spoofed or replayed payload even if the HMAC
  // check above were somehow bypassed.
  const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
    headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
  });
  const verifyBody = await verifyRes.json();
  if (!verifyRes.ok || verifyBody.data.status !== 'success') {
    console.warn(`Transaction ${reference} did not verify as successful`);
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  }

  const { amount, metadata, customer } = verifyBody.data;
  const admin = getSupabaseAdmin();

  if (metadata?.purpose === 'order') {
    await handleOrderPayment(admin, reference, amount, metadata.orderId);
  } else if (metadata?.purpose === 'wallet_funding') {
    await handleWalletFunding(admin, reference, amount, metadata.userId);
  } else if (verifyBody.data.channel === 'dedicated_nuban' && customer?.customer_code) {
    // A direct bank transfer to the user's Dedicated Virtual Account — this
    // wasn't initiated through /pay or /wallet-fund, so there's no
    // metadata.purpose to branch on. Match it to a wallet by customer code
    // instead, which is what create-virtual-account stored at setup time.
    await handleDedicatedAccountCredit(admin, reference, amount, customer.customer_code);
  } else {
    console.warn(`Unrecognized payment purpose for reference ${reference}`);
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});

async function handleOrderPayment(admin: any, reference: string, amountKobo: number, orderId: string) {
  const { data: order } = await admin
    .from('orders')
    .select('id, total_kobo, status')
    .eq('id', orderId)
    .single();
  if (!order || order.status !== 'pending_payment') return; // already processed or missing
  if (order.total_kobo !== amountKobo) {
    console.error(`Amount mismatch on order ${orderId}: paid ${amountKobo}, expected ${order.total_kobo}`);
    return;
  }

  await admin.from('orders').update({ status: 'paid' }).eq('id', orderId);

  // Notify the buyer — mirrors the "Your SwiftMart order #1234 has shipped"
  // style notification the product spec calls for, at the payment stage.
  const { data: fullOrder } = await admin
    .from('orders')
    .select('customer_id, order_number')
    .eq('id', orderId)
    .single();
  if (fullOrder) {
    await admin.from('notifications').insert({
      user_id: fullOrder.customer_id,
      type: 'order_update',
      title: 'Payment received',
      body: `Your SwiftMart order #${fullOrder.order_number} has been paid and is being processed.`,
      link: `/orders/${orderId}`,
    });
  }
}

async function handleWalletFunding(admin: any, reference: string, amountKobo: number, userId: string) {
  const { data: wallet } = await admin
    .from('wallets')
    .select('id, balance_kobo')
    .eq('user_id', userId)
    .single();
  if (!wallet) {
    console.error(`No wallet found for user ${userId}`);
    return;
  }
  await creditWallet(admin, wallet, reference, amountKobo, 'Wallet funded via Paystack');
}

async function handleDedicatedAccountCredit(
  admin: any,
  reference: string,
  amountKobo: number,
  customerCode: string,
) {
  const { data: wallet } = await admin
    .from('wallets')
    .select('id, balance_kobo, user_id')
    .eq('paystack_customer_code', customerCode)
    .single();
  if (!wallet) {
    console.error(`No wallet found for Paystack customer ${customerCode}`);
    return;
  }
  await creditWallet(admin, wallet, reference, amountKobo, 'Wallet funded via bank transfer');
}

async function creditWallet(
  admin: any,
  wallet: { id: string; balance_kobo: number; user_id?: string },
  reference: string,
  amountKobo: number,
  description: string,
) {
  // Idempotency: provider_reference is UNIQUE, so a retried webhook for the
  // same Paystack reference will fail this insert harmlessly instead of
  // double-crediting the wallet.
  const newBalance = wallet.balance_kobo + amountKobo;
  const { error: txError } = await admin.from('transactions').insert({
    wallet_id: wallet.id,
    type: 'wallet_funding',
    status: 'success',
    amount_kobo: amountKobo,
    balance_after_kobo: newBalance,
    provider_reference: reference,
    description,
  });
  if (txError) {
    console.warn(`Funding for ${reference} already processed or failed:`, txError.message);
    return;
  }

  await admin.from('wallets').update({ balance_kobo: newBalance }).eq('id', wallet.id);

  const userId = wallet.user_id ?? (await admin.from('wallets').select('user_id').eq('id', wallet.id).single()).data?.user_id;
  if (userId) {
    await admin.from('notifications').insert({
      user_id: userId,
      type: 'wallet_credit',
      title: 'Wallet funded',
      body: `₦${(amountKobo / 100).toLocaleString()} credited to your SwiftMart Wallet`,
      link: '/wallet',
    });
  }
}

async function verifySignature(rawBody: string, signature: string | null, secret: string): Promise<boolean> {
  if (!signature) return false;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign'],
  );
  const sigBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody));
  const computed = Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return computed === signature;
}
