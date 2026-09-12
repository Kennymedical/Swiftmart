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
    <div className="max-w-2xl mx-auto p-4">
      <div className="grid grid-cols-2 gap-3 mb-6">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl shadow-sm p-4">
            <p className="text-2xl font-bold text-[#0F172A]">{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {payoutAccount.number && (
        <div className="bg-[#0F172A] rounded-2xl p-4 mb-6">
          <p className="text-xs text-slate-400 mb-2">SwiftMart Payouts — External Account</p>
          <p className="text-white font-semibold">{payoutAccount.bank}</p>
          <p className="text-[#D4AF37] text-lg font-bold tracking-wide">{payoutAccount.number}</p>
          <p className="text-slate-300 text-sm">{payoutAccount.name}</p>
        </div>
      )}

      <h2 className="text-sm font-semibold text-gray-500 mb-2 px-1">Recent activity</h2>
      <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
        {(recentTxns ?? []).length === 0 && (
          <p className="p-4 text-center text-gray-400 text-sm">No transactions yet.</p>
        )}
        {(recentTxns ?? []).map((t) => (
          <div key={t.id} className="flex justify-between items-center p-3">
            <div>
              <p className="text-sm font-medium text-gray-900">{t.description}</p>
              <p className="text-xs text-gray-400">
                {t.type} · {t.status} · {new Date(t.created_at).toLocaleString()}
              </p>
            </div>
            <p className="text-sm font-semibold text-[#0F172A]">{naira(t.amount_kobo)}</p>
          </div>
        ))}
      </div>
    </div>
  );
  }
