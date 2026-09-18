'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function VendorDetailActions({ vendorId, status }: { vendorId: string; status: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function handleAction(type: string) {
    setError('');
    setLoading(type);
    const { data, error: fnError } = await supabase.functions.invoke('admin-actions', {
      body: { type, vendorId },
    });
    setLoading(null);
    if (fnError) return setError(fnError.message);
    if (data?.error) return setError(data.error);
    router.refresh();
  }

  return (
    <div>
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
      <div className="flex flex-wrap gap-2">
        {(status === 'pending' || status === 'under_review') && (
          <>
            <button
              onClick={() => handleAction('approve_vendor')}
              disabled={loading !== null}
              className="flex-1 bg-[#0F172A] text-[#D4AF37] font-semibold text-sm py-2 rounded-lg border-2 border-[#D4AF37] disabled:opacity-50"
            >
              {loading === 'approve_vendor' ? '...' : 'Approve'}
            </button>
            <button
              onClick={() => handleAction('reject_vendor')}
              disabled={loading !== null}
              className="flex-1 bg-white text-red-600 font-semibold text-sm py-2 rounded-lg border-2 border-red-200 disabled:opacity-50"
            >
              {loading === 'reject_vendor' ? '...' : 'Reject'}
            </button>
          </>
        )}

        {status === 'approved' && (
          <button
            onClick={() => handleAction('suspend_vendor')}
            disabled={loading !== null}
            className="flex-1 bg-white text-red-600 font-semibold text-sm py-2 rounded-lg border-2 border-red-200 disabled:opacity-50"
          >
            {loading === 'suspend_vendor' ? '...' : 'Suspend Vendor'}
          </button>
        )}

        {(status === 'suspended' || status === 'rejected') && (
          <button
            onClick={() => handleAction('reinstate_vendor')}
            disabled={loading !== null}
            className="flex-1 bg-[#0F172A] text-[#D4AF37] font-semibold text-sm py-2 rounded-lg border-2 border-[#D4AF37] disabled:opacity-50"
          >
            {loading === 'reinstate_vendor' ? '...' : 'Reinstate Vendor'}
          </button>
        )}
      </div>
    </div>
  );
  }
                                                           
