'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function ProductActions({ productId }: { productId: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null);
  const [error, setError] = useState('');

  async function handleAction(type: 'approve_product' | 'reject_product', key: 'approve' | 'reject') {
    setError('');
    setLoading(key);
    const { data, error: fnError } = await supabase.functions.invoke('admin-actions', {
      body: { type, productId },
    });
    setLoading(null);
    if (fnError) return setError(fnError.message);
    if (data?.error) return setError(data.error);
    router.refresh();
  }

  return (
    <div>
      {error && <p className="text-xs text-red-600 mb-1">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={() => handleAction('approve_product', 'approve')}
          disabled={loading !== null}
          className="rounded-lg bg-[#0F172A] text-[#D4AF37] border border-[#D4AF37] text-xs font-semibold px-3 py-1.5 disabled:opacity-50"
        >
          {loading === 'approve' ? '...' : 'Approve'}
        </button>
        <button
          onClick={() => handleAction('reject_product', 'reject')}
          disabled={loading !== null}
          className="rounded-lg bg-white text-red-600 border border-red-200 text-xs font-semibold px-3 py-1.5 disabled:opacity-50"
        >
          {loading === 'reject' ? '...' : 'Reject'}
        </button>
      </div>
    </div>
  );
  }
