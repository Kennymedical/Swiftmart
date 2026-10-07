'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { CheckCircle2, Eye, ShieldAlert } from 'lucide-react';

export function AlertActions({
  alertId,
  acknowledged,
  resolved,
}: {
  alertId: string;
  acknowledged: boolean;
  resolved: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAction = async (action: 'acknowledge' | 'resolve') => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcErr } = await supabase.rpc('admin_manage_security_alert', {
        p_alert_id: alertId,
        p_action: action,
      });

      if (rpcErr) throw rpcErr;

      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'Action denied');
    } finally {
      setLoading(false);
    }
  };

  if (resolved) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold pt-1">
        <CheckCircle2 className="w-4 h-4" /> Alert marked as resolved
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5">
      {!acknowledged && (
        <button
          onClick={() => handleAction('acknowledge')}
          disabled={loading}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg bg-[#142850] text-[#D4AF37] border border-[#D4AF37]/30 hover:bg-[#D4AF37]/20 transition disabled:opacity-50 shadow-sm"
        >
          <Eye className="w-3.5 h-3.5" /> Acknowledge
        </button>
      )}

      <button
        onClick={() => handleAction('resolve')}
        disabled={loading}
        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600/40 transition disabled:opacity-50 shadow-sm"
      >
        <CheckCircle2 className="w-3.5 h-3.5" /> Mark Resolved
      </button>

      {error && (
        <span className="flex items-center gap-1 text-[11px] text-red-400 font-medium">
          <ShieldAlert className="w-3.5 h-3.5 shrink-0" /> {error}
        </span>
      )}
    </div>
  );
}
