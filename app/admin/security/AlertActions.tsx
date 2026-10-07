'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { CheckCircle2, Eye } from 'lucide-react';

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Please sign in as an admin');
        setLoading(false);
        return;
      }

      const updates: Record<string, unknown> = {};
      if (action === 'acknowledge') {
        updates.acknowledged_at = new Date().toISOString();
        updates.acknowledged_by = user.id;
      } else {
        updates.resolved = true;
        updates.resolved_at = new Date().toISOString();
        updates.resolved_by = user.id;
      }

      const { error: updateErr } = await supabase
        .from('security_alerts')
        .update(updates)
        .eq('id', alertId);

      if (updateErr) throw updateErr;

      // Audit trail
      await supabase.from('auth_audit_logs').insert({
        actor_id: user.id,
        target_user_id: user.id,
        event_type: action === 'acknowledge' ? 'security_alert_acknowledged' : 'security_alert_resolved',
        metadata: { alert_id: alertId, action },
      });

      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'Action failed');
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
    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/5">
      {!acknowledged && (
        <button
          onClick={() => handleAction('acknowledge')}
          disabled={loading}
          className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-lg bg-[#142850] text-[#D4AF37] border border-[#D4AF37]/30 hover:bg-[#D4AF37]/20 transition disabled:opacity-50"
        >
          <Eye className="w-3.5 h-3.5" /> Acknowledge
        </button>
      )}

      <button
        onClick={() => handleAction('resolve')}
        disabled={loading}
        className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-lg bg-emerald-950/50 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600/30 transition disabled:opacity-50"
      >
        <CheckCircle2 className="w-3.5 h-3.5" /> Mark Resolved
      </button>

      {error && <span className="text-[11px] text-red-400">{error}</span>}
    </div>
  );
}
