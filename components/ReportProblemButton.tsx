'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function ReportProblemButton({ orderId }: { orderId: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!reason.trim()) {
      setError('Describe the problem first.');
      return;
    }
    setLoading(true);

    const { data, error: fnError } = await supabase.functions.invoke('customer-actions', {
      body: { type: 'raise_dispute', orderId, reason: reason.trim() },
    });

    setLoading(false);
    if (fnError) return setError(fnError.message);
    if (data?.error) return setError(data.error);

    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs font-semibold text-red-600 border border-red-200 rounded-lg px-3 py-1.5"
      >
        Report a Problem
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-red-50 rounded-xl p-3">
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="What went wrong?"
        rows={2}
        className="w-full rounded-lg border border-red-200 p-2 text-sm resize-none mb-2"
      />
      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="bg-red-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50"
        >
          {loading ? 'Submitting...' : 'Submit Report'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs font-semibold text-gray-500 px-3 py-1.5"
        >
          Cancel
        </button>
      </div>
    </form>
  );
  }
    
