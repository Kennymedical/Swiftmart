'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Ban, Clock, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function AdminStatusButtons({ 
  targetId, 
  table, 
  currentStatus 
}: { 
  targetId: string; 
  table: 'profiles' | 'vendors'; 
  currentStatus: string;
}) {
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
        body: JSON.stringify({ targetId, table, status: newStatus })
      });

      if (!res.ok) throw new Error('Failed to update status');
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {currentStatus !== 'active' && (
        <button onClick={() => updateStatus('active')} disabled={loading} className="flex items-center gap-1 px-2 py-1 bg-green-950/40 text-green-400 border border-green-500/30 rounded text-[10px] font-bold hover:bg-green-900/60 disabled:opacity-50">
          <CheckCircle className="w-3 h-3" /> Activate
        </button>
      )}
      {currentStatus !== 'pending' && (
        <button onClick={() => updateStatus('pending')} disabled={loading} className="flex items-center gap-1 px-2 py-1 bg-yellow-950/40 text-yellow-400 border border-yellow-500/30 rounded text-[10px] font-bold hover:bg-yellow-900/60 disabled:opacity-50">
          <Clock className="w-3 h-3" /> Pend
        </button>
      )}
      {currentStatus !== 'blacklisted' && (
        <button onClick={() => updateStatus('blacklisted')} disabled={loading} className="flex items-center gap-1 px-2 py-1 bg-red-950/40 text-red-400 border border-red-500/30 rounded text-[10px] font-bold hover:bg-red-900/60 disabled:opacity-50">
          <Ban className="w-3 h-3" /> Blacklist
        </button>
      )}
    </div>
  );
}
