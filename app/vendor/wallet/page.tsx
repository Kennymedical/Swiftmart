'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { 
  Eye, 
  EyeOff, 
  Lock, 
  TrendingUp, 
  Bell, 
  User, 
  ArrowUpRight, 
  PlusCircle, 
  QrCode, 
  Building2, 
  History, 
  MessageSquare, 
  Sparkles, 
  Home, 
  ArrowLeftRight, 
  Wallet, 
  ShoppingBag, 
  Clock, 
  ArrowDownLeft 
} from 'lucide-react';

export const dynamic = 'force-dynamic';

function VendorWalletContent() {
  const router = useRouter();
  const supabase = createClient();

  const [showBalance, setShowBalance] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'in' | 'out'>('all');
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({ available: 0, escrow: 0, escrowOrders: 0, totalSales: 0, thisMonth: 0 });
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }

        const { data: vendor } = await supabase
          .from('vendors')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        const { data: wallet } = await supabase
          .from('wallets')
          .select('id, balance_kobo')
          .eq('user_id', user.id)
          .maybeSingle();

        let escrow = 0;
        let escrowOrders = 0;
        let sales = 0;
        let monthSales = 0;

        if (vendor) {
          const { data: items } = await supabase
            .from('order_items')
            .select('price_kobo, quantity, created_at, orders(status)')
            .eq('vendor_id', vendor.id);

          const startOfMonth = new Date();
          startOfMonth.setDate(1);
          startOfMonth.setHours(0, 0, 0, 0);

          (items || []).forEach((item: any) => {
            const total = (item.price_kobo || 0) * (item.quantity || 1);
            const st = Array.isArray(item.orders) ? item.orders[0]?.status : item.orders?.status;
            if (st === 'paid' || st === 'shipped') {
              escrow += total;
              escrowOrders += 1;
            }
            if (['paid', 'shipped', 'delivered'].includes(st)) {
              sales += total;
              if (new Date(item.created_at) >= startOfMonth) {
                monthSales += total;
              }
            }
          });
        }

        if (isMounted) {
          setMetrics({
            available: wallet?.balance_kobo ? wallet.balance_kobo / 100 : 0,
            escrow: escrow / 100,
            escrowOrders,
            totalSales: sales / 100,
            thisMonth: monthSales / 100,
          });

          if (wallet) {
            const { data: tx } = await supabase
              .from('transactions')
              .select('*')
              .eq('wallet_id', wallet.id)
              .order('created_at', { ascending: false })
              .limit(20);
            if (tx) setTransactions(tx);
          }
        }
      } catch (err) {
        console.error('Error loading vendor wallet:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const filtered = transactions.filter((t) => {
    const isIn = ['escrow_release', 'fund', 'deposit', 'wallet_funding', 'p2p_receive'].includes(t.type);
    return activeTab === 'all' ? true : activeTab === 'in' ? isIn : !isIn;
  });

  return (
    <div className="w-full min-h-screen bg-[#0A1028] text-white flex flex-col font-sans pb-24">
      {/* Header with VENDOR WALLET centered boldly */}
      <header className="sticky top-0 z-40 bg-[#0A1028]/95 backdrop-blur-md px-4 py-3.5 border-b border-[#D4AF37]/20 flex items-center justify-between">
        <Link href="/profile" className="p-2 rounded-full bg-[#151B3D] border border-[#D4AF37]/30 text-[#D4AF37]">
          <User size={18} />
        </Link>
        <h1 className="text-xl font-extrabold tracking-wider text-[#F5C445] uppercase">Vendor Wallet</h1>
        <Link href="/notifications" className="p-2 rounded-full bg-[#151B3D] border border-[#D4AF37]/30 text-[#D4AF37]">
          <Bell size={18} />
        </Link>
      </header>

      <main className="flex-1 max-w-xl mx-auto w-full px-4 py-5 space-y-6">
        {/* Balances */}
        <section className="space-y-3">
          <div className="bg-[#151B3D] border border-[#D4AF37]/50 rounded-2xl p-5 shadow-xl shadow-[#D4AF37]/5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#D4AF37] uppercase">Available Balance</span>
              <button onClick={() => setShowBalance(!showBalance)} className="text-[#A0A3B1]">
                {showBalance ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            </div>
            <h2 className="text-3xl font-extrabold text-white mt-2">
              {loading ? (
                <span className="text-gray-500 text-2xl animate-pulse">Loading...</span>
              ) : showBalance ? (
                `₦${metrics.available.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`
              ) : (
                '••••••••'
              )}
            </h2>
            <div className="mt-4 pt-3 border-t border-[#D4AF37]/20 flex items-center justify-between text-xs">
              <span className="text-emerald-400 font-bold">● Ready for payout</span>
              <Link
                href="/wallet/send?mode=bank"
                className="px-5 py-2 rounded-full bg-[#F5C445] text-black font-extrabold flex items-center gap-1 hover:brightness-110 active:scale-95 transition-all"
              >
                Withdraw <ArrowUpRight size={14} />
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#151B3D] border border-amber-500/40 rounded-2xl p-4">
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-[#D4AF37] font-semibold uppercase">Escrow Hold</span>
                <Lock size={14} className="text-[#D4AF37]" />
              </div>
              <p className="text-lg font-bold text-white mt-1">
                {showBalance ? `₦${metrics.escrow.toLocaleString('en-NG', { minimumFractionDigits: 2 })}` : '••••••••'}
              </p>
              <p className="text-[10px] text-[#A0A3B1] mt-0.5">{metrics.escrowOrders} orders held</p>
              <p className="text-[10px] text-amber-300/80 mt-2">🛡️ Releases on delivery</p>
            </div>
            <div className="bg-[#151B3D] border border-[#D4AF37]/30 rounded-2xl p-4">
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-[#D4AF37] font-semibold uppercase">Total Sales</span>
                <TrendingUp size={14} className="text-[#D4AF37]" />
              </div>
              <p className="text-lg font-bold text-white mt-1">
                {showBalance ? `₦${metrics.totalSales.toLocaleString('en-NG', { minimumFractionDigits: 2 })}` : '••••••••'}
              </p>
              <p className="text-[10px] text-[#A0A3B1] mt-0.5">Month: ₦{metrics.thisMonth.toLocaleString()}</p>
              <p className="text-[10px] text-emerald-400 mt-2">Live Store Gross</p>
            </div>
          </div>
        </section>

        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-2.5">
          {[
            { label: 'Withdraw', icon: ArrowUpRight, href: '/wallet/send?mode=bank' },
            { label: 'Orders', icon: ShoppingBag, href: '/vendor' },
            { label: 'Add Item', icon: PlusCircle, href: '/vendor/products/add' },
            { label: 'Transfer', icon: Building2, href: '/wallet/send' },
            { label: 'P2P Send', icon: ArrowLeftRight, href: '/wallet/send?mode=user' },
            { label: 'History', icon: History, href: '/wallet/history' },
            { label: 'Products', icon: Sparkles, href: '/products' },
            { label: 'Profile', icon: User, href: '/profile' },
          ].map((a, i) => {
            const Icon = a.icon;
            return (
              <Link
                key={i}
                href={a.href}
                className="bg-[#151B3D] border border-[#D4AF37]/25 hover:border-[#D4AF37]/60 rounded-2xl p-3 flex flex-col items-center text-center transition-all active:scale-95"
              >
                <div className="w-9 h-9 rounded-xl bg-[#0A1028] border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]">
                  <Icon size={18} />
                </div>
                <span className="text-[10px] text-white mt-2 leading-tight font-medium">{a.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Transaction History */}
        <section className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-white">Vendor Activity</h3>
            <Link href="/wallet/history" className="text-xs text-[#D4AF37] hover:underline">
              View All
            </Link>
          </div>
          <div className="flex bg-[#151B3D] border border-[#D4AF37]/20 rounded-xl p-1 text-xs">
            {(['all', 'in', 'out'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-1.5 rounded-lg font-bold capitalize transition-all ${
                  activeTab === tab ? 'bg-[#F5C445] text-black shadow-md' : 'text-[#A0A3B1]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="bg-[#151B3D] border border-[#D4AF37]/25 rounded-2xl divide-y divide-[#D4AF37]/10 overflow-hidden">
            {loading ? (
              <div className="p-5 text-center text-xs text-[#A0A3B1] animate-pulse">Loading vendor records...</div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#A0A3B1] flex flex-col items-center gap-1">
                <Clock size={20} className="text-[#D4AF37]/50" />
                No vendor transactions yet.
              </div>
            ) : (
              filtered.map((t) => {
                const isIn = ['escrow_release', 'fund', 'deposit', 'wallet_funding', 'p2p_receive'].includes(t.type);
                return (
                  <div key={t.id} className="p-3.5 flex items-center justify-between hover:bg-[#1A224B]/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center border ${
                          isIn
                            ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-400'
                            : 'bg-red-950/50 border-red-500/40 text-red-400'
                        }`}
                      >
                        {isIn ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white capitalize">{t.description || t.type.replace(/_/g, ' ')}</p>
                        <p className="text-[10px] text-[#A0A3B1]">
                          {new Date(t.created_at).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-bold ${isIn ? 'text-emerald-400' : 'text-red-400'}`}>
                        {isIn ? '+' : '-'}₦{(t.amount_kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                      </span>
                      {t.status && t.status !== 'completed' && t.status !== 'success' && (
                        <p className="text-[9px] text-[#F5C445] uppercase font-bold">{t.status}</p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </main>

      {/* DEDICATED FINTECH BOTTOM NAV */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0A1028]/95 backdrop-blur-md border-t border-[#D4AF37]/25 px-4 py-2 flex items-center justify-around">
        <Link href="/" className="flex flex-col items-center text-[#A0A3B1] hover:text-[#D4AF37]">
          <Home size={20} />
          <span className="text-[10px]">Home</span>
        </Link>
        <Link href="/wallet/send?mode=user" className="flex flex-col items-center text-[#A0A3B1] hover:text-[#D4AF37]">
          <ArrowLeftRight size={20} />
          <span className="text-[10px]">P2P</span>
        </Link>
        <Link href="/vendor/wallet" className="flex flex-col items-center text-[#F5C445]">
          <div className="p-1 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]">
            <Wallet size={18} />
          </div>
          <span className="text-[10px] font-bold">Wallet</span>
        </Link>
        <Link href="/wallet/history" className="flex flex-col items-center text-[#A0A3B1] hover:text-[#D4AF37]">
          <History size={20} />
          <span className="text-[10px]">Activity</span>
        </Link>
        <Link href="/vendor" className="flex flex-col items-center text-[#A0A3B1] hover:text-[#D4AF37]">
          <ShoppingBag size={20} />
          <span className="text-[10px]">Orders</span>
        </Link>
      </nav>
    </div>
  );
}

export default function VendorWalletScreen() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0A1028] text-white flex items-center justify-center">Loading...</div>}>
      <VendorWalletContent />
    </Suspense>
  );
}
