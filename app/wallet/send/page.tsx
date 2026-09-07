'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

type Mode = 'user' | 'bank';
interface Bank {
  code: string;
  name: string;
}

export default function SendMoneyPage() {
  const supabase = createClient();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('user');
  const [amountNaira, setAmountNaira] = useState<number | ''>('');

  // "Send to user" state
  const [username, setUsername] = useState('');

  // "Send to bank" state
  const [banks, setBanks] = useState<Bank[]>([]);
  const [bankCode, setBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [resolvedName, setResolvedName] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (mode === 'bank' && banks.length === 0) {
      supabase.functions.invoke('resolve-account?action=banks', { method: 'GET' }).then(({ data }) => {
        if (data?.banks) setBanks(data.banks);
      });
    }
  }, [mode]);

  // Resolve the account name whenever both bank + a full account number are set.
  useEffect(() => {
    setResolvedName(null);
    if (mode === 'bank' && bankCode && accountNumber.length === 10) {
      setResolving(true);
      supabase.functions
        .invoke('resolve-account', { body: { bankCode, accountNumber } })
        .then(({ data }) => {
          if (data?.accountName) setResolvedName(data.accountName);
          else if (data?.error) setError(data.error);
        })
        .finally(() => setResolving(false));
    }
  }, [bankCode, accountNumber, mode]);

  async function handleSend() {
    setError(null);
    const naira = Number(amountNaira);
    if (!naira || naira <= 0) return setError('Enter a valid amount');

    if (mode === 'user' && !username.trim()) return setError('Enter a SwiftMart username');
    if (mode === 'bank' && (!bankCode || accountNumber.length !== 10 || !resolvedName)) {
      return setError('Select a bank and enter a valid account number');
    }

    setLoading(true);
    try {
      const body =
        mode === 'user'
          ? { recipientUsername: username.replace(/^@/, ''), amountKobo: Math.round(naira * 100) }
          : {
              bankCode,
              accountNumber,
              accountName: resolvedName,
              amountKobo: Math.round(naira * 100),
            };

      const { data, error: fnError } = await supabase.functions.invoke('wallet-transfer', { body });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      setSuccess(true);
      setTimeout(() => router.push('/wallet'), 1200);
    } catch (err: any) {
      setError(err.message ?? 'Transfer failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <h1 className="mb-6 text-xl font-bold">Send Money</h1>

      <div className="mb-4 flex gap-2 rounded-lg bg-gray-100 p-1 text-sm">
        <button
          onClick={() => setMode('user')}
          className={`flex-1 rounded-md py-1.5 ${mode === 'user' ? 'bg-white shadow' : ''}`}
        >
          SwiftMart user
        </button>
        <button
          onClick={() => setMode('bank')}
          className={`flex-1 rounded-md py-1.5 ${mode === 'bank' ? 'bg-white shadow' : ''}`}
        >
          Bank account
        </button>
      </div>

      {error && <p className="mb-4 rounded-md bg-red-50 p-2 text-sm text-red-600">{error}</p>}
      {success && (
        <p className="mb-4 rounded-md bg-green-50 p-2 text-sm text-green-700">
          Sent! Redirecting to your wallet…
        </p>
      )}

      {mode === 'user' ? (
        <input
          placeholder="@username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="mb-3 w-full rounded-md border px-3 py-2 text-sm"
        />
      ) : (
        <div className="mb-3 space-y-3">
          <select
            value={bankCode}
            onChange={(e) => setBankCode(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
          >
            <option value="">Select bank</option>
            {banks.map((b) => (
              <option key={b.code} value={b.code}>
                {b.name}
              </option>
            ))}
          </select>
          <input
            placeholder="10-digit account number"
            value={accountNumber}
            maxLength={10}
            onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
          {resolving && <p className="text-xs text-gray-400">Resolving account name…</p>}
          {resolvedName && (
            <p className="rounded-md bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
              {resolvedName}
            </p>
          )}
        </div>
      )}

      <div className="relative mb-4">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₦</span>
        <input
          type="number"
          min={1}
          placeholder="Amount"
          value={amountNaira}
          onChange={(e) => setAmountNaira(e.target.value ? Number(e.target.value) : '')}
          className="w-full rounded-md border py-2.5 pl-7 pr-3 text-sm"
        />
      </div>

      <button
        onClick={handleSend}
        disabled={loading}
        className="w-full rounded-md bg-black py-2.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {loading ? 'Sending…' : 'Send'}
      </button>
    </div>
  );
}
