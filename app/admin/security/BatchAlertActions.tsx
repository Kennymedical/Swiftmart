'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { CheckCircle2, Eye, ShieldAlert, CheckSquare, Square } from 'lucide-react';

export function BatchAlertActions({
  allAlertIds,
  selectedIds,
  onSelectAll,
  onClearSelection,
}: {
  allAlertIds: string[];
  selectedIds: string[];
  onSelectAll: () => void;
  onClearSelection: () => void;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBatchAction = async (action: 'acknowledge' | 'resolve') => {
    if (selectedIds.length === 0) return;
    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcErr } = await supabase.rpc('admin_batch_manage_security_alerts', {
        p_alert_ids: selectedIds,
        p_action: action,
      });

      if (rpcErr) throw rpcErr;

      onClearSelection();
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'Batch action failed');
    } finally {
      setLoading(false);
    }
  };

  const isAllSelected = allAlertIds.length > 0 && selectedIds.length === allAlertIds.length;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-xl bg-[#0F2140] border border-[#D4AF37]/30">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={isAllSelected ? onClearSelection : onSelectAll}
          className="inline-flex items-center gap-1.5 text-xs text-[#D4AF37] hover:text-white transition font-medium"
        >
          {isAllSelected ? (
            <CheckSquare className="w-4 h-4 text-[#D4AF37]" />
          ) : (
            <Square className="w-4 h-4 text-[#8A94B0]" />
          )}
          <span>{isAllSelected ? 'Deselect All' : 'Select All'}</span>
        </button>
        <span className="text-xs text-[#8A94B0]">
          ({selectedIds.length} of {allAlertIds.length} selected)
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => handleBatchAction('acknowledge')}
          disabled={loading || selectedIds.length === 0}
          className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-lg bg-[#142850] text-[#D4AF37] border border-[#D4AF37]/30 hover:bg-[#D4AF37]/20 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Acknowledge ({selectedIds.length})</span>
        </button>

        <button
          type="button"
          onClick={() => handleBatchAction('resolve')}
          disabled={loading || selectedIds.length === 0}
          className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-lg bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600/40 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Mark Resolved ({selectedIds.length})</span>
        </button>

        {error && (
          <span className="flex items-center gap-1 text-[11px] text-red-400">
            <ShieldAlert className="w-3 h-3" /> {error}
          </span>
        )}
      </div>
    </div>
  );
}
