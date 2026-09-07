'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const PRESET_AMOUNTS_NAIRA = [1000, 2000, 5000, 10000, 20000];

export default function FundWalletPage() {
  const supabase = createClient();
  const [amountNaira, setAmountNaira] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFund() {
    setError(null);
    const naira = Number(amountNaira);
    if (!naira || naira < 100) {
      setError('Enter at least ₦100');
      return;
    }

    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error('Please sign in again');

      const { data, error: fnError } = await supabase.functions.invoke('wallet-fund', {
        body: { amountKobo: Math.round(naira * 100) },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      window.location.href = data.authorizationUrl;
    } catch (err: any) {
      setError(err.message ?? 'Failed to start funding');
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <h1 className="mb-6 text-xl font-bold">Fund Wallet</h1>

      {error && <p className="mb-4 rounded-md bg-red-50 p-2 text-sm text-red-600">{error}</p>}

      <div className="mb-4 grid grid-cols-3 gap-2">
        {PRESET_AMOUNTS_NAIRA.map((amt) => (
          <button
            key={amt}
            onClick={() => setAmountNaira(amt)}
            className={`rounded-md border py-2 text-sm font-medium ${
              amountNaira === amt ? 'border-blue-600 bg-blue-50 text-blue-600' : ''
            }`}
          >
            ₦{amt.toLocaleString()}
          </button>
        ))}
      </div>

      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₦</span>
        <input
          type="number"
          min={100}
          placeholder="Enter amount"
          value={amountNaira}
          onChange={(e) => setAmountNaira(e.target.value ? Number(e.target.value) : '')}
          className="w-full rounded-md border py-2.5 pl-7 pr-3 text-sm"
        />
      </div>

      <button
        onClick={handleFund}
        disabled={loading}
        className="mt-4 w-full rounded-md bg-black py-2.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {loading ? 'Redirecting to Paystack…' : 'Continue'}
      </button>

      <p className="mt-3 text-center text-xs text-gray-400">
        You'll be redirected to Paystack to pay by card, bank transfer, or USSD.
      </p>
    </div>
  );
}
