import { createClient } from '@/lib/supabase/server';

function naira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString('en-NG')}`;
}

export default async function AdminOverviewPage() {
  const supabase = createClient();

  const [
    { data: wallets },
    { count: pendingVendors },
    { count: pendingProducts },
    { count: pendingPayouts },
    { data: recentTxns },
  ] = await Promise.all([
    supabase.from('wallets').select('balance_kobo'),
    supabase.from('vendors').select('id', { count: 'exact', head: true }).in('status', ['pending', 'under_review']),
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
    supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('type', 'payout').eq('status', 'pending'),
    supabase
      .from('transactions')
      .select('id, type, status, amount_kobo, description, created_at')
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  const totalUserBalances = (wallets ?? []).reduce((sum, w) => sum + w.balance_kobo, 0);

  const stats = [
    { label: 'Owed to users', value: naira(totalUserBalances) },
    { label: 'Pending vendors', value: pendingVendors ?? 0 },
    { label: 'Pending products', value: pendingProducts ?? 0 },
    { label: 'Pending payouts', value: pendingPayouts ?? 0 },
  ];

  const payoutAccount = {
    bank: process.env.PAYOUT_BANK_NAME,
    number: process.env.PAYOUT_ACCOUNT_NUMBER,
    name: process.env.PAYOUT_ACCOUNT_NAME,
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 gap-3.5">
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-gradient-to-br from-[#142850] to-[#1B2F5E] border border-[#D4AF37]/25 rounded-2xl shadow-[0_4px_20px_rgba(212,175,55,0.08)] p-4 transition-all"
          >
            <p className="text-2xl font-black text-[#D4AF37]">{s.value}</p>
            <p className="text-xs font-medium text-[#A8B0C5] mt-1 uppercase tracking-wide">{s.label}</p>
          </div>
        ))}
      </div>

      {payoutAccount.number && (
        <div className="bg-gradient-to-br from-[#142850] to-[#1B2F5E] border border-[#D4AF37]/30 rounded-2xl shadow-[0_4px_20px_rgba(212,175,55,0.08)] p-5">
          <p className="text-xs font-semibold text-[#A8B0C5] mb-2 uppercase tracking-wider">
            SwiftMart Payouts — External Account
          </p>
          <p className="text-[#F5F7FA] font-bold text-base">{payoutAccount.bank}</p>
          <p className="text-[#E8C874] text-xl font-black tracking-wider mt-0.5">{payoutAccount.number}</p>
          <p className="text-[#A8B0C5] text-sm mt-0.5">{payoutAccount.name}</p>
        </div>
      )}

      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#D4AF37] mb-3 px-1">
          Recent Activity
        </h2>
        <div className="bg-gradient-to-br from-[#142850] to-[#1B2F5E] border border-[#D4AF37]/25 rounded-2xl shadow-[0_4px_20px_rgba(212,175,55,0.08)] divide-y divide-[#D4AF37]/10 overflow-hidden">
          {(recentTxns ?? []).length === 0 && (
            <p className="p-5 text-center text-[#A8B0C5] text-sm">No transactions yet.</p>
          )}
          {(recentTxns ?? []).map((t) => {
            const isSuccess = t.status === 'success' || t.status === 'completed';
            return (
              <div key={t.id} className="flex justify-between items-center p-3.5 hover:bg-white/[0.02] transition">
                <div>
                  <p className="text-sm font-semibold text-[#F5F7FA]">{t.description}</p>
                  <p className="text-xs text-[#A8B0C5] mt-0.5">
                    <span className="capitalize">{t.type}</span> ·{' '}
                    <span className={isSuccess ? 'text-[#2ED573] font-semibold' : 'text-[#D4AF37] font-semibold'}>
                      {t.status}
                    </span>{' '}
                    · {new Date(t.created_at).toLocaleString()}
                  </p>
                </div>
                <p className="text-sm font-bold text-[#D4AF37]">{naira(t.amount_kobo)}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
