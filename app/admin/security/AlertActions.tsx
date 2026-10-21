'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AlertCircle, CheckCircle, Wrench } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function AlertActions({ alertId, alertType, acknowledged, resolved }: { alertId: string, alertType: string, acknowledged: boolean, resolved: boolean }) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const handleAction = async (action: 'acknowledge' | 'resolve' | 'fix') => {
    setLoading(true);
    setMsg('');
    try {
      if (action === 'fix') {
        const { data, error } = await supabase.rpc('fix_security_issue', { p_alert_id: alertId, p_alert_type: alertType });
        if (error) throw error;
        setMsg(`✅ ${data}`);
      } else {
        const { error } = await supabase.rpc('admin_manage_security_alert', { p_action: action, p_alert_id: alertId });
        if (error) throw error;
        setMsg(`✅ Alert ${action}d`);
      }
      router.refresh(); // Refresh the page data
    } catch (err: any) {
      setMsg(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (resolved) {
    return (
      <div className="flex items-center gap-2 text-green-400 text-xs font-semibold p-2 bg-green-950/30 rounded-lg border border-green-500/30 mt-2">
        <CheckCircle className="w-4 h-4" /> This threat has been resolved.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 mt-2">
      <div className="flex flex-wrap gap-2">
        <button onClick={() => handleAction('acknowledge')} disabled={acknowledged || loading} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#142850] text-[#D4AF37] border border-[#D4AF37]/40 rounded-lg text-xs font-bold hover:bg-[#D4AF37]/10 disabled:opacity-50">
          <AlertCircle className="w-3.5 h-3.5" /> {acknowledged ? 'Acknowledged' : 'Acknowledge'}
        </button>
        <button onClick={() => handleAction('fix')} disabled={loading} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-900/40 text-blue-300 border border-blue-500/40 rounded-lg text-xs font-bold hover:bg-blue-900/60">
          <Wrench className="w-3.5 h-3.5" /> Fix Root Cause
        </button>
        <button onClick={() => handleAction('resolve')} disabled={loading} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-950/40 text-green-300 border border-green-500/40 rounded-lg text-xs font-bold hover:bg-green-900/60">
          <CheckCircle className="w-3.5 h-3.5" /> Mark Resolved
        </button>
      </div>
      {msg && <div className="text-xs font-mono mt-1 text-white bg-black/50 p-2 rounded">{msg}</div>}
    </div>
  );
}
