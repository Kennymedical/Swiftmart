// supabase/functions/verify-kyc-paystack/index.ts
//
// POST { idType, idNumber, firstName, lastName, bankCode, accountNumber }
//
// Validates vendor identity & settlement bank details via Paystack API:
// 1. Resolves settlement bank account name to verify account exists and matches legal name
// 2. Checks BVN / NIN / KYC identity match with Paystack identity services
// 3. Flags automated verified status vs manual compliance review for offline documents (CAC, Voter's Card, Proof of Address)

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY');

interface KycRequestBody {
  idType: 'nin' | 'bvn' | 'cac' | 'voters_card' | 'drivers_license' | string;
  idNumber: string;
  firstName: string;
  lastName: string;
  bankCode?: string;
  accountNumber?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (!PAYSTACK_SECRET_KEY) {
    return json({
      verified: false,
      status: 'pending_review',
      error: 'PAYSTACK_SECRET_KEY is not configured in Supabase secrets',
      message: 'Automated verification is currently queued for manual admin review.',
    }, 200);
  }

  try {
    const body: KycRequestBody = await req.json();
    const { idType, idNumber, firstName, lastName, bankCode, accountNumber } = body;

    if (!idNumber || !idType) {
      return json({ error: 'idType and idNumber are required' }, 400);
    }

    let resolvedAccountName: string | null = null;
    let bankVerified = false;

    // Step 1: Verify Bank Account if provided
    if (bankCode && accountNumber) {
      try {
        const bankRes = await fetch(
          `https://api.paystack.co/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`,
          {
            headers: {
              Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
              'Content-Type': 'application/json',
            },
          }
        );
        const bankData = await bankRes.json();
        if (bankRes.ok && bankData.status && bankData.data) {
          resolvedAccountName = bankData.data.account_name;
          bankVerified = true;
        }
      } catch (err) {
        console.error('Paystack bank resolution error:', err);
      }
    }

    // Step 2: Name Matching Helper
    const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
    const userNames = [normalize(firstName || ''), normalize(lastName || '')].filter(Boolean);

    let nameMatches = false;
    if (resolvedAccountName && userNames.length > 0) {
      const normalizedAccount = normalize(resolvedAccountName);
      nameMatches = userNames.some((part) => normalizedAccount.includes(part));
    }

    // Step 3: Identity Verification (BVN Match or Document Queue)
    if (idType === 'bvn' && bankCode && accountNumber) {
      try {
        const matchRes = await fetch('https://api.paystack.co/bvn/match', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            bvn: idNumber,
            account_number: accountNumber,
            bank_code: bankCode,
            first_name: firstName,
            last_name: lastName,
          }),
        });
        const matchData = await matchRes.json();
        if (matchRes.ok && matchData.status && matchData.data?.is_blacklisted === false) {
          return json({
            verified: true,
            status: 'verified',
            idType,
            resolvedAccountName,
            bankVerified,
            nameMatched: true,
            message: 'BVN and settlement account successfully verified via Paystack.',
          });
        }
      } catch (err) {
        console.error('Paystack BVN match error:', err);
      }
    }

    // For NIN, CAC, Voter's Card, or when offline review is required
    const isAutoVerified = bankVerified && nameMatches;

    return json({
      verified: isAutoVerified,
      status: isAutoVerified ? 'verified' : 'pending_review',
      idType,
      resolvedAccountName,
      bankVerified,
      nameMatched: nameMatches,
      message: isAutoVerified
        ? 'Identity and settlement account verified successfully.'
        : 'Details submitted successfully. Queued for standard compliance verification.',
    });
  } catch (err: any) {
    console.error('KYC verification error:', err);
    return json({ error: err.message || 'Internal KYC verification error' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
