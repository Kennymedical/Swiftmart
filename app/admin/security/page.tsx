import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { AlertTriangle, ShieldCheck, ShieldAlert, Info, Lock } from 'lucide-react';
import { AlertActions } from './AlertActions';

export const dynamic = 'force-dynamic';

const SEVERITY_STYLES: Record<string, string> = {
  critical: 'bg-red-500/15 text-red-300 border-red-500/40',
  high: 'bg-orange-500/15 text-orange-300 border-orange-500/40',
  medium: 'bg-[#D4AF37]/15 text-[#F5C445] border-[#D4AF37]/40',
  low: 'bg-[#142850] text-[#A8B0C5] border-[#D4AF37]/20',
};

export default async function AdminSecurityPage({
  searchParams,
}: {
  searchParams?: { severity?: string; status?: string };
}) {
  const supabase = createClient();

  const severityFilter = searchParams?.severity ?? '';
  const statusFilter = searchParams?.status ?? 'open';

  let query = supabase
    .from('security_alerts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (severityFilter && ['low', 'medium', 'high', 'critical'].includes(severityFilter)) {
    query = query.eq('severity', severityFilter);
  }
  if (statusFilter === 'open') {
    query = query.eq('resolved', false);
  } else if (statusFilter === 'resolved') {
    query = query.eq('resolved', true);
  }

  const { data: alerts } = await query;

  // Account context: look up profile + vendor records for the alert users
  const userIds = Array.from(new Set((alerts ?? []).map((a) => a.user_id).filter(Boolean))) as string[];
  const { data: profiles } = userIds.length
    ? await supabase.from('profiles').select('id, email, role').in('id', userIds)
    : { data: [] };
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  // Related PIN recovery activity for each alert user
  const { data: resetActivity } = userIds.length
    ? await supabase
        .from('pin_reset_requests')
        .select('id, user_id, role, status, payment_status, failed_otp_attempts, created_at, otp_expires_at, used_at, completed_at')
        .in('user_id', userIds)
        .order('created_at', { ascending: false })
        .limit(200)
    : { data: [] };
  const resetsByUser = new Map<string, typeof resetActivity>();
  (resetActivity ?? []).forEach((r) => {
    const list = resetsByUser.get(r.user_id) ?? [];
    list.push(r);
    resetsByUser.set(r.user_id, list);
  });

  const severityTabs = [
    { key: '', label: 'All Severities' },
    { key: 'critical', label: 'Critical' },
    { key: 'high', label: 'High' },
    { key: 'medium', label: 'Medium' },
    { key: 'low', label: 'Low' },
  ];

  const statusTabs = [
    { key: 'open', label: 'Open' },
    { key: 'resolved', label: 'Resolved' },
    { key: 'all', label: 'All' },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-black text-[#D4AF37] tracking-wide flex items-center gap-2">
          <ShieldAlert className="w-5 h-5" /> Security Alerts
        </h1>
        <p className="text-xs text-[#A8B0C5] mt-1">
          Live monitoring of PIN recovery failures, lockouts, rate-limit abuse, and fee anomalies.
        </p>
      </div>

      {/* Severity + status filters */}
      <div className="flex flex-col gap-2">
        <div className="flex gap-2 overflow-x-auto scrollbar-none">
          {severityTabs.map((tab) => {
            const isActive = severityFilter === tab.key;
            const href = tab.key
              ? `/admin/security?severity=${tab.key}&status=${statusFilter}`
              : `/admin/security?status=${statusFilter}`;
            return (
              <Link
                key={tab.label}
                href={href}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg border whitespace-nowrap transition ${
                  isActive
                    ? 'text-[#D4AF37] bg-[#142850] border-[#D4AF37]/40'
                    : 'text-[#A8B0C5] bg-[#0A1931] border-[#D4AF37]/20 hover:text-[#F5C445]'
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
        <div className="flex gap-2">
          {statusTabs.map((tab) => {
            const isActive = statusFilter === tab.key;
            const href = `/admin/security?severity=${severityFilter}&status=${tab.key}`;
            return (
              <Link
                key={tab.label}
                href={href}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
                  isActive
                    ? 'text-[#E8C874] bg-[#1B2F5E] border-[#D4AF37]/40'
                    : 'text-[#8A94B0] border-[#D4AF37]/15 hover:text-[#E8C874]'
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>

      {!alerts || alerts.length === 0 ? (
        <div className="rounded-2xl border border-[#D4AF37]/25 bg-[#0F2140] p-8 text-center">
          <ShieldCheck className="w-10 h-10 mx-auto text-[#D4AF37] mb-3" />
          <p className="text-sm text-[#A8B0C5]">No alerts match the current filters. All clear.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => {
            const profile = alert.user_id ? profileMap.get(alert.user_id) : null;
            const resets = alert.user_id ? resetsByUser.get(alert.user_id) ?? [] : [];
            return (
              <div
                key={alert.id}
                className="rounded-2xl border border-[#D4AF37]/25 bg-gradient-to-br from-[#0F2140] to-[#0A1931] p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {alert.severity === 'critical' ? (
                      <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    ) : alert.severity === 'medium' ? (
                      <Info className="w-5 h-5 text-[#F5C445] shrink-0 mt-0.5" />
                    ) : (
                      <Lock className="w-4 h-4 text-[#A8B0C5] shrink-0 mt-1" />
                    )}
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${SEVERITY_STYLES[alert.severity] ?? SEVERITY_STYLES.low}`}>
                          {alert.severity}
                        </span>
                        <span className="text-sm font-bold text-white">{alert.alert_type.replace(/_/g, ' ')}</span>
                        {alert.resolved ? (
                          <span className="text-[10px] font-bold text-emerald-300 border border-emerald-400/40 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                            Resolved
                          </span>
                        ) : alert.acknowledged_at ? (
                          <span className="text-[10px] font-bold text-[#D4AF37] border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-2 py-0.5 rounded-full">
                            Acknowledged
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-orange-300 border border-orange-400/40 bg-orange-500/10 px-2 py-0.5 rounded-full">
                            New
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#A8B0C5] mt-1">
                        {new Date(alert.created_at).toLocaleString('en-NG')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Account context */}
                <div className="rounded-xl bg-[#0B1528] border border-white/10 p-3 text-xs space-y-1">
                  <div className="flex justify-between gap-4">
                    <span className="text-[#A8B0C5]">Account</span>
                    <span className="font-semibold text-white truncate">{profile?.email ?? 'Unknown account'}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-[#A8B0C5]">Role</span>
                    <span className="font-semibold text-[#F5C445] capitalize">{profile?.role ?? 'unknown'}</span>
                  </div>
                  {alert.details?.email ? (
                    <div className="flex justify-between gap-4">
                      <span className="text-[#A8B0C5]">Recovery email used</span>
                      <span className="font-semibold text-white truncate">{alert.details.email}</span>
                    </div>
                  ) : null}
                </div>

                {/* Related PIN recovery activity */}
                {resets.length > 0 && (
                  <div className="text-xs">
                    <p className="text-[#A8B0C5] font-bold uppercase tracking-wider text-[10px] mb-2">
                      Related PIN Recovery Activity
                    </p>
                    <div className="space-y-1.5">
                      {resets.slice(0, 3).map((r) => (
                        <div
                          key={r.id}
                          className="flex items-center justify-between rounded-lg bg-[#142850]/60 border border-[#D4AF37]/15 px-3 py-2"
                        >
                          <span className="text-[#A8B0C5]">
                            {r.role} · {r.failed_otp_attempts} failed attempt(s) · fee {r.payment_status}
                          </span>
                          <span className="font-semibold text-[#E8C874]">
                            {r.completed_at ? 'Completed' : r.used_at ? 'Used' : 'Pending'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Acknowledge / resolve with audit trail */}
                <AlertActions alertId={alert.id} acknowledged={!!alert.acknowledged_at} resolved={!!alert.resolved} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
