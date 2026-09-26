import { createClient } from '@/lib/supabase/server';
import { PayoutActions } from './PayoutActions';

// Nigerian Bank Code dictionary for NIBSS/Paystack resolution
const BANK_CODE_MAP: Record<string, string> = {
  '090551': 'FairMoney Microfinance Bank',
  '090267': 'Kuda Microfinance Bank',
  '090405': 'Moniepoint Microfinance Bank',
  '100004': 'OPay Digital Services',
  '100033': 'PalmPay Limited',
  '044': 'Access Bank',
  '023': 'Citibank Nigeria',
  '050': 'Ecobank Nigeria',
  '070': 'Fidelity Bank',
  '011': 'First Bank of Nigeria',
  '214': 'First City Monument Bank (FCMB)',
  '058': 'Guaranty Trust Bank (GTBank)',
  '030': 'Heritage Bank',
  '082': 'Keystone Bank',
  '076': 'Polaris Bank',
  '101': 'Providus Bank',
  '221': 'Stanbic IBTC Bank',
  '068': 'Standard Chartered Bank',
  '232': 'Sterling Bank',
  '100': 'Suntrust Bank',
  '032': 'Union Bank of Nigeria',
  '033': 'United Bank for Africa (UBA)',
  '215': 'Unity Bank',
  '035': 'Wema Bank',
  '057': 'Zenith Bank',
};

function resolveBankName(bankName?: string, bankCode?: string): string {
  if (bankName && bankName.trim()) return bankName;
  if (bankCode && BANK_CODE_MAP[bankCode]) return BANK_CODE_MAP[bankCode];
  if (bankCode) return `Bank Code: ${bankCode}`;
  return 'Unknown Bank';
}

export default async function AdminPayoutsPage() {
  const supabase = createClient();

  const { data: payouts } = await supabase
    .from('transactions')
    .select('id, amount_kobo, description, metadata, created_at, wallet_id')
    .eq('type', 'payout')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  const walletIds = [...new Set((payouts ?? []).map((p) => p.wallet_id))];
  const { data: wallets } = walletIds.length
    ? await supabase.from('wallets').select('id, user_id').in('id', walletIds)
    : { data: [] };
  const userIds = [...new Set((wallets ?? []).map((w) => w.user_id))];
  const { data: profiles } = userIds.length
    ? await supabase.from('profiles').select('id, username, full_name').in('id', userIds)
    : { data: [] };

  const walletToUser = new Map((wallets ?? []).map((w) => [w.id, w.user_id]));
  const userToProfile = new Map((profiles ?? []).map((p) => [p.id, p]));

  return (
    <div className="max-w-2xl mx-auto p-4">
      {(!payouts || payouts.length === 0) ? (
        <p className="text-center text-gray-500 py-16">No pending payouts.</p>
      ) : (
        <div className="space-y-4">
          {payouts.map((payout) => {
            const requesterId = walletToUser.get(payout.wallet_id);
            const requester = requesterId ? userToProfile.get(requesterId) : null;
            const meta = payout.metadata as {
              bankCode?: string;
              bankName?: string;
              accountNumber?: string;
              accountName?: string;
            } | null;

            const displayBankName = resolveBankName(meta?.bankName, meta?.bankCode);

            return (
              <div key={payout.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-bold text-[#0F172A] text-base">
                      {requester?.full_name ?? requester?.username ?? 'Unknown user'}
                    </p>
                    <p className="text-xs text-gray-500">
                      @{requester?.username ?? '—'} • {new Date(payout.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-[#0F172A]">
                      ₦{(payout.amount_kobo / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                    <span className="inline-block px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[10px] font-bold mt-1">
                      PENDING APPROVAL
                    </span>
                  </div>
                </div>

                {/* Bank Transfer Details Card */}
                <div className="bg-gray-50 rounded-xl p-3.5 mb-4 text-sm space-y-2 border border-gray-100">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Bank Name:</span>
                    <span className="font-bold text-[#0F172A] text-right">
                      {displayBankName} {meta?.bankCode ? `(${meta.bankCode})` : ''}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Account Number:</span>
                    <span className="font-mono font-bold text-blue-600 tracking-wider">
                      {meta?.accountNumber ?? '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Account Name:</span>
                    <span className="font-semibold text-gray-900 text-right">
                      {meta?.accountName ?? '—'}
                    </span>
                  </div>
                </div>

                <PayoutActions transactionId={payout.id} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
    }
    
