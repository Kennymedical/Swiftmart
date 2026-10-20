'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Ban, Clock, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function AdminStatusButtons({ userId, table, currentStatus }: { userId: string, table: 'profiles' | 'vendors', currentStatus: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const updateStatus = async (newStatus: string) => {
    if (!confirm(`Are you sure you want to mark this account as ${newStatus}?`)) return;
    setLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch('/api/admin/manage-status', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ userId, table, status: newStatus })
      });

      if (!res.ok) throw new Error('Failed to update status');
      
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-2">
      {currentStatus !== 'active' && (
        <button onClick={() => updateStatus('active')} disabled={loading} className="flex items-center gap-1 px-2 py-1 bg-green-950/40 text-green-400 border border-green-500/30 rounded text-xs hover:bg-green-900/60">
          <CheckCircle className="w-3 h-3" /> Activate
        </button>
      )}
      {currentStatus !== 'pending' && (
        <button onClick={() => updateStatus('pending')} disabled={loading} className="flex items-center gap-1 px-2 py-1 bg-yellow-950/40 text-yellow-400 border border-yellow-500/30 rounded text-xs hover:bg-yellow-900/60">
          <Clock className="w-3 h-3" /> Pending
        </button>
      )}
      {currentStatus !== 'blacklisted' && currentStatus !== 'banned' && (
        <button onClick={() => updateStatus('blacklisted')} disabled={loading} className="flex items-center gap-1 px-2 py-1 bg-red-950/40 text-red-400 border border-red-500/30 rounded text-xs hover:bg-red-900/60">
          <Ban className="w-3 h-3" /> Blacklist
        </button>
      )}
    </div>
  );
}
