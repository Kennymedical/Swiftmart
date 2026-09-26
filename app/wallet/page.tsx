'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Eye, EyeOff, Bell, User, Plus, Send, Download, 
  QrCode, Building2, Phone, Wifi, Receipt, Users, 
  CreditCard, ChevronRight, Home, Compass, Wallet, Store, Shield
} from 'lucide-react';

export default function UserWalletPage() {
  const [showBalance, setShowBalance] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'in' | 'out'>('all');

  return (
    <div className="w-full min-h-screen bg-[#0A1028] text-white flex flex-col font-sans pb-24 selection:bg-[#D4AF37] selection:text-black">
      {/* 1. STICKY HEADER */}
      <header className="sticky top-0 z-40 bg-[#0A1028]/95 backdrop-blur-md px-4 py-3.5 border-b border-[#D4AF37]/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#D4AF37] to-[#F5C445] flex items-center justify-center shadow-md">
            <Shield size={18} className="text-black" />
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

      {/* 2. MAIN BODY */}
      <main className="flex-1 w-full max-w-xl mx-auto px-4 py-5 space-y-6">
        {/* HERO BALANCE CARD */}
        <div className="w-full bg-[#151B3D] border border-[#D4AF37]/50 rounded-2xl p-5 shadow-xl shadow-[#D4AF37]/5 relative">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#D4AF37] uppercase tracking-wider">Available Balance</span>
            <button onClick={() => setShowBalance(!showBalance)} className="text-[#A0A3B1] hover:text-white">
              {showBalance ? <Eye size={18} /> : <EyeOff size={18} />}
            </button>
          </div>

          <div className="mt-2">
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              {showBalance ? '₦84,250.50' : '••••••••'}
            </h1>
          </div>

          <div className="mt-4 pt-3 border-t border-[#D4AF37]/20 flex items-center justify-between">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-[10px] font-bold text-emerald-400">
              ● growth +1 this month
            </span>

            <Link
              href="/wallet/fund"
              className="px-4 py-2 rounded-full bg-[#F5C445] hover:bg-[#D4AF37] text-black font-extrabold text-xs shadow-md shadow-[#D4AF37]/20 flex items-center gap-1.5 transition"
            >
              Add Money <Plus size={14} />
            </Link>
          </div>
        </div>

        {/* 3. QUICK ACTIONS (4x2 Grid) */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">Quick Actions</h2>
            <button className="text-xs font-semibold text-[#D4AF37]">See all</button>
          </div>

          <div className="grid grid-cols-4 gap-2.5">
            {[
              { label: 'Send Money', icon: Send, href: '/wallet/send' },
              { label: 'Request Money', icon: Download, href: '/wallet/request' },
              { label: 'Scan QR', icon: QrCode, href: '/wallet/scan' },
              { label: 'Bank Transfer', icon: Building2, href: '/wallet/send' },
              { label: 'Buy Airtime', icon: Phone, href: '/wallet/airtime' },
              { label: 'Buy Data', icon: Wifi, href: '/wallet/data' },
              { label: 'Pay Bills', icon: Receipt, href: '/wallet/bills' },
              { label: 'Split Bill', icon: Users, href: '/wallet/split' },
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
            <div className="min-w-[240px] bg-gradient-to-br from-[#1E2652] via-[#151B3D] to-[#0A1028] border border-[#D4AF37]/60 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-[#F5C445] tracking-widest">SwiftMART DEBIT</span>
                <CreditCard size={18} className="text-[#D4AF37]" />
              </div>
              <p className="text-sm font-mono tracking-widest text-white my-4">•••• •••• •••• 4589</p>
              <div className="flex justify-between text-[10px] text-[#A0A3B1]">
                <span>EXP: 09/28</span>
                <span className="text-[#F5C445] font-semibold">VALID NGN</span>
              </div>
            </div>

            <div className="min-w-[200px] border-2 border-dashed border-[#D4AF37]/40 rounded-2xl p-4 flex flex-col items-center justify-center text-center bg-[#151B3D]/40">
              <CreditCard size={22} className="text-[#D4AF37] mb-2" />
              <p className="text-xs font-bold text-white">Physical Card</p>
              <p className="text-[10px] text-[#A0A3B1] mt-0.5">Order now for ATM & POS</p>
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

          <div className="bg-[#151B3D] border border-[#D4AF37]/25 rounded-2xl divide-y divide-[#D4AF37]/10">
            <div className="p-3.5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-white">Starbucks Coffee</p>
                <p className="text-[10px] text-[#A0A3B1]">Today, 02:40 PM</p>
              </div>
              <span className="text-xs font-bold text-red-400">-₦3,500.00</span>
            </div>

            <div className="p-3.5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-white">Salary Deposit</p>
                <p className="text-[10px] text-[#A0A3B1]">Yesterday, 09:00 AM</p>
              </div>
              <span className="text-xs font-bold text-emerald-400">+₦50,000.00</span>
            </div>

            <div className="p-3.5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-white">MTN Data Purchase</p>
                <p className="text-[10px] text-[#A0A3B1]">23 Sep, 08:15 PM</p>
              </div>
              <span className="text-xs font-bold text-red-400">-₦2,000.00</span>
            </div>
          </div>
        </section>

        {/* 6. SECURITY & STATEMENT */}
        <section className="bg-[#151B3D] border border-[#D4AF37]/25 rounded-2xl divide-y divide-[#D4AF37]/10 text-xs">
          <Link href="/wallet/limits" className="p-4 flex items-center justify-between hover:bg-[#1E2652]/50 transition">
            <span className="font-semibold text-white">Spending Limits</span>
            <ChevronRight size={16} className="text-[#D4AF37]" />
          </Link>
          <Link href="/wallet/statement" className="p-4 flex items-center justify-between hover:bg-[#1E2652]/50 transition">
            <span className="font-semibold text-white">Download Account Statement</span>
            <ChevronRight size={16} className="text-[#D4AF37]" />
          </Link>
        </section>
      </main>

      {/* 7. FIXED BOTTOM NAVIGATION */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0A1028]/95 backdrop-blur-lg border-t border-[#D4AF37]/25 px-4 py-2 flex items-center justify-around">
        <Link href="/" className="flex flex-col items-center gap-1 text-[#A0A3B1] hover:text-white">
          <Home size={20} />
          <span className="text-[10px]">Home</span>
        </Link>
        <Link href="/feed" className="flex flex-col items-center gap-1 text-[#A0A3B1] hover:text-white">
          <Compass size={20} />
          <span className="text-[10px]">Social</span>
        </Link>
        <Link href="/wallet" className="flex flex-col items-center gap-1 text-[#F5C445]">
          <div className="p-1 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]">
            <Wallet size={20} className="text-[#F5C445]" />
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
    
