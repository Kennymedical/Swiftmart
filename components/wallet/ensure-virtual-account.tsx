'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function EnsureVirtualAccount({ hasAccount }: { hasAccount: boolean }) {
  const supabase = createClient();
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'setting-up' | 'error' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (hasAccount || status !== 'idle') return;
    setStatus('setting-up');

    supabase.functions
      .invoke('create-virtual-account')
      .then(({ data, error: fnError }) => {
        if (fnError || data?.error) {
          setError(data?.error ?? 'Could not set up bank transfer funding yet');
          setStatus('error');
          return;
        }
        setStatus('done');
        router.refresh(); // re-fetch the server-rendered wallet page with the new account number
      })
      .catch(() => {
        setError('Could not set up bank transfer funding yet');
        setStatus('error');
      });
  }, [hasAccount, status]);

  if (hasAccount || status === 'idle' || status === 'done') return null;

  if (status === 'setting-up') {
    return (
      <p className="mt-2 text-xs text-blue-100">Setting up your bank transfer account…</p>
    );
  }

  // Most common cause: phone isn't verified yet, which the edge function
  // requires before issuing a virtual account in the caller's name.
  return (
    <p className="mt-2 text-xs text-blue-100">
      {error}
      {error?.includes('phone') && (
        <>
          {' '}
          <a href="/verify-otp" className="underline">
            Verify now
          </a>
        </>
      )}
    </p>
  );
}
