'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function MarkShippedButton({ orderId, status }: { orderId: string; status: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (status !== 'paid' && status !== 'processing') {
    return <p className="text-[10px] text-gray-400 mt-1 capitalize">{status}</p>;
  }

  async function handleClick() {
    setError('');
    setLoading(true);
    const { data, error: fnError } = await supabase.functions.invoke('vendor-actions', {
      body: { type: 'mark_shipped', orderId },
    });
    setLoading(false);
    if (fnError) return setError(fnError.message);
    if (data?.error) return setError(data.error);
    router.refresh();
  }

  return (
    <div>
      {error && <p className="text-[10px] text-red-600">{error}</p>}
      <button
        onClick={handleClick}
        disabled={loading}
        className="text-[10px] font-semibold bg-[#0F172A] text-[#D4AF37] border border-[#D4AF37] rounded-lg px-2 py-1 mt-1 disabled:opacity-50"
      >
        {loading ? 'Marking...' : 'Mark Shipped'}
      </button>
    </div>
  );
    }
