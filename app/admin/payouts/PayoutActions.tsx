'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function PayoutActions({ transactionId }: { transactionId: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState<'complete' | 'fail' | null>(null);
  const [error, setError] = useState('');

  async function handleAction(type: 'complete_payout' | 'fail_payout', key: 'complete' | 'fail') {
    setError('');
    setLoading(key);
    const { data, error: fnError } = await supabase.functions.invoke('admin-actions', {
      body: { type, transactionId },
    });
    setLoading(null);
    if (fnError) return setError(fnError.message);
    if (data?.error) return setError(data.error);
    router.refresh();
  }

  return (
    <div>
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={() => handleAction('complete_payout', 'complete')}
          disabled={loading !== null}
          className="flex-1 bg-[#0F172A] text-[#D4AF37] font-semibold text-sm py-2 rounded-lg border-2 border-[#D4AF37] disabled:opacity-50"
        >
          {loading === 'complete' ? 'Marking...' : 'Mark Sent'}
        </button>
        <button
          onClick={() => handleAction('fail_payout', 'fail')}
          disabled={loading !== null}
          className="flex-1 bg-white text-red-600 font-semibold text-sm py-2 rounded-lg border-2 border-red-200 disabled:opacity-50"
        >
          {loading === 'fail' ? 'Refunding...' : 'Mark Failed & Refund'}
        </button>
      </div>
    </div>
  );
  }
