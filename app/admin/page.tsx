import { createClient } from '@/lib/supabase/server';
import { DollarSign, Store, Package, ArrowUpRight, Clock, ShieldCheck, Lock } from 'lucide-react';
import Link from 'next/link';
import { AdminTrendCharts } from '@/components/admin/AdminTrendCharts';

function naira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default async function AdminOverviewPage() {
  const supabase = createClient();

  const [
    { data: wallets },
    { count: pendingVendors },
    { count: pendingProducts },
    { count: pendingPayouts },
    { data: recentTxns },
    { data: escrowOrders },
    { data: historicalTxns },
    { data: historicalVendors },
  ] = await Promise.all([
    supabase.from('wallets').select('balance_kobo'),
    supabase.from('vendors').select('id', { count: 'exact', head: true }).in('status', ['pending', 'under_review']),
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
    supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('type', 'payout').eq('status', 'pending'),
    supabase
      .from('transactions')
      .select('id, type, status, amount_kobo, description, created_at')
      .order('created_at', { ascending: false })
      .limit(25),
    supabase
      .from('orders')
      .select('total_kobo')
      .in('status', ['paid', 'processing', 'shipped']),
    supabase
      .from('transactions')
      .select('amount_kobo, type, status, created_at')
      .order('created_at', { ascending: true })
      .limit(500),
    supabase
      .from('vendors')
      .select('created_at, status')
      .order('created_at', { ascending: true })
      .limit(200),
  ]);

  const totalUserBalances = (wallets ?? []).reduce((sum, w) => sum + w.balance_kobo, 0);
  const totalEscrowKobo = (escrowOrders ?? []).reduce((sum, o) => sum + (o.total_kobo || 0), 0);

  // Group trend data by day for charts
  const dayMap = new Map<string, { liabilityKobo: number; vendorApprovals: number; payoutKobo: number }>();
  
  // Seed last 14 days
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    dayMap.set(dateStr, { liabilityKobo: totalUserBalances, vendorApprovals: 0, payoutKobo: 0 });
  }

  (historicalTxns ?? []).forEach((t) => {
    const dateStr = t.created_at.split('T')[0];
    if (dayMap.has(dateStr)) {
      const entry = dayMap.get(dateStr)!;
      if (t.type === 'payout' && (t.status === 'success' || t.status === 'completed')) {
        entry.payoutKobo += Math.abs(t.amount_kobo);
      }
    }
  });

  (historicalVendors ?? []).forEach((v) => {
    const dateStr = v.created_at.split('T')[0];
    if (dayMap.has(dateStr)) {
      const entry = dayMap.get(dateStr)!;
      entry.vendorApprovals += 1;
    }
  });

  const trendData = Array.from(dayMap.entries()).map(([date, val]) => ({
    date,
    liabilityKobo: val.liabilityKobo,
    vendorApprovals: val.vendorApprovals,
    payoutKobo: val.payoutKobo,
  }));

  const totalPayoutsKobo = (historicalTxns ?? [])
    .filter((t) => t.type === 'payout' && (t.status === 'success' || t.status === 'completed'))
    .reduce((sum, t) => sum + Math.abs(t.amount_kobo), 0);

  const stats = [
    {
      label: 'Platform User Liability',
      sublabel: 'Aggregated user & vendor wallet balances',
      value: naira(totalUserBalances),
      icon: DollarSign,
      href: '/admin/wallet',
      actionText: 'View Treasury',
    },
    {
      label: 'Funds Held in Escrow',
      sublabel: 'Active customer orders pending delivery',
      value: naira(totalEscrowKobo),
      icon: Lock,
      href: '/admin/orders',
      actionText: 'View Escrow Orders',
    },
    {
      label: 'Pending Vendor Approvals',
      sublabel: 'Awaiting KYC and merchant verification',
      value: pendingVendors ?? 0,
      icon: Store,
      href: '/admin/vendors',
      actionText: 'Review Vendors',
    },
    {
      label: 'Pending Payout Requests',
      sublabel: 'Vendor withdrawals awaiting disbursement',
      value: pendingPayouts ?? 0,
      icon: Clock,
      href: '/admin/payouts',
      actionText: 'Process Payouts',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner Overview */}
      <div className="bg-gradient-to-r from-[#142850] via-[#1B2F5E] to-[#142850] border border-[#D4AF37]/30 rounded-2xl p-5 sm:p-6 shadow-[0_4px_25px_rgba(212,175,55,0.08)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#D4AF37] uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-[#D4AF37]" /> Operational Command Center
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-[#F5F7FA] mt-1">
            SwiftMart System Pulse
          </h2>
          <p className="text-xs sm:text-sm text-[#A8B0C5] mt-0.5">
            Real-time multi-vendor activity, escrow tracking, and treasury reconciliation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/wallet"
            className="px-4 py-2 text-xs font-bold bg-gradient-to-r from-[#F2D57E] to-[#D4A937] text-[#0A1931] rounded-xl shadow-[0_0_15px_rgba(212,175,55,0.2)] hover:opacity-95 transition"
          >
            Open Profit Treasury
          </Link>
        </div>
      </div>

      {/* 4 Primary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="bg-gradient-to-br from-[#142850] to-[#1B2F5E] border border-[#D4AF37]/25 rounded-2xl p-5 shadow-[0_4px_20px_rgba(212,175,55,0.08)] flex flex-col justify-between transition hover:border-[#D4AF37]/50"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="p-2 rounded-xl bg-[#0F2140] border border-[#D4AF37]/20 text-[#D4AF37]">
                    <Icon className="w-4 h-4" />
                  </span>
                  <Link
                    href={s.href}
                    className="text-[11px] font-semibold text-[#D4AF37] hover:underline flex items-center gap-0.5"
                  >
                    {s.actionText}
                    <ArrowUpRight className="w-3 h-3" />
                  </Link>
                </div>
                <p className="text-2xl sm:text-3xl font-black text-[#D4AF37] tracking-tight">{s.value}</p>
                <p className="text-xs font-bold text-[#F5EAC2] mt-1 uppercase tracking-wide">{s.label}</p>
              </div>
              <p className="text-[11px] text-[#A8B0C5] mt-3 pt-3 border-t border-[#D4AF37]/15">
                {s.sublabel}
              </p>
            </div>
          );
        })}
      </div>

      {/* Date-Range Trend Charts Section */}
      <AdminTrendCharts
        trendData={trendData}
        totalLiabilityKobo={totalUserBalances}
        totalPayoutsKobo={totalPayoutsKobo}
        totalNewVendors={(historicalVendors ?? []).length}
      />

      {/* Structured Real-Time Activity Log */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#D4AF37]">
            Recent Platform Transactions
          </h2>
          <span className="text-xs text-[#A8B0C5]">
            Showing latest {Math.min(25, (recentTxns ?? []).length)} entries
          </span>
        </div>
        <div className="bg-gradient-to-br from-[#142850] to-[#1B2F5E] border border-[#D4AF37]/25 rounded-2xl shadow-[0_4px_20px_rgba(212,175,55,0.08)] divide-y divide-[#D4AF37]/15 overflow-hidden">
          {(recentTxns ?? []).length === 0 ? (
            <p className="p-8 text-center text-[#A8B0C5] text-sm">No live transactions recorded yet.</p>
          ) : (
            (recentTxns ?? []).map((t) => {
              const isSuccess = t.status === 'success' || t.status === 'completed';
              return (
                <div key={t.id} className="flex justify-between items-center p-4 hover:bg-white/[0.02] transition">
                  <div>
                    <p className="text-sm font-semibold text-[#F5F7FA]">{t.description}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-[#A8B0C5]">
                      <span className="capitalize px-2 py-0.5 rounded-md bg-[#0F2550] border border-[#D4AF37]/20 text-[#E8C874]">
                        {t.type}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                          isSuccess
                            ? 'bg-[#142850] text-[#2ED573] border border-[#2ED573]/30'
                            : 'bg-[#142850] text-[#F59E0B] border border-[#F59E0B]/30'
                        }`}
                      >
                        {t.status}
                      </span>
                      <span>· {new Date(t.created_at).toLocaleString('en-NG')}</span>
                    </div>
                  </div>
                  <p className="text-sm sm:text-base font-bold text-[#D4AF37]">{naira(t.amount_kobo)}</p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
