import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Info,
  Lock,
  Search,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
} from 'lucide-react';
import { AlertActions } from './AlertActions';
import { AlertTimeline, TimelineEvent } from './AlertTimeline';
import { ExportCSVButton } from './ExportCSVButton';
import { RealtimeAlertsListener } from './RealtimeAlertsListener';

export const dynamic = 'force-dynamic';

const SEVERITY_STYLES: Record<string, string> = {
  critical: 'bg-red-500/15 text-red-300 border-red-500/40',
  high: 'bg-orange-500/15 text-orange-300 border-orange-500/40',
  medium: 'bg-[#D4AF37]/15 text-[#F5C445] border-[#D4AF37]/40',
  low: 'bg-[#142850] text-[#A8B0C5] border-[#D4AF37]/20',
};

const PAGE_SIZE = 10;

export default async function AdminSecurityPage({
  searchParams,
}: {
  searchParams?: {
    severity?: string;
    status?: string;
    q?: string;
    page?: string;
  };
}) {
  const supabase = createClient();

  // Strict Server-Side Authorization: Only full administrators allowed
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/admin/login?session_expired=true&redirect=/admin/security');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || profile.role !== 'admin') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#142850] border-2 border-red-500/40 rounded-2xl p-6 text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 mx-auto rounded-full bg-red-950/60 border border-red-500/50 flex items-center justify-center text-red-400">
            <ShieldAlert size={28} />
          </div>
          <h2 className="text-lg font-bold text-white">Administrative Access Required</h2>
          <p className="text-xs text-[#A8B0C5] leading-relaxed">
            Viewing and managing security alerts is restricted strictly to full administrators.
          </p>
          <Link
            href="/admin"
            className="inline-block px-4 py-2 bg-[#0A1931] border border-[#D4AF37]/40 text-[#D4AF37] text-xs font-bold rounded-xl hover:bg-[#D4AF37]/10 transition"
          >
            Return to Admin Overview
          </Link>
        </div>
      </div>
    );
  }

  const severityFilter = searchParams?.severity ?? '';
  const statusFilter = searchParams?.status ?? 'open';
  const searchQuery = (searchParams?.q ?? '').trim().toLowerCase();
  const currentPage = Math.max(1, parseInt(searchParams?.page ?? '1', 10) || 1);
  const offset = (currentPage - 1) * PAGE_SIZE;

  let matchedUserIds: string[] | null = null;
  if (searchQuery) {
    const { data: matchedProfiles } = await supabase
      .from('profiles')
      .select('id')
      .ilike('email', `%${searchQuery}%`);
    matchedUserIds = (matchedProfiles ?? []).map((p) => p.id);
  }

  let query = supabase
    .from('security_alerts')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (severityFilter && ['low', 'medium', 'high', 'critical'].includes(severityFilter)) {
    query = query.eq('severity', severityFilter);
  }
  if (statusFilter === 'open') {
    query = query.eq('resolved', false);
  } else if (statusFilter === 'resolved') {
    query = query.eq('resolved', true);
  }

  if (searchQuery) {
    if (matchedUserIds && matchedUserIds.length > 0) {
      query = query.or(
        `user_id.in.(${matchedUserIds.join(',')}),details->>email.ilike.%${searchQuery}%`
      );
    } else {
      query = query.ilike('details->>email', `%${searchQuery}%`);
    }
  }

  const { data: alerts, count: totalCount } = await query.range(offset, offset + PAGE_SIZE - 1);
  const totalPages = Math.ceil((totalCount ?? 0) / PAGE_SIZE) || 1;

  const userIds = Array.from(new Set((alerts ?? []).map((a) => a.user_id).filter(Boolean))) as string[];
  const adminIds = Array.from(
    new Set((alerts ?? []).flatMap((a) => [a.acknowledged_by, a.resolved_by]).filter(Boolean))
  ) as string[];
  const allUserIdsToFetch = Array.from(new Set([...userIds, ...adminIds]));

  const { data: profiles } = allUserIdsToFetch.length
    ? await supabase.from('profiles').select('id, email, role').in('id', allUserIdsToFetch)
    : { data: [] };
  const profileMap: Record<string, { email: string; role: string }> = {};
  (profiles ?? []).forEach((p) => {
    profileMap[p.id] = { email: p.email, role: p.role };
  });

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

  const buildQueryUrl = (params: Record<string, string | number>) => {
    const p = new URLSearchParams();
    const merged = {
      severity: severityFilter,
      status: statusFilter,
      q: searchQuery,
      page: currentPage,
      ...params,
    };
    Object.entries(merged).forEach(([k, v]) => {
      if (v) p.set(k, String(v));
    });
    return `/admin/security?${p.toString()}`;
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-black text-[#D4AF37] tracking-wide flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-[#D4AF37]" /> Security Alerts
            </h1>
            <RealtimeAlertsListener />
          </div>
          <p className="text-xs text-[#A8B0C5] mt-1">
            Real-time audit monitoring of PIN recovery failures, lockouts, rate-limit abuse, and fee anomalies.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <ExportCSVButton
            alerts={alerts ?? []}
            profileMap={profileMap}
            filters={{ severity: severityFilter, status: statusFilter, q: searchQuery }}
          />

          {/* Email Search Form */}
          <form method="GET" action="/admin/security" className="relative w-full sm:w-72">
            {severityFilter && <input type="hidden" name="severity" value={severityFilter} />}
            {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#D4AF37]" />
            <input
              type="text"
              name="q"
              defaultValue={searchQuery}
              placeholder="Search by account email..."
              className="w-full bg-[#0A152B] border border-[#D4AF37]/35 text-xs text-white placeholder-[#8A94B0] rounded-xl pl-9 pr-8 py-2 focus:outline-none focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37] transition"
            />
            {searchQuery && (
              <Link
                href={buildQueryUrl({ q: '', page: 1 })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8A94B0] hover:text-white"
              >
                ×
              </Link>
            )}
          </form>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-col gap-2">
        <div className="flex gap-2 overflow-x-auto scrollbar-none">
          {severityTabs.map((tab) => {
            const isActive = severityFilter === tab.key;
            return (
              <Link
                key={tab.label}
                href={buildQueryUrl({ severity: tab.key, page: 1 })}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg border whitespace-nowrap transition ${
                  isActive
                    ? 'text-[#D4AF37] bg-[#142850] border-[#D4AF37]/40 shadow-sm'
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
            return (
              <Link
                key={tab.label}
                href={buildQueryUrl({ status: tab.key, page: 1 })}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
                  isActive
                    ? 'text-[#E8C874] bg-[#1B2F5E] border-[#D4AF37]/40 shadow-sm'
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
          <p className="text-sm font-semibold text-white">No security alerts found</p>
          <p className="text-xs text-[#A8B0C5] mt-1">
            {searchQuery
              ? `No records matching "${searchQuery}" with the current filters.`
              : 'All recovery systems and authentication vectors are clear.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => {
            const profile = alert.user_id ? profileMap[alert.user_id] : null;
            const resets = alert.user_id ? resetsByUser.get(alert.user_id) ?? [] : [];
            const ackAdmin = alert.acknowledged_by ? profileMap[alert.acknowledged_by] : null;
            const resAdmin = alert.resolved_by ? profileMap[alert.resolved_by] : null;

            // Formulate events for AlertTimeline with date-range filter
            const alertCreatedEvent: TimelineEvent = {
              id: `alert_created_${alert.id}`,
              timestamp: alert.created_at,
              type: 'alert_created',
              title: `${alert.alert_type.replace(/_/g, ' ')} Flagged`,
              description: 'Automated surveillance triggered this security alert',
            };

            const recoveryEvents: TimelineEvent[] = resets.map((r) => ({
              id: `pin_recovery_${r.id}`,
              timestamp: r.created_at,
              type: 'pin_recovery',
              title: `PIN Recovery Request (${r.role})`,
              description: `Failed attempts: ${r.failed_otp_attempts}/3 · Fee: ${r.payment_status} · Status: ${r.completed_at ? 'Completed' : r.used_at ? 'Used' : 'Active'}`,
            }));

            const acknowledgedEvent: TimelineEvent | null = alert.acknowledged_at
              ? {
                  id: `ack_${alert.id}`,
                  timestamp: alert.acknowledged_at,
                  type: 'acknowledged',
                  title: 'Acknowledged by Admin',
                  description: `Reviewed by ${ackAdmin?.email ?? 'System Administrator'}`,
                }
              : null;

            const resolvedEvent: TimelineEvent | null = alert.resolved_at
              ? {
                  id: `res_${alert.id}`,
                  timestamp: alert.resolved_at,
                  type: 'resolved',
                  title: 'Marked Resolved',
                  description: `Resolution recorded by ${resAdmin?.email ?? 'System Administrator'}`,
                }
              : null;

            return (
              <div
                key={alert.id}
                className="rounded-2xl border border-[#D4AF37]/25 bg-gradient-to-br from-[#0F2140] to-[#0A1931] p-4 sm:p-5 space-y-4 shadow-md"
              >
                {/* Header Row */}
                <div className="flex items-start justify-between gap-3 flex-wrap">
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
                        <span
                          className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                            SEVERITY_STYLES[alert.severity] ?? SEVERITY_STYLES.low
                          }`}
                        >
                          {alert.severity}
                        </span>
                        <span className="text-sm font-bold text-white capitalize">
                          {alert.alert_type.replace(/_/g, ' ')}
                        </span>
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
                            New Alert
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#A8B0C5] mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#D4AF37]" />
                        Detected: {new Date(alert.created_at).toLocaleString('en-NG')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Account Context */}
                <div className="rounded-xl bg-[#0B1528] border border-white/10 p-3 text-xs space-y-1.5">
                  <div className="flex justify-between gap-4">
                    <span className="text-[#A8B0C5] flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-[#D4AF37]" /> Account Email
                    </span>
                    <span className="font-semibold text-white truncate">
                      {profile?.email ?? alert.details?.email ?? 'Unknown account'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-[#A8B0C5]">Account Role</span>
                    <span className="font-semibold text-[#F5C445] capitalize">
                      {profile?.role ?? 'unknown'}
                    </span>
                  </div>
                </div>

                {/* Per-Alert Timeline with Date-Range Filter */}
                <AlertTimeline
                  alertCreatedEvent={alertCreatedEvent}
                  recoveryEvents={recoveryEvents}
                  acknowledgedEvent={acknowledgedEvent}
                  resolvedEvent={resolvedEvent}
                />

                {/* Acknowledge / Resolve Actions */}
                <AlertActions
                  alertId={alert.id}
                  acknowledged={!!alert.acknowledged_at}
                  resolved={!!alert.resolved}
                />
              </div>
            );
          })}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-[#D4AF37]/20 text-xs text-[#A8B0C5]">
              <div>
                Showing page <span className="text-white font-bold">{currentPage}</span> of{' '}
                <span className="text-white font-bold">{totalPages}</span> ({totalCount} total alerts)
              </div>
              <div className="flex gap-2">
                {currentPage > 1 ? (
                  <Link
                    href={buildQueryUrl({ page: currentPage - 1 })}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#142850] text-[#D4AF37] border border-[#D4AF37]/30 hover:bg-[#D4AF37]/20 transition"
                  >
                    <ChevronLeft className="w-4 h-4" /> Previous
                  </Link>
                ) : (
                  <span className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#142850]/40 text-[#8A94B0] border border-white/5 cursor-not-allowed">
                    <ChevronLeft className="w-4 h-4" /> Previous
                  </span>
                )}

                {currentPage < totalPages ? (
                  <Link
                    href={buildQueryUrl({ page: currentPage + 1 })}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#142850] text-[#D4AF37] border border-[#D4AF37]/30 hover:bg-[#D4AF37]/20 transition"
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <span className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#142850]/40 text-[#8A94B0] border border-white/5 cursor-not-allowed">
                    Next <ChevronRight className="w-4 h-4" />
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
