// supabase/functions/wallet-transfer/index.ts
//
// Deployed as `wallet-transfer`; call at /functions/v1/wallet-transfer.
// Two modes, chosen by which fields are present in the body:
//   - { recipientUsername, amountKobo }                -> internal transfer
//     via the transfer_wallet_funds() Postgres RPC (atomic, race-safe)
//   - { bankCode, accountNumber, amountKobo }           -> real Paystack
//     Transfer API payout to an external bank account

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts';

const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY');
// TODO: Add your test key here
if (!PAYSTACK_SECRET_KEY) console.warn('PAYSTACK_SECRET_KEY is not set — external bank transfers will fail at runtime');

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

    const body = await req.json();
    const { amountKobo } = body;
    if (!amountKobo || amountKobo <= 0) return json({ error: 'amountKobo must be positive' }, 400);

    const admin = getSupabaseAdmin();
    const { data: senderWallet } = await admin
      .from('wallets')
      .select('id, balance_kobo')
      .eq('user_id', user.id)
      .single();
    if (!senderWallet) return json({ error: 'Wallet not found' }, 404);
    if (senderWallet.balance_kobo < amountKobo) return json({ error: 'Insufficient balance' }, 400);

    if (body.recipientUsername) {
      return await handleInternalTransfer(admin, senderWallet.id, body.recipientUsername, amountKobo);
    }
    if (body.bankCode && body.accountNumber) {
      return await handleBankTransfer(admin, user.id, senderWallet, body, amountKobo);
    }
    return json({ error: 'Provide either recipientUsername or bankCode+accountNumber' }, 400);
  } catch (err) {
    console.error(err);
    return json({ error: 'Internal error' }, 500);
  }
});

async function handleInternalTransfer(
  admin: any,
  senderWalletId: string,
  recipientUsername: string,
  amountKobo: number,
) {
  const { data: recipientProfile } = await admin
    .from('profiles')
    .select('id, full_name')
    .eq('username', recipientUsername)
    .single();
  if (!recipientProfile) return json({ error: 'Recipient not found' }, 404);

  const { data: recipientWallet } = await admin
    .from('wallets')
    .select('id')
    .eq('user_id', recipientProfile.id)
    .single();
  if (!recipientWallet) return json({ error: 'Recipient wallet not found' }, 404);

  const { error } = await admin.rpc('transfer_wallet_funds', {
    p_sender_wallet_id: senderWalletId,
    p_recipient_wallet_id: recipientWallet.id,
    p_amount_kobo: amountKobo,
    p_description: `Transfer to @${recipientUsername}`,
  });
  if (error) return json({ error: error.message }, 400);

  await admin.from('notifications').insert({
    user_id: recipientProfile.id,
    type: 'wallet_credit',
    title: 'Money received',
    body: `₦${(amountKobo / 100).toLocaleString()} was sent to your SwiftMart Wallet`,
    link: '/wallet',
  });

  return json({ success: true });
}

async function handleBankTransfer(
  admin: any,
  userId: string,
  senderWallet: { id: string; balance_kobo: number },
  body: { bankCode: string; accountNumber: string; accountName?: string },
  amountKobo: number,
) {
  // Paystack requires a "transfer recipient" object before you can send to
  // it — create one per request rather than assuming it's cached, since
  // this is called infrequently enough that the extra round-trip is fine.
  const recipientRes = await fetch('https://api.paystack.co/transferrecipient', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'nuban',
      name: body.accountName ?? 'SwiftMart User',
      account_number: body.accountNumber,
      bank_code: body.bankCode,
      currency: 'NGN',
    }),
  });
  const recipientBody = await recipientRes.json();
  if (!recipientRes.ok || !recipientBody.status) {
    return json({ error: recipientBody.message ?? 'Failed to create transfer recipient' }, 502);
  }

  const reference = `WOUT-${userId.slice(0, 8)}-${Date.now()}`;

  const transferRes = await fetch('https://api.paystack.co/transfer', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      source: 'balance',
      amount: amountKobo,
      recipient: recipientBody.data.recipient_code,
      reference,
      reason: 'SwiftMart wallet withdrawal',
    }),
  });
  const transferBody = await transferRes.json();
  if (!transferRes.ok || !transferBody.status) {
    return json({ error: transferBody.message ?? 'Transfer failed' }, 502);
  }

  // Debit immediately for a synchronous "transfer success" response;
  // Paystack's transfer can still fail asynchronously (insufficient
  // platform balance, bank rejection) — in production, reconcile via the
  // `transfer.success` / `transfer.failed` webhook and reverse this debit
  // if the async outcome is a failure. That reconciliation handler is a
  // follow-up, not included here.
  const newBalance = senderWallet.balance_kobo - amountKobo;
  await admin.from('transactions').insert({
    wallet_id: senderWallet.id,
    type: 'payout',
    status: 'pending',
    amount_kobo: amountKobo,
    balance_after_kobo: newBalance,
    provider_reference: reference,
    description: `Bank transfer to ${body.accountNumber}`,
  });
  await admin.from('wallets').update({ balance_kobo: newBalance }).eq('id', senderWallet.id);

  return json({ success: true, reference });
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
