'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function useAdminAction() {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function run(body: Record<string, unknown>, key: string) {
    setError('');
    setLoading(key);
    const { data, error: fnError } = await supabase.functions.invoke('admin-actions', { body });
    setLoading(null);
    if (fnError) return setError(fnError.message);
    if (data?.error) return setError(data.error);
    router.refresh();
  }

  return { run, loading, error };
}

export function MarkDeliveredButton({ orderId }: { orderId: string }) {
  const { run, loading, error } = useAdminAction();
  return (
    <div>
      {error && <p className="text-xs text-red-600 mb-1">{error}</p>}
      <button
        onClick={() => run({ type: 'mark_delivered', orderId }, 'mark')}
        disabled={loading !== null}
        className="w-full bg-[#0F172A] text-[#D4AF37] font-semibold text-sm py-2 rounded-lg border-2 border-[#D4AF37] disabled:opacity-50"
      >
        {loading === 'mark' ? 'Marking...' : 'Mark Delivered'}
      </button>
    </div>
  );
}

export function ReleaseEscrowButton({ orderId, disabled }: { orderId: string; disabled: boolean }) {
  const { run, loading, error } = useAdminAction();
  return (
    <div>
      {error && <p className="text-xs text-red-600 mb-1">{error}</p>}
      <button
        onClick={() => run({ type: 'release_escrow', orderId }, 'release')}
        disabled={loading !== null || disabled}
        className="w-full bg-[#0F172A] text-[#D4AF37] font-semibold text-sm py-2 rounded-lg border-2 border-[#D4AF37] disabled:opacity-40"
      >
        {loading === 'release' ? 'Releasing...' : 'Release Payment'}
      </button>
    </div>
  );
}

export function ResolveDisputeButtons({ disputeId }: { disputeId: string }) {
  const { run, loading, error } = useAdminAction();
  return (
    <div>
      {error && <p className="text-xs text-red-600 mb-1">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={() => run({ type: 'resolve_dispute', disputeId, resolution: 'favor_vendor' }, 'vendor')}
          disabled={loading !== null}
          className="flex-1 bg-[#0F172A] text-[#D4AF37] font-semibold text-xs py-2 rounded-lg border border-[#D4AF37] disabled:opacity-50"
        >
          {loading === 'vendor' ? '...' : 'Favor Vendor'}
        </button>
        <button
          onClick={() => run({ type: 'resolve_dispute', disputeId, resolution: 'favor_buyer' }, 'buyer')}
          disabled={loading !== null}
          className="flex-1 bg-white text-red-600 font-semibold text-xs py-2 rounded-lg border border-red-200 disabled:opacity-50"
        >
          {loading === 'buyer' ? '...' : 'Favor Buyer (Refund)'}
        </button>
      </div>
    </div>
  );
  }
                     
