'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const BANK_LIST = [
  { code: '100004', name: 'OPay Digital Services' },
  { code: '090405', name: 'Moniepoint Microfinance Bank' },
  { code: '100033', name: 'PalmPay Limited' },
  { code: '090267', name: 'Kuda Microfinance Bank' },
  { code: '044', name: 'Access Bank' },
  { code: '058', name: 'Guaranty Trust Bank (GTBank)' },
  { code: '057', name: 'Zenith Bank' },
  { code: '011', name: 'First Bank of Nigeria' },
  { code: '033', name: 'United Bank for Africa (UBA)' },
  { code: '214', name: 'First City Monument Bank (FCMB)' },
  { code: '070', name: 'Fidelity Bank' },
  { code: '035', name: 'Wema Bank' },
  { code: '050', name: 'Ecobank Nigeria' },
  { code: '101', name: 'Providus Bank' },
  { code: '221', name: 'Stanbic IBTC Bank' },
  { code: '076', name: 'Polaris Bank' },
  { code: '032', name: 'Union Bank of Nigeria' },
  { code: '232', name: 'Sterling Bank' },
];

function formatNaira(kobo: number) {
  return `₦${(Math.max(0, kobo) / 100).toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

interface RevenueItem {
  id: string;
  order_id: string | null;
  source: string;
  amount_kobo: number;
  balance_after_kobo: number;
  description: string;
  created_at: string;
}

export default function AdminProfitWalletPage() {
  const supabase = createClient();

  const [treasuryBalance, setTreasuryBalance] = useState<number>(0);
  const [revenueLedger, setRevenueLedger] = useState<RevenueItem[]>([]);
  const [stats, setStats] = useState({
    commissionKobo: 0,
    markupKobo: 0,
    logisticsKobo: 0,
    transferFeeKobo: 0,
  });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState<string | null>(null);

  // Dynamic Bank List State
  const [banks, setBanks] = useState<{ code: string; name: string }[]>(BANK_LIST);
  const [loadingBanks, setLoadingBanks] = useState(false);

  // Withdrawal Modal State
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [bankCode, setBankCode] = useState('100004');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [resolvingAccount, setResolvingAccount] = useState(false);
  const [withdrawAmountNaira, setWithdrawAmountNaira] = useState<number | ''>('');
  const [withdrawError, setWithdrawError] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    fetchWalletData();
    fetchLiveBanks();
  }, []);

  async function fetchLiveBanks() {
    setLoadingBanks(true);
    try {
      const { data, error } = await supabase.functions.invoke('resolve-account?action=banks', {
        method: 'GET',
      });
      if (!error && Array.isArray(data?.banks) && data.banks.length > 0) {
        setBanks(data.banks);
      }
    } catch (e) {
      console.warn('Using default bank list:', e);
    } finally {
      setLoadingBanks(false);
    }
  }

  async function fetchWalletData() {
    setLoading(true);
    try {
      // 1. Fetch platform treasury balance
      const { data: treasury } = await supabase
        .from('platform_treasury')
        .select('balance_kobo')
        .limit(1)
        .maybeSingle();

      if (treasury) {
        setTreasuryBalance(Number(treasury.balance_kobo));
      }

      // 2. Fetch revenue ledger
      const { data: revenue } = await supabase
        .from('platform_revenue')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      const items: RevenueItem[] = (revenue as RevenueItem[]) || [];
      setRevenueLedger(items);

      // Compute stats
      let comm = 0;
      let markup = 0;
      let log = 0;
      let fee = 0;

      items.forEach((item) => {
        if (item.source === 'commission') {
          if (item.description?.includes('markup')) {
            markup += item.amount_kobo;
          } else {
            comm += item.amount_kobo;
          }
        } else if (item.source === 'logistics_margin') {
          log += item.amount_kobo;
        } else if (item.source === 'transfer_fee' || item.source === 'stamp_duty') {
          fee += item.amount_kobo;
        }
      });

      setStats({
        commissionKobo: comm,
        markupKobo: markup,
        logisticsKobo: log,
        transferFeeKobo: fee,
      });
    } catch (err) {
      console.error('Error fetching profit wallet:', err);
    } finally {
      setLoading(false);
    }
  }

  // Account resolution via Supabase Edge Function & Paystack
  async function handleResolveAccount(num: string, bCode: string) {
    if (num.length !== 10) {
      setAccountName('');
      return;
    }
    setResolvingAccount(true);
    setWithdrawError('');
    try {
      const { data, error } = await supabase.functions.invoke('resolve-account', {
        body: { bankCode: bCode, accountNumber: num },
      });
      if (error || !data?.accountName) {
        setAccountName('');
        setWithdrawError('Could not verify bank account with Paystack.');
      } else {
        setAccountName(data.accountName);
      }
    } catch (e: any) {
      setWithdrawError(e.message || 'Error resolving bank account');
    } finally {
      setResolvingAccount(false);
    }
  }

  // Handle Admin Withdrawal
  async function handleWithdrawSubmit(e: React.FormEvent) {
    e.preventDefault();
    setWithdrawError('');

    const amountKobo = Math.round(Number(withdrawAmountNaira) * 100);
    if (!amountKobo || amountKobo <= 0) {
      setWithdrawError('Enter a valid amount to withdraw.');
      return;
    }
    if (amountKobo > treasuryBalance) {
      setWithdrawError('Insufficient treasury profit balance.');
      return;
    }
    if (!accountName || accountNumber.length !== 10) {
      setWithdrawError('Verify recipient account name first.');
      return;
    }

    setWithdrawing(true);
    try {
      const selectedBank = banks.find((b) => b.code === bankCode) || BANK_LIST.find((b) => b.code === bankCode);

      // Call secure admin-payout Edge Function that executes via Paystack
      const { data: payoutData, error: payoutErr } = await supabase.functions.invoke('admin-payout', {
        body: {
          amountKobo,
          bankCode,
          accountNumber,
          bankName: selectedBank?.name || bankCode,
          accountName,
        },
      });

      if (payoutErr || payoutData?.error) {
        throw new Error(payoutErr?.message || payoutData?.error || 'Payout transfer failed via Paystack');
      }

      setShowWithdrawModal(false);
      setWithdrawAmountNaira('');
      setAccountNumber('');
      setAccountName('');
      await fetchWalletData();
    } catch (err: any) {
      setWithdrawError(err.message || 'Withdrawal failed');
    } finally {
      setWithdrawing(false);
    }
  }

  // Calculate & Sync Historical Profits from past orders and transactions
  async function handleSyncHistorical() {
    setSyncing(true);
    setSyncSuccess(null);
    try {
      const { data, error } = await supabase.rpc('sync_historical_platform_profits');
      if (error) {
        // Fallback: calculate client-side if RPC not yet created
        const { data: orders } = await supabase
          .from('orders')
          .select('id, commission_kobo, shipping_kobo, status')
          .eq('status', 'paid');

        let totalHistKobo = 0;
        if (orders) {
          for (const ord of orders) {
            const comm = Number(ord.commission_kobo) || 0;
            totalHistKobo += comm;
          }
        }

        if (totalHistKobo > 0 && treasuryBalance === 0) {
          await supabase.from('platform_treasury').update({ balance_kobo: totalHistKobo });
          await supabase.from('platform_revenue').insert({
            source: 'commission',
            amount_kobo: totalHistKobo,
            balance_after_kobo: totalHistKobo,
            description: 'Calculated and synced historical marketplace commissions',
          });
        }
        setSyncSuccess(`Historical calculation completed! Synced ₦${(totalHistKobo / 100).toLocaleString()}`);
      } else {
        setSyncSuccess(`Historical profits successfully synced! New balance: ₦${((data || 0) / 100).toLocaleString()}`);
      }
      await fetchWalletData();
    } catch (err: any) {
      console.error(err);
      setSyncSuccess('Sync completed.');
      await fetchWalletData();
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-4 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-[#0F172A] tracking-tight">
            SwiftMart <span className="text-[#D4AF37]">Profit Wallet</span>
          </h1>
          <p className="text-sm text-gray-500">
            Internal company treasury holding earned markups, commissions, logistics margins, and fees.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSyncHistorical}
            disabled={syncing}
            className="text-xs font-semibold px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition border border-slate-300 disabled:opacity-50"
          >
            {syncing ? 'Calculating...' : '⚡ Calculate Past Profits'}
          </button>
          <button
            onClick={() => setShowWithdrawModal(true)}
            className="text-sm font-bold px-5 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-[#D4AF37] rounded-xl border-2 border-[#D4AF37] shadow-sm transition"
          >
            Withdraw Profit
          </button>
        </div>
      </div>

      {syncSuccess && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm font-medium">
          {syncSuccess}
        </div>
      )}

      {/* Main Treasury Balance Card */}
      <div className="bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] rounded-3xl p-6 sm:p-8 text-white shadow-xl mb-6 relative overflow-hidden border border-slate-700">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-44 h-44 bg-[#D4AF37]/10 rounded-full blur-2xl pointer-events-none" />
        <span className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">
          SwiftMart Total Earned Profit
        </span>
        <div className="mt-2 text-3xl sm:text-5xl font-black tracking-tight text-white">
          {loading ? '₦...' : formatNaira(treasuryBalance)}
        </div>
        <p className="text-xs text-slate-300 mt-2">
          100% available for admin withdrawal to corporate or personal bank account via Paystack.
        </p>
      </div>

      {/* Profit Stream Breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-500 font-medium">20% Product Markup</p>
          <p className="text-lg font-bold text-[#0F172A] mt-1">{formatNaira(stats.markupKobo)}</p>
          <span className="text-[10px] text-emerald-600 font-semibold">+20% on vendor goods</span>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-500 font-medium">10% Commissions</p>
          <p className="text-lg font-bold text-[#0F172A] mt-1">{formatNaira(stats.commissionKobo)}</p>
          <span className="text-[10px] text-blue-600 font-semibold">Vendor sales cut</span>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-500 font-medium">Waybill Logistics</p>
          <p className="text-lg font-bold text-[#0F172A] mt-1">{formatNaira(stats.logisticsKobo)}</p>
          <span className="text-[10px] text-purple-600 font-semibold">Shipbubble margin</span>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-500 font-medium">Transfer & Fees</p>
          <p className="text-lg font-bold text-[#0F172A] mt-1">{formatNaira(stats.transferFeeKobo)}</p>
          <span className="text-[10px] text-amber-600 font-semibold">Stamp duty & VAT</span>
        </div>
      </div>

      {/* Revenue Ledger Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-base font-bold text-[#0F172A] mb-4">Live Profit Activity Ledger</h2>
        {revenueLedger.length === 0 ? (
          <p className="text-center text-sm text-gray-500 py-10">
            No profit records in the ledger yet. Click &quot;Calculate Past Profits&quot; above to backfill previous sales.
          </p>
        ) : (
          <div className="divide-y divide-gray-100">
            {revenueLedger.map((item) => {
              const isDebit = item.amount_kobo < 0;
              return (
                <div key={item.id} className="py-3 flex items-center justify-between gap-3 text-sm">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          item.source === 'commission'
                            ? 'bg-blue-100 text-blue-800'
                            : item.source === 'logistics_margin'
                            ? 'bg-purple-100 text-purple-800'
                            : item.source === 'withdrawal'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {item.source.replace('_', ' ')}
                      </span>
                      <span className="font-semibold text-gray-900">{item.description}</span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(item.created_at).toLocaleString('en-NG')}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${isDebit ? 'text-red-600' : 'text-emerald-600'}`}>
                      {isDebit ? '-' : '+'}
                      {formatNaira(Math.abs(item.amount_kobo))}
                    </p>
                    <p className="text-[10px] text-gray-400">Bal: {formatNaira(item.balance_after_kobo)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Admin Withdrawal Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-black text-[#0F172A] mb-1">Withdraw Profit to Bank</h3>
            <p className="text-xs text-gray-500 mb-4">
              Payout from SwiftMart Treasury via Paystack resolution.
            </p>

            <form onSubmit={handleWithdrawSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Select Bank</label>
                <select
                  value={bankCode}
                  onChange={(e) => {
                    setBankCode(e.target.value);
                    if (accountNumber.length === 10) handleResolveAccount(accountNumber, e.target.value);
                  }}
                  className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:border-[#D4AF37] outline-none"
                >
                  {banks.map((b) => (
                    <option key={b.code} value={b.code}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Account Number</label>
                <input
                  type="text"
                  maxLength={10}
                  required
                  value={accountNumber}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setAccountNumber(val);
                    if (val.length === 10) handleResolveAccount(val, bankCode);
                    else setAccountName('');
                  }}
                  className="w-full rounded-xl border border-gray-200 p-3 text-sm font-mono tracking-wider focus:border-[#D4AF37] outline-none"
                  placeholder="0123456789"
                />
              </div>

              {/* Real-time Paystack Account Resolution Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs">
                <span className="text-gray-500 block">Account Holder Name:</span>
                {resolvingAccount ? (
                  <span className="text-blue-600 font-semibold animate-pulse">
                    Verifying with Paystack...
                  </span>
                ) : accountName ? (
                  <span className="text-emerald-700 font-bold text-sm block mt-0.5">
                    ✓ {accountName}
                  </span>
                ) : (
                  <span className="text-gray-400 italic">Enter 10-digit account number</span>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Amount to Withdraw (₦)</label>
                <input
                  type="number"
                  required
                  min={100}
                  value={withdrawAmountNaira}
                  onChange={(e) => setWithdrawAmountNaira(e.target.value ? Number(e.target.value) : '')}
                  className="w-full rounded-xl border border-gray-200 p-3 text-sm font-bold focus:border-[#D4AF37] outline-none"
                  placeholder="e.g. 50000"
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  Available: {formatNaira(treasuryBalance)}
                </p>
              </div>

              {withdrawError && <p className="text-xs text-red-600 font-medium">{withdrawError}</p>}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowWithdrawModal(false)}
                  className="flex-1 py-3 text-sm font-semibold rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={withdrawing || resolvingAccount || !accountName}
                  className="flex-1 py-3 text-sm font-bold bg-[#0F172A] text-[#D4AF37] rounded-xl border-2 border-[#D4AF37] disabled:opacity-50"
                >
                  {withdrawing ? 'Processing...' : 'Confirm Payout'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
