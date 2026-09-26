'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Eye, EyeOff, Lock, TrendingUp, Bell, User, ArrowUpRight, 
  BarChart3, PlusCircle, QrCode, Building2, History, MessageSquare, 
  Sparkles, CreditCard, Home, ShoppingBag, Store, ShieldCheck
} from 'lucide-react';

export default function VendorWalletScreen() {
  const [showBalance, setShowBalance] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'in' | 'out'>('all');

  return (
    <div className="w-full min-h-screen bg-[#0A1028] text-white flex flex-col font-sans pb-24 selection:bg-[#D4AF37] selection:text-black">
      {/* 1. STICKY HEADER */}
      <header className="sticky top-0 z-40 bg-[#0A1028]/95 backdrop-blur-md px-4 py-3.5 border-b border-[#D4AF37]/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#D4AF37] to-[#F5C445] flex items-center justify-center shadow-md">
            <ShieldCheck size={18} className="text-black" />
          </div>
          <span className="text-lg font-black tracking-wider text-[#F5C445]">SwiftMART</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/notifications" className="p-2 rounded-full bg-[#151B3D] border border-[#D4AF37]/30 text-[#D4AF37]">
            <Bell size={18} />
          </Link>
          <Link href="/profile" className="p-2 rounded-full bg-[#151B3D] border border-[#D4AF37]/30 text-[#D4AF37]">
            <User size={18} />
          </Link>
        </div>
      </header>

      {/* 2. MAIN SCROLLABLE CONTENT */}
      <main className="flex-1 w-full max-w-xl mx-auto px-4 py-5 space-y-6">
        
        {/* VENDOR 3 BALANCES SECTION */}
        <section className="space-y-3">
          {/* Card 1 - Hero Available Balance */}
          <div className="w-full bg-[#151B3D] border border-[#D4AF37]/50 rounded-2xl p-5 shadow-xl shadow-[#D4AF37]/5 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#D4AF37] uppercase tracking-wider">Available Balance</span>
              <button 
                onClick={() => setShowBalance(!showBalance)}
                className="text-[#A0A3B1] hover:text-white transition"
              >
                {showBalance ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            </div>

            <div className="mt-2 flex items-baseline justify-between">
              <h1 className="text-3xl font-extrabold text-white tracking-tight">
                {showBalance ? '₦84,250.50' : '••••••••'}
              </h1>
            </div>

            <div className="mt-4 pt-3 border-t border-[#D4AF37]/20 flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-[10px] font-bold text-emerald-400">
                ● Ready for payout
              </span>

              <Link
                href="/wallet/send"
                className="px-5 py-2 rounded-full bg-[#F5C445] hover:bg-[#D4AF37] text-black font-extrabold text-xs shadow-md shadow-[#D4AF37]/20 flex items-center gap-1.5 transition"
              >
                Withdraw <ArrowUpRight size={14} />
              </Link>
            </div>
          </div>

          {/* Cards 2 & 3: Side-by-side 2 Columns */}
          <div className="grid grid-cols-2 gap-3">
            {/* Card 2 - Escrow Balance */}
            <div className="bg-[#151B3D] border border-amber-500/40 rounded-2xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[#D4AF37] uppercase">Escrow Balance</span>
                  <Lock size={15} className="text-[#D4AF37]" />
                </div>
                <p className="text-lg font-bold text-white mt-1.5">
                  {showBalance ? '₦32,000.00' : '••••••'}
                </p>
                <p className="text-[10px] text-[#A0A3B1] mt-0.5">12 orders in escrow</p>
              </div>
              <p className="text-[10px] text-amber-300/80 mt-3 flex items-center gap-1">
                <span>🛡️</span> Releases after delivery
              </p>
            </div>

            {/* Card 3 - Total Sales */}
            <div className="bg-[#151B3D] border border-[#D4AF37]/30 rounded-2xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[#D4AF37] uppercase">Total Sales</span>
                  <TrendingUp size={15} className="text-[#D4AF37]" />
                </div>
                <p className="text-lg font-bold text-white mt-1.5">
                  {showBalance ? '₦1,250,000.00' : '••••••••'}
                </p>
                <p className="text-[10px] text-[#A0A3B1] mt-0.5">This month: ₦320,000</p>
              </div>
              <p className="text-[10px] text-emerald-400 mt-3 font-medium">
                +18.4% vs last month
              </p>
            </div>
          </div>
        </section>

        {/* 3. QUICK ACTIONS (4x2 Grid) */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">Quick Actions</h2>
            <button className="text-xs font-semibold text-[#D4AF37] hover:underline">See all</button>
          </div>

          <div className="grid grid-cols-4 gap-2.5">
            {[
              { label: 'Withdraw', icon: ArrowUpRight, href: '/wallet/send' },
              { label: 'Sales Report', icon: BarChart3, href: '/vendor/analytics' },
              { label: 'Add Product', icon: PlusCircle, href: '/vendor/products/new' },
              { label: 'Scan QR', icon: QrCode, href: '/wallet/scan' },
              { label: 'Bank Transfer', icon: Building2, href: '/wallet/send' },
              { label: 'History', icon: History, href: '/wallet/history' },
              { label: 'Customer Chat', icon: MessageSquare, href: '/messages' },
              { label: 'Boost Product', icon: Sparkles, href: '/vendor/marketing' },
            ].map((action, i) => {
              const Icon = action.icon;
              return (
                <Link
                  key={i}
                  href={action.href}
                  className="bg-[#151B3D] border border-[#D4AF37]/25 hover:border-[#D4AF37] rounded-2xl p-3 flex flex-col items-center justify-center text-center transition group"
                >
                  <div className="w-9 h-9 rounded-xl bg-[#0A1028] border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] group-hover:scale-105 transition">
                    <Icon size={18} />
                  </div>
                  <span className="text-[10px] text-white font-medium mt-2 leading-tight">
                    {action.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* 4. CARDS SECTION */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">Cards</h2>
            <button className="text-xs font-semibold text-[#D4AF37]">Manage</button>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
            {/* Virtual Card */}
            <div className="min-w-[240px] bg-gradient-to-br from-[#1E2652] via-[#151B3D] to-[#0A1028] border border-[#D4AF37]/60 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-[#F5C445] tracking-widest">SwiftMART VIRTUAL</span>
                <CreditCard size={18} className="text-[#D4AF37]" />
              </div>
              <p className="text-sm font-mono tracking-widest text-white my-4">•••• •••• •••• 4589</p>
              <div className="flex justify-between text-[10px] text-[#A0A3B1]">
                <span>EXP: 09/28</span>
                <span className="text-[#F5C445] font-semibold">VALID NGN</span>
              </div>
            </div>

            {/* Physical Card Order */}
            <div className="min-w-[200px] border-2 border-dashed border-[#D4AF37]/40 rounded-2xl p-4 flex flex-col items-center justify-center text-center bg-[#151B3D]/40">
              <CreditCard size={22} className="text-[#D4AF37] mb-2" />
              <p className="text-xs font-bold text-white">Physical Card</p>
              <p className="text-[10px] text-[#A0A3B1] mt-0.5">Order now for POS & ATM</p>
              <button className="mt-3 px-3 py-1 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37] text-[10px] font-bold text-[#F5C445]">
                Order Card
              </button>
            </div>
          </div>
        </section>

        {/* 5. TRANSACTION HISTORY */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">Transaction History</h2>
            <Link href="/wallet/history" className="text-xs font-semibold text-[#D4AF37]">View All</Link>
          </div>

          {/* Filter Tabs */}
          <div className="flex bg-[#151B3D] border border-[#D4AF37]/20 rounded-xl p-1 text-xs">
            {(['all', 'in', 'out'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-1.5 rounded-lg font-bold capitalize transition ${
                  activeTab === tab
                    ? 'bg-[#F5C445] text-black shadow-sm'
                    : 'text-[#A0A3B1] hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Transaction Rows */}
          <div className="bg-[#151B3D] border border-[#D4AF37]/25 rounded-2xl divide-y divide-[#D4AF37]/10">
            <div className="p-3.5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-white">Order #410 Delivered</p>
                <p className="text-[10px] text-[#A0A3B1]">Today, 11:20 AM</p>
              </div>
              <span className="text-xs font-bold text-emerald-400">+₦45,000.00</span>
            </div>

            <div className="p-3.5 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-bold text-white">Escrow Hold (Order #412)</p>
                  <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-[#F5C445] text-[9px] font-bold">
                    Pending
                  </span>
                </div>
                <p className="text-[10px] text-[#A0A3B1]">Today, 09:15 AM</p>
              </div>
              <span className="text-xs font-bold text-amber-300">₦12,000.00</span>
            </div>

            <div className="p-3.5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-white">Withdrawal to Moniepoint</p>
                <p className="text-[10px] text-[#A0A3B1]">Yesterday, 04:30 PM</p>
              </div>
              <span className="text-xs font-bold text-red-400">-₦20,000.00</span>
            </div>
          </div>
        </section>

        {/* 6. INSIGHTS */}
        <section className="grid grid-cols-2 gap-3">
          <div className="bg-[#151B3D] border border-[#D4AF37]/25 rounded-2xl p-4">
            <span className="text-[11px] font-semibold text-[#D4AF37] uppercase">Store Goals</span>
            <p className="text-base font-bold text-white mt-1">₦500k Target</p>
            <div className="w-full bg-gray-800 rounded-full h-1.5 mt-2">
              <div className="bg-[#F5C445] h-full rounded-full" style={{ width: '60%' }} />
            </div>
            <p className="text-[10px] text-[#A0A3B1] mt-1.5">60% completed</p>
          </div>

          <div className="bg-[#151B3D] border border-[#D4AF37]/25 rounded-2xl p-4">
            <span className="text-[11px] font-semibold text-[#D4AF37] uppercase">Settlements</span>
            <p className="text-base font-bold text-white mt-1">2 Weekly Payouts</p>
            <p className="text-[10px] text-[#A0A3B1] mt-2 leading-tight">
              Mon 1st payout free, amount-tiered processing.
            </p>
          </div>
        </section>
      </main>

      {/* 7. FIXED BOTTOM NAV (100% width, full mobile screen) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0A1028]/95 backdrop-blur-lg border-t border-[#D4AF37]/25 px-4 py-2 flex items-center justify-around">
        <Link href="/" className="flex flex-col items-center gap-1 text-[#A0A3B1] hover:text-white">
          <Home size={20} />
          <span className="text-[10px]">Home</span>
        </Link>
        <Link href="/orders" className="flex flex-col items-center gap-1 text-[#A0A3B1] hover:text-white">
          <ShoppingBag size={20} />
          <span className="text-[10px]">Orders</span>
        </Link>
        <Link href="/vendor/wallet" className="flex flex-col items-center gap-1 text-[#F5C445]">
          <div className="p-1 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]">
            <Building2 size={20} className="text-[#F5C445]" />
          </div>
          <span className="text-[10px] font-bold">Wallet</span>
        </Link>
        <Link href="/products" className="flex flex-col items-center gap-1 text-[#A0A3B1] hover:text-white">
          <Store size={20} />
          <span className="text-[10px]">Market</span>
        </Link>
        <Link href="/profile" className="flex flex-col items-center gap-1 text-[#A0A3B1] hover:text-white">
          <User size={20} />
          <span className="text-[10px]">Profile</span>
        </Link>
      </nav>
    </div>
  );
}
  
