'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Eye, EyeOff, Bell, User, Plus, Send, Download, QrCode, Building2, Phone, Wifi, Receipt, Users, CreditCard, ChevronRight, Home, ArrowLeftRight, Wallet, History, ArrowUpRight, ArrowDownLeft, Clock } from 'lucide-react';

export default function UserWalletPage() {
  const router = useRouter();
  const supabase = createClient();

  const [showBalance, setShowBalance] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'in' | 'out'>('all');
  const [wallet, setWallet] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login');

      const { data: w } = await supabase.from('wallets').select('*').eq('user_id', user.id).single();
      if (w) {
        setWallet(w);
        const { data: tx } = await supabase.from('transactions').select('*').eq('wallet_id', w.id).order('created_at', { ascending: false }).limit(20);
        if (tx) setTransactions(tx);
      }
      setLoading(false);
    })();
  }, []);

  const balanceNaira = wallet ? (wallet.balance_kobo || 0) / 100 : 0;
  const filtered = transactions.filter(t => {
    const isIn = ['fund', 'deposit', 'escrow_release', 'transfer_in'].includes(t.type);
    return activeTab === 'all' ? true : activeTab === 'in' ? isIn : !isIn;
  });

  return (
    <div className="w-full min-h-screen bg-[#0A1028] text-white flex flex-col font-sans pb-24">
      

      <main className="flex-1 max-w-xl mx-auto w-full px-4 py-5 space-y-6">
        {/* Balance Card */}
        <div className="bg-[#151B3D] border border-[#D4AF37]/50 rounded-2xl p-5 shadow-xl shadow-[#D4AF37]/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#D4AF37] uppercase">Available Balance</span>
            <button onClick={() => setShowBalance(!showBalance)} className="text-[#A0A3B1]">{showBalance ? <Eye size={18} /> : <EyeOff size={18} />}</button>
          </div>
          <h2 className="text-3xl font-extrabold text-white mt-2">
            {loading ? <span className="text-gray-500 text-2xl animate-pulse">Loading...</span> : showBalance ? `₦${balanceNaira.toLocaleString('en-NG', { minimumFractionDigits: 2 })}` : '••••••••'}
          </h2>
          <div className="mt-4 pt-3 border-t border-[#D4AF37]/20 flex items-center justify-between text-xs">
            <span className="text-[#A0A3B1]">{wallet?.virtual_account_number ? `${wallet.virtual_account_bank || 'Wema'} • ${wallet.virtual_account_number}` : 'SwiftMART Active Wallet'}</span>
            <Link href="/wallet/fund" className="px-4 py-2 rounded-full bg-[#F5C445] text-black font-extrabold text-xs flex items-center gap-1">Add Money <Plus size={14} /></Link>
          </div>
        </div>

        {/* Quick Actions (with P2P Transfer & Bank) */}
        <section className="space-y-3">
          <div className="flex justify-between items-center"><h3 className="text-sm font-bold text-white">Quick Actions</h3><Link href="/wallet/history" className="text-xs text-[#D4AF37]">See all</Link></div>
          <div className="grid grid-cols-4 gap-2.5">
            {[
              { label: 'P2P Transfer', icon: ArrowLeftRight, href: '/wallet/send?mode=user' },
              { label: 'Bank Transfer', icon: Building2, href: '/wallet/send?mode=bank' },
              { label: 'Request Money', icon: Download, href: '/wallet/request' },
              { label: 'Scan QR', icon: QrCode, href: '/wallet/scan' },
              { label: 'Buy Airtime', icon: Phone, href: '/wallet/airtime' },
              { label: 'Buy Data', icon: Wifi, href: '/wallet/data' },
              { label: 'Pay Bills', icon: Receipt, href: '/wallet/bills' },
              { label: 'Split Bill', icon: Users, href: '/wallet/split' },
            ].map((a, i) => {
              const Icon = a.icon;
              return (
                <Link key={i} href={a.href} className="bg-[#151B3D] border border-[#D4AF37]/25 rounded-2xl p-3 flex flex-col items-center text-center hover:border-[#D4AF37] transition">
                  <div className="w-9 h-9 rounded-xl bg-[#0A1028] border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]"><Icon size={18} /></div>
                  <span className="text-[10px] text-white mt-2 leading-tight">{a.label}</span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Cards */}
        <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
          <div className="min-w-[240px] bg-gradient-to-br from-[#1E2652] to-[#0A1028] border border-[#D4AF37]/60 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
            <div className="flex justify-between"><span className="text-xs font-bold text-[#F5C445]">SwiftMART DEBIT</span><CreditCard size={18} className="text-[#D4AF37]" /></div>
            <p className="text-sm font-mono tracking-widest text-white my-4">•••• •••• •••• {wallet?.id ? wallet.id.slice(0, 4) : '4589'}</p>
            <div className="flex justify-between text-[10px] text-[#A0A3B1]"><span>EXP: 09/28</span><span className="text-[#F5C445]">VALID NGN</span></div>
          </div>
          <div className="min-w-[180px] border-2 border-dashed border-[#D4AF37]/40 rounded-2xl p-4 flex flex-col items-center justify-center bg-[#151B3D]/40">
            <CreditCard size={20} className="text-[#D4AF37] mb-1" />
            <p className="text-xs font-bold text-white">Physical Card</p>
            <p className="text-[10px] text-[#A0A3B1]">ATM & POS</p>
          </div>
        </div>

        {/* Transactions */}
        <section className="space-y-3">
          <div className="flex justify-between items-center"><h3 className="text-sm font-bold text-white">Transaction History</h3><Link href="/wallet/history" className="text-xs text-[#D4AF37]">View All</Link></div>
          <div className="flex bg-[#151B3D] border border-[#D4AF37]/20 rounded-xl p-1 text-xs">
            {(['all', 'in', 'out'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-1.5 rounded-lg font-bold capitalize ${activeTab === tab ? 'bg-[#F5C445] text-black' : 'text-[#A0A3B1]'}`}>{tab}</button>
            ))}
          </div>
          <div className="bg-[#151B3D] border border-[#D4AF37]/25 rounded-2xl divide-y divide-[#D4AF37]/10">
            {loading ? (
              <div className="p-5 text-center text-xs text-[#A0A3B1] animate-pulse">Loading transactions...</div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#A0A3B1] flex flex-col items-center gap-1"><Clock size={20} className="text-[#D4AF37]/50" />No transactions yet.</div>
            ) : (
              filtered.map(t => {
                const isIn = ['fund', 'deposit', 'escrow_release', 'transfer_in'].includes(t.type);
                return (
                  <div key={t.id} className="p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${isIn ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-400' : 'bg-red-950/50 border-red-500/40 text-red-400'}`}>
                        {isIn ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white capitalize">{t.description || t.type.replace('_', ' ')}</p>
                        <p className="text-[10px] text-[#A0A3B1]">{new Date(t.created_at).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-bold ${isIn ? 'text-emerald-400' : 'text-red-400'}`}>{isIn ? '+' : '-'}₦{(t.amount_kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
                      {t.status && t.status !== 'completed' && <p className="text-[9px] text-[#F5C445] uppercase">{t.status}</p>}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Security Links */}
        <section className="bg-[#151B3D] border border-[#D4AF37]/25 rounded-2xl divide-y divide-[#D4AF37]/10 text-xs">
          <Link href="/wallet/limits" className="p-3.5 flex items-center justify-between"><span className="font-semibold text-white">Spending Limits</span><ChevronRight size={16} className="text-[#D4AF37]" /></Link>
          <Link href="/wallet/history" className="p-3.5 flex items-center justify-between"><span className="font-semibold text-white">Account Statement</span><ChevronRight size={16} className="text-[#D4AF37]" /></Link>
        </section>
      </main>


    </div>
  );
}
