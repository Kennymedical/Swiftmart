'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function VendorActions({ vendorId, userId }: { vendorId: string; userId?: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null);
  const [error, setError] = useState('');

  async function handleAction(type: 'approve_vendor' | 'reject_vendor', key: 'approve' | 'reject') {
    setError('');
    setLoading(key);

    const { data, error: fnError } = await supabase.functions.invoke('admin-actions', {
      body: { type, vendorId },
    });

    if (fnError) {
      setLoading(null);
      return setError(fnError.message);
    }
    if (data?.error) {
      setLoading(null);
      return setError(data.error);
    }

    try {
      let recipientUserId = userId;
      if (!recipientUserId) {
        const { data: v } = await supabase.from('vendors').select('user_id').eq('id', vendorId).single();
        recipientUserId = v?.user_id;
      }

      if (recipientUserId) {
        if (key === 'approve') {
          await supabase.from('notifications').insert({
            user_id: recipientUserId,
            title: 'Vendor Account Approved! 🎉',
            message: 'Your store has been verified! You can now access your merchant dashboard, add products, and manage your wallet.',
            link: '/vendor',
            type: 'success',
          });
        } else {
          await supabase.from('notifications').insert({
            user_id: recipientUserId,
            title: 'Vendor Application Update',
            message: 'Your vendor application could not be approved at this time. Please check your KYC details or contact support.',
            link: '/vendor/register',
            type: 'warning',
          });
        }
      }
    } catch (e) {
      console.error('Failed to insert vendor notification:', e);
    }

    setLoading(null);
    router.refresh();
  }

  return (
    <div>
      {error && <p className="text-sm text-red-400 mb-2">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={() => handleAction('approve_vendor', 'approve')}
          disabled={loading !== null}
          className="flex-1 bg-[#0F172A] text-[#D4AF37] font-semibold text-sm py-2 rounded-lg border-2 border-[#D4AF37] hover:bg-[#142850] transition disabled:opacity-50"
        >
          {loading === 'approve' ? 'Approving...' : 'Approve'}
        </button>
        <button
          onClick={() => handleAction('reject_vendor', 'reject')}
          disabled={loading !== null}
          className="flex-1 bg-[#142850] text-red-400 border border-red-500/30 hover:bg-red-950/40 font-semibold text-sm py-2 rounded-lg disabled:opacity-50"
        >
          {loading === 'reject' ? 'Rejecting...' : 'Reject'}
        </button>
      </div>
    </div>
  );
}
