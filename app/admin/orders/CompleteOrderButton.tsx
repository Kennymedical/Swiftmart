'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function CompleteOrderButton({ orderId }: { orderId: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleClick() {
    setError('');
    setLoading(true);
    const { data, error: fnError } = await supabase.functions.invoke('admin-actions', {
      body: { type: 'complete_order', orderId },
    });
    setLoading(false);
    if (fnError) return setError(fnError.message);
    if (data?.error) return setError(data.error);
    router.refresh();
  }

  return (
    <div>
      {error && <p className="text-xs text-red-600 mb-1">{error}</p>}
      <button
        onClick={handleClick}
        disabled={loading}
        className="w-full bg-[#0F172A] text-[#D4AF37] font-semibold text-sm py-2 rounded-lg border-2 border-[#D4AF37] disabled:opacity-50"
      >
        {loading ? 'Confirming...' : 'Confirm Delivered & Release Payment'}
      </button>
    </div>
  );
      }
