'use client';

import { extractAdminPayoutError } from '@/lib/error-utils';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Wallet,
  ArrowUpRight,
  RefreshCw,
  TrendingUp,
  Percent,
  Truck,
  Receipt,
  AlertCircle,
  CheckCircle2,
  Lock,
  X
} from 'lucide-react';

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

      // Compute stats dynamically from platform_revenue
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

  // Account resolution via Paystack
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
      setWithdrawError('Please enter and verify a valid 10-digit NUBAN account.');
      return;
    }

    setWithdrawing(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-withdraw', {
        body: {
          amount_kobo: amountKobo,
          bank_code: bankCode,
          account_number: accountNumber,
          account_name: accountName,
        },
      });

      if (error) {
        const parsed = await extractAdminPayoutError(error);
        throw new Error(parsed);
      }

      setShowWithdrawModal(false);
      setAccountNumber('');
      setAccountName('');
      setWithdrawAmountNaira('');
      setSyncSuccess('Treasury withdrawal initiated successfully through Paystack.');
      await fetchWalletData();
    } catch (err: any) {
      setWithdrawError(err.message || 'Withdrawal request failed');
    } finally {
      setWithdrawing(false);
    }
  }

  // Historical sync
  async function handleSyncPastProfits() {
    setSyncing(true);
    setSyncSuccess(null);
    try {
      const { data, error } = await supabase.rpc('sync_historical_platform_profits');
      if (error) throw error;
      setSyncSuccess('Historical ledger successfully computed and credited to treasury.');
      await fetchWalletData();
    } catch (e: any) {
      console.error('Error syncing past profits:', e);
      setSyncSuccess(`Sync note: ${e.message || 'Already synchronized.'}`);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Title & Subtitle */}
      <div>
        <h1 className="text-2xl font-black text-[#D4AF37] uppercase tracking-wider flex items-center gap-2">
          <Wallet className="w-6 h-6 text-[#D4AF37]" /> SwiftMart Profit Wallet
        </h1>
        <p className="text-xs text-[#A8B0C5] mt-1">
          Internal treasury holding earned markups and fees.
        </p>
      </div>

      {syncSuccess && (
        <div className="p-3.5 rounded-2xl bg-green-950/60 border border-green-500/40 text-green-300 text-xs flex items-center gap-2">
          <CheckCircle2 size={16} className="shrink-0 text-green-400" />
          <span>{syncSuccess}</span>
        </div>
      )}

      {/* Hero Section: Primary Balance Card & Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
        <div className="md:col-span-2 bg-gradient-to-br from-[#142850] via-[#162D5A] to-[#1B2F5E] border border-[#D4AF37]/35 rounded-3xl p-6 shadow-[0_8px_30px_rgba(212,175,55,0.08)] flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-black uppercase tracking-widest text-[#D4AF37]">
              TOTAL EARNED PROFIT
            </div>
            <div className="text-4xl sm:text-5xl font-black tracking-tight text-white mt-2">
              {formatNaira(treasuryBalance)}
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Available for withdrawal.</span>
          </div>
        </div>

        {/* Action Buttons: Clear Visual Hierarchy */}
        <div className="bg-[#0A152B]/80 border border-white/10 rounded-3xl p-5 flex flex-col justify-center gap-3">
          <button
            onClick={() => setShowWithdrawModal(true)}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-[#F2D57E] to-[#D4A937] text-[#0A1931] font-black text-sm rounded-2xl shadow-lg hover:opacity-95 transition flex items-center justify-center gap-2 active:scale-[0.99]"
          >
            <ArrowUpRight size={18} strokeWidth={2.5} />
            <span>Withdraw Profit</span>
          </button>

          <button
            onClick={handleSyncPastProfits}
            disabled={syncing}
            className="w-full py-3 px-4 border border-[#D4AF37]/40 text-[#D4AF37] hover:bg-[#D4AF37]/10 font-bold text-xs rounded-2xl transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />
            <span>{syncing ? 'Calculating...' : 'Calculate Past'}</span>
          </button>
        </div>
      </div>

      {/* Breakdown: 4 High-Density Cards */}
      <div>
        <div className="text-xs uppercase tracking-wider font-bold text-[#A8B0C5] mb-3">
          Breakdown
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-[#142850]/50 border border-white/10 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-[#A8B0C5] text-[11px] font-semibold mb-1">
              <span>Markup</span>
              <TrendingUp size={14} className="text-[#D4AF37]" />
            </div>
            <div className="text-lg sm:text-xl font-bold text-white">
              {formatNaira(stats.markupKobo)}
            </div>
          </div>

          <div className="bg-[#142850]/50 border border-white/10 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-[#A8B0C5] text-[11px] font-semibold mb-1">
              <span>Comm.</span>
              <Percent size={14} className="text-blue-400" />
            </div>
            <div className="text-lg sm:text-xl font-bold text-white">
              {formatNaira(stats.commissionKobo)}
            </div>
          </div>

          <div className="bg-[#142850]/50 border border-white/10 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-[#A8B0C5] text-[11px] font-semibold mb-1">
              <span>Logistics</span>
              <Truck size={14} className="text-purple-400" />
            </div>
            <div className="text-lg sm:text-xl font-bold text-white">
              {formatNaira(stats.logisticsKobo)}
            </div>
          </div>

          <div className="bg-[#142850]/50 border border-white/10 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-[#A8B0C5] text-[11px] font-semibold mb-1">
              <span>Fees</span>
              <Receipt size={14} className="text-amber-400" />
            </div>
            <div className="text-lg sm:text-xl font-bold text-white">
              {formatNaira(stats.transferFeeKobo)}
            </div>
          </div>
        </div>
      </div>

      {/* Refined Activity Logs: Styled Badges instead of Raw Technical Strings */}
      <div className="bg-[#142850]/40 border border-[#D4AF37]/25 rounded-3xl overflow-hidden shadow-xl">
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#D4AF37] uppercase tracking-wider">
            Treasury Ledger & Revenue Stream
          </h2>
          <span className="text-[11px] text-[#A8B0C5]">Last 100 Transactions</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#F5F7FA]">
            <thead className="bg-[#0A152B] border-b border-white/10 uppercase font-bold text-[#A8B0C5] text-[10px]">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-right">Balance After</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-[#A8B0C5]">
                    Loading profit records...
                  </td>
                </tr>
              ) : revenueLedger.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-[#A8B0C5]">
                    No revenue recorded yet.
                  </td>
                </tr>
              ) : (
                revenueLedger.map((row) => (
                  <tr key={row.id} className="hover:bg-white/[0.02] transition">
                    <td className="px-4 py-3 text-[#A8B0C5] whitespace-nowrap">
                      {new Date(row.created_at).toLocaleString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      {row.source === 'commission' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                          Sales Commission
                        </span>
                      ) : row.source === 'logistics_margin' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          Waybill Margin
                        </span>
                      ) : row.source === 'withdrawal' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30">
                          Admin Cashout
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#D4AF37]/20 text-[#F5C445] border border-[#D4AF37]/30">
                          Platform Fee
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#F5F7FA] font-medium max-w-xs truncate">
                      {row.description}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-white whitespace-nowrap">
                      +{formatNaira(row.amount_kobo)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-[#A8B0C5] whitespace-nowrap">
                      {formatNaira(row.balance_after_kobo)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admin Withdrawal Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md bg-gradient-to-b from-[#142850] to-[#0A1931] border border-[#D4AF37]/40 rounded-3xl p-6 shadow-2xl text-[#F5F7FA]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[#D4AF37] uppercase tracking-wider">
                Withdraw Treasury Profit
              </h3>
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="p-1 rounded-full text-[#A8B0C5] hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {withdrawError && (
              <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{withdrawError}</span>
              </div>
            )}

            <form onSubmit={handleWithdrawSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#A8B0C5] mb-1">
                  Destination Bank
                </label>
                <select
                  value={bankCode}
                  onChange={(e) => {
                    setBankCode(e.target.value);
                    if (accountNumber.length === 10) {
                      handleResolveAccount(accountNumber, e.target.value);
                    }
                  }}
                  className="w-full bg-[#0A152B] border border-[#D4AF37]/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                >
                  {banks.map((b) => (
                    <option key={b.code} value={b.code}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A8B0C5] mb-1">
                  Account Number (10 Digits)
                </label>
                <input
                  type="text"
                  maxLength={10}
                  required
                  value={accountNumber}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/\D/g, '');
                    setAccountNumber(clean);
                    if (clean.length === 10) {
                      handleResolveAccount(clean, bankCode);
                    } else {
                      setAccountName('');
                    }
                  }}
                  placeholder="0123456789"
                  className="w-full bg-[#0A152B] border border-[#D4AF37]/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              {resolvingAccount && (
                <div className="text-xs text-[#D4AF37] animate-pulse">
                  Verifying account with Paystack...
                </div>
              )}

              {accountName && (
                <div className="p-2.5 rounded-xl bg-[#0F2140] border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-400" />
                  <span>{accountName}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#A8B0C5] mb-1">
                  Amount in Naira (₦)
                </label>
                <input
                  type="number"
                  min="100"
                  step="any"
                  required
                  value={withdrawAmountNaira}
                  onChange={(e) => setWithdrawAmountNaira(Number(e.target.value) || '')}
                  placeholder="e.g. 50000"
                  className="w-full bg-[#0A152B] border border-[#D4AF37]/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowWithdrawModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-white/20 text-xs font-semibold text-[#A8B0C5] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={withdrawing || !accountName || !withdrawAmountNaira}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#F2D57E] to-[#D4A937] text-[#0A1931] font-bold text-xs disabled:opacity-50"
                >
                  {withdrawing ? 'Processing...' : 'Confirm Cashout'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
