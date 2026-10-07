import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ShieldAlert, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { ExportCSVButton } from './ExportCSVButton';
import { RealtimeAlertsListener } from './RealtimeAlertsListener';
import { SecurityAlertsClientView } from './SecurityAlertsClientView';

export const dynamic = 'force-dynamic';

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

  if (severityFilter) {
    query = query.eq('severity', severityFilter);
  }

  if (statusFilter === 'open') {
    query = query.eq('resolved', false);
  } else if (statusFilter === 'resolved') {
    query = query.eq('resolved', true);
  }

  if (searchQuery) {
    if (matchedUserIds && matchedUserIds.length > 0) {
      query = query.in('user_id', matchedUserIds);
    } else {
      query = query.eq('user_id', '00000000-0000-0000-0000-000000000000');
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
        .select('id, user_id, role, failed_otp_attempts, payment_status, used_at, completed_at, created_at')
        .in('user_id', userIds)
        .order('created_at', { ascending: false })
    : { data: [] };

  const resetsByUser: Record<string, any[]> = {};
  (resetActivity ?? []).forEach((r) => {
    const list = resetsByUser[r.user_id] ?? [];
    list.push(r);
    resetsByUser[r.user_id] = list;
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

  const buildQueryUrl = (params: Record<string, string | number | undefined>) => {
    const current: Record<string, string> = {};
    if (severityFilter) current.severity = severityFilter;
    if (statusFilter && statusFilter !== 'open') current.status = statusFilter;
    if (searchQuery) current.q = searchQuery;
    if (currentPage > 1) current.page = String(currentPage);

    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === '') delete current[k];
      else current[k] = String(v);
    });

    const sp = new URLSearchParams(current);
    const qs = sp.toString();
    return qs ? `/admin/security?${qs}` : '/admin/security';
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
            const active = severityFilter === tab.key;
            return (
              <Link
                key={tab.key}
                href={buildQueryUrl({ severity: tab.key, page: 1 })}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition shrink-0 ${
                  active
                    ? 'bg-[#D4AF37] text-[#0A1931] border-[#D4AF37]'
                    : 'bg-[#142850] text-[#A8B0C5] border-[#D4AF37]/20 hover:border-[#D4AF37]/50'
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>

        <div className="flex gap-2 border-b border-white/5 pb-2">
          {statusTabs.map((tab) => {
            const active = statusFilter === tab.key;
            return (
              <Link
                key={tab.key}
                href={buildQueryUrl({ status: tab.key, page: 1 })}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                  active
                    ? 'bg-white/10 text-[#D4AF37]'
                    : 'text-[#8A94B0] hover:text-[#A8B0C5]'
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Client List with Batch Multi-Select and Notifications Jumping */}
      <SecurityAlertsClientView
        alerts={alerts ?? []}
        profileMap={profileMap}
        resetsByUser={resetsByUser}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-white/5 text-xs">
          <span className="text-[#8A94B0]">
            Showing {Math.min(totalCount ?? 0, offset + 1)}–{Math.min(totalCount ?? 0, offset + PAGE_SIZE)} of {totalCount ?? 0} alerts
          </span>
          <div className="flex items-center gap-2">
            <Link
              href={buildQueryUrl({ page: currentPage - 1 })}
              className={`p-2 rounded-lg border border-[#D4AF37]/20 bg-[#142850] ${
                currentPage <= 1 ? 'opacity-40 pointer-events-none' : 'hover:border-[#D4AF37]'
              }`}
            >
              <ChevronLeft className="w-4 h-4 text-[#D4AF37]" />
            </Link>
            <span className="text-white font-semibold">
              {currentPage} / {totalPages}
            </span>
            <Link
              href={buildQueryUrl({ page: currentPage + 1 })}
              className={`p-2 rounded-lg border border-[#D4AF37]/20 bg-[#142850] ${
                currentPage >= totalPages ? 'opacity-40 pointer-events-none' : 'hover:border-[#D4AF37]'
              }`}
            >
              <ChevronRight className="w-4 h-4 text-[#D4AF37]" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
