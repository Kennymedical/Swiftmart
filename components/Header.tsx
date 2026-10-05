'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  ShoppingCart,
  Menu,
  X,
  PackageCheck,
  Store,
  PlusCircle,
  CreditCard,
  LogOut,
  ChevronRight,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  LayoutDashboard,
  ShoppingBag
} from 'lucide-react';

export function Header() {
  const supabase = createClient();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isVendor, setIsVendor] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const isAdminDashboard = pathname?.startsWith('/admin');
  const isVendorDashboard = pathname?.startsWith('/vendor');
  const isDashboard = isAdminDashboard || isVendorDashboard;

  useEffect(() => {
    async function loadUserData() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        setUserEmail(user.email ?? null);

        // Fetch cart count
        try {
          const { count } = await supabase
            .from('cart_items')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id);
          setCartCount(count ?? 0);
        } catch (e) {
          // ignore
        }

        // Fetch vendor status
        try {
          const vendorQuery = supabase.from('vendors').select('id').eq('user_id', user.id);
          const vendorRes = typeof vendorQuery.maybeSingle === 'function' 
            ? await vendorQuery.maybeSingle() 
            : await vendorQuery;
          const vendorRow = vendorRes?.data ? (Array.isArray(vendorRes.data) ? vendorRes.data[0] : vendorRes.data) : null;
          setIsVendor(!!vendorRow);
        } catch (e) {
          // ignore
        }

        // Fetch admin status
        try {
          const profileQuery = supabase.from('profiles').select('role').eq('id', user.id);
          const profileRes = typeof profileQuery.maybeSingle === 'function'
            ? await profileQuery.maybeSingle()
            : await profileQuery;
          const profileRow = profileRes?.data ? (Array.isArray(profileRes.data) ? profileRes.data[0] : profileRes.data) : null;
          setIsAdmin(profileRow?.role === 'admin');
        } catch (e) {
          // ignore
        }
      } catch (err) {
        console.warn('Failed loading user context in Header:', err);
      }
    }
    loadUserData();
  }, [supabase]);

  // Hide header completely on login and signup/register pages
  if (
    pathname?.startsWith('/login') ||
    pathname?.startsWith('/register') ||
    pathname?.startsWith('/signup')
  ) {
    return null;
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setMenuOpen(false);
    router.push('/login');
    router.refresh();
  };

  // Determine dynamic title based on path
  const getHeaderTitle = () => {
    if (isAdminDashboard) {
      return (
        <div className="flex flex-col items-center">
          <span className="text-base sm:text-lg font-black text-[#D4AF37] tracking-wider uppercase flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#D4AF37]" /> SwiftMart Admin
          </span>
          <span className="text-[10px] text-[#A8B0C5] tracking-wide">
            Enterprise Console
          </span>
        </div>
      );
    }

    if (isVendorDashboard) {
      let sub = 'Merchant Portal';
      if (pathname?.startsWith('/vendor/wallet')) sub = 'Payout Wallet';
      else if (pathname?.startsWith('/vendor/products/add')) sub = 'Add Product';
      return (
        <div className="flex flex-col items-center">
          <span className="text-base sm:text-lg font-black text-[#D4AF37] tracking-wider uppercase flex items-center gap-1.5">
            <Store className="w-4 h-4 text-[#D4AF37]" /> Vendor Portal
          </span>
          <span className="text-[10px] text-[#A8B0C5] tracking-wide">
            {sub}
          </span>
        </div>
      );
    }

    if (pathname === '/') {
      return (
        <div className="flex flex-col items-center">
          <span className="text-xl font-black tracking-tight">
            <span className="text-white">Swift</span>
            <span className="text-[#D4AF37]">Mart</span>
          </span>
          <span className="text-[10px] text-[#D4AF37]/90 font-medium tracking-wide">
            Marketplace & Fintech all together
          </span>
        </div>
      );
    }

    let titleText = 'SwiftMart';
    if (pathname?.startsWith('/products')) titleText = 'Shop / Marketplace';
    else if (pathname?.startsWith('/cart')) titleText = 'My Cart';
    else if (pathname?.startsWith('/wallet')) titleText = 'Wallet';
    else if (pathname?.startsWith('/notifications')) titleText = 'Notifications';
    else if (pathname?.startsWith('/profile')) titleText = 'Profile';
    else if (pathname?.startsWith('/orders')) titleText = 'My Orders';
    else if (pathname?.startsWith('/post')) titleText = 'Create Post';

    return (
      <h1 className="text-base sm:text-lg font-bold text-[#D4AF37] tracking-wide">
        {titleText}
      </h1>
    );
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-[#0A1931] border-b border-[#D4AF37]/20 shadow-md">
      <div className="flex items-center justify-between px-3 py-2.5 max-w-7xl mx-auto">
        {/* Left: Hamburger menu toggle */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
          className="p-2 text-[#D4AF37] hover:text-[#E8C874] transition rounded-lg hover:bg-white/5 active:scale-95"
        >
          {menuOpen ? <X size={24} className="text-[#D4AF37]" /> : <Menu size={24} />}
        </button>

        {/* Center: Title / App Branding */}
        <div className="flex-1 text-center">
          {getHeaderTitle()}
        </div>

        {/* Right: Cart Button for Shoppers OR Sign Out for Dashboards */}
        {isDashboard ? (
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-400 hover:text-white bg-red-950/40 hover:bg-red-600/80 border border-red-500/30 rounded-xl transition active:scale-95"
            aria-label="Sign out"
          >
            <LogOut size={15} />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        ) : (
          <Link
            href="/cart"
            className="relative p-2 text-[#D4AF37] hover:text-[#F5C445] transition rounded-lg hover:bg-white/5 active:scale-95"
            aria-label="Shopping Cart"
          >
            <ShoppingCart size={22} strokeWidth={2} />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white shadow-sm">
                {cartCount > 9 ? '9+' : cartCount}
              </span>
            )}
          </Link>
        )}
      </div>

      {/* Top-to-Bottom Drawer Menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex flex-col">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
            onClick={() => setMenuOpen(false)}
          />

          {/* Menu Container: Slides down from top */}
          <div className="relative w-full max-h-[90vh] overflow-y-auto bg-[#0A1931] border-b-2 border-[#D4AF37]/40 shadow-2xl z-10 flex flex-col animate-in slide-in-from-top duration-300">
            {/* Top Branding Header */}
            <div className="px-5 pt-5 pb-4 border-b border-white/10 bg-gradient-to-b from-[#111A3E] to-[#0A1028]">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-black tracking-tight">
                      <span className="text-white">Swift</span>
                      <span className="text-[#D4AF37]">Mart</span>
                    </span>
                    <span className="flex items-center gap-1 text-[10px] bg-[#D4AF37]/20 text-[#F5C445] border border-[#D4AF37]/40 px-2 py-0.5 rounded-full font-semibold">
                      <Sparkles size={11} /> {isAdminDashboard ? 'Admin Operations' : isVendorDashboard ? 'Merchant Console' : 'Royal Hub'}
                    </span>
                  </div>
                  <p className="text-xs text-[#D4AF37] font-medium mt-1 tracking-wide">
                    {isAdminDashboard
                      ? 'Operational controls for marketplace treasury, orders, and directory.'
                      : isVendorDashboard
                      ? 'Manage store products, fulfill orders, and monitor payout balances.'
                      : 'Shop like a king and pay and send money to your loved ones.'}
                  </p>
                </div>

                <button
                  onClick={() => setMenuOpen(false)}
                  className="p-2 text-[#A8B0C5] hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition"
                  aria-label="Close menu"
                >
                  <X size={20} className="text-[#D4AF37]" />
                </button>
              </div>

              {userEmail && (
                <div className="mt-3 flex items-center justify-between bg-white/[0.04] border border-white/10 rounded-lg px-3 py-1.5 text-xs">
                  <span className="text-[#A8B0C5]">Signed in as:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[#F5F7FA] font-medium truncate max-w-[160px] sm:max-w-xs">{userEmail}</span>
                    {isAdminDashboard ? (
                      <span className="text-[10px] bg-amber-500/20 text-[#F5C445] border border-amber-500/30 px-1.5 py-0.5 rounded font-bold uppercase">
                        Admin
                      </span>
                    ) : isVendor ? (
                      <span className="text-[10px] bg-green-500/20 text-green-400 border border-green-500/30 px-1.5 py-0.5 rounded font-bold uppercase">
                        Vendor
                      </span>
                    ) : null}
                  </div>
                </div>
              )}
            </div>

            {/* Menu Sections Grid */}
            <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-6xl mx-auto w-full">
              {isAdminDashboard ? (
                /* ADMIN OPERATIONAL LINKS */
                <>
                  <div className="bg-gradient-to-br from-[#142850] to-[#1B2F5E] border border-[#D4AF37]/25 shadow-[0_4px_20px_rgba(212,175,55,0.08)] rounded-2xl p-4 transition">
                    <div className="flex items-center gap-2 mb-3">
                      <LayoutDashboard size={18} className="text-[#D4AF37]" />
                      <h3 className="text-xs uppercase tracking-wider font-bold text-[#D4AF37]">
                        Admin Core
                      </h3>
                    </div>
                    <div className="space-y-1">
                      <Link
                        href="/admin"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center justify-between p-2.5 rounded-xl text-sm font-medium text-[#F5F7FA] hover:bg-white/5 hover:text-[#F5C445] transition group"
                      >
                        <span>System Pulse & Overview</span>
                        <ChevronRight size={16} className="text-[#8A94B0] group-hover:text-[#F5C445] group-hover:translate-x-0.5 transition" />
                      </Link>
                      <Link
                        href="/admin/wallet"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center justify-between p-2.5 rounded-xl text-sm font-medium text-[#F5F7FA] hover:bg-white/5 hover:text-[#F5C445] transition group"
                      >
                        <span>Profit Treasury & Escrow</span>
                        <ChevronRight size={16} className="text-[#8A94B0] group-hover:text-[#F5C445] group-hover:translate-x-0.5 transition" />
                      </Link>
                      <Link
                        href="/admin/commissions"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center justify-between p-2.5 rounded-xl text-sm font-medium text-[#F5F7FA] hover:bg-white/5 hover:text-[#F5C445] transition group"
                      >
                        <span>Commission & Fee Governance</span>
                        <ChevronRight size={16} className="text-[#8A94B0] group-hover:text-[#F5C445] group-hover:translate-x-0.5 transition" />
                      </Link>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-[#142850] to-[#1B2F5E] border border-[#D4AF37]/25 shadow-[0_4px_20px_rgba(212,175,55,0.08)] rounded-2xl p-4 transition">
                    <div className="flex items-center gap-2 mb-3">
                      <PackageCheck size={18} className="text-[#D4AF37]" />
                      <h3 className="text-xs uppercase tracking-wider font-bold text-[#D4AF37]">
                        Orders & Payouts
                      </h3>
                    </div>
                    <div className="space-y-1">
                      <Link
                        href="/admin/orders"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center justify-between p-2.5 rounded-xl text-sm font-medium text-[#F5F7FA] hover:bg-white/5 hover:text-[#F5C445] transition group"
                      >
                        <span>Orders & Escrow Releases</span>
                        <ChevronRight size={16} className="text-[#8A94B0] group-hover:text-[#F5C445] group-hover:translate-x-0.5 transition" />
                      </Link>
                      <Link
                        href="/admin/payouts"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center justify-between p-2.5 rounded-xl text-sm font-medium text-[#F5F7FA] hover:bg-white/5 hover:text-[#F5C445] transition group"
                      >
                        <span>Vendor Payout Requests</span>
                        <ChevronRight size={16} className="text-[#8A94B0] group-hover:text-[#F5C445] group-hover:translate-x-0.5 transition" />
                      </Link>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-[#142850] to-[#1B2F5E] border border-[#D4AF37]/25 shadow-[0_4px_20px_rgba(212,175,55,0.08)] rounded-2xl p-4 transition">
                    <div className="flex items-center gap-2 mb-3">
                      <Store size={18} className="text-[#D4AF37]" />
                      <h3 className="text-xs uppercase tracking-wider font-bold text-[#D4AF37]">
                        Directory & Storefront
                      </h3>
                    </div>
                    <div className="space-y-1">
                      <Link
                        href="/admin/vendors"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center justify-between p-2.5 rounded-xl text-sm font-medium text-[#F5F7FA] hover:bg-white/5 hover:text-[#F5C445] transition group"
                      >
                        <span>Vendor Directory & KYC</span>
                        <ChevronRight size={16} className="text-[#8A94B0] group-hover:text-[#F5C445] group-hover:translate-x-0.5 transition" />
                      </Link>
                      <Link
                        href="/admin/products"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center justify-between p-2.5 rounded-xl text-sm font-medium text-[#F5F7FA] hover:bg-white/5 hover:text-[#F5C445] transition group"
                      >
                        <span>Product Approvals</span>
                        <ChevronRight size={16} className="text-[#8A94B0] group-hover:text-[#F5C445] group-hover:translate-x-0.5 transition" />
                      </Link>
                      <Link
                        href="/"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center justify-between p-2.5 rounded-xl text-sm font-medium text-[#D4AF37] hover:bg-white/5 hover:text-[#F5C445] transition group"
                      >
                        <span>Switch to Customer Storefront</span>
                        <ArrowUpRight size={16} className="group-hover:translate-x-0.5 transition" />
                      </Link>
                    </div>
                  </div>
                </>
              ) : isVendorDashboard ? (
                /* VENDOR OPERATIONAL LINKS */
                <>
                  <div className="bg-gradient-to-br from-[#142850] to-[#1B2F5E] border border-[#D4AF37]/25 shadow-[0_4px_20px_rgba(212,175,55,0.08)] rounded-2xl p-4 transition">
                    <div className="flex items-center gap-2 mb-3">
                      <Store size={18} className="text-[#D4AF37]" />
                      <h3 className="text-xs uppercase tracking-wider font-bold text-[#D4AF37]">
                        Store Operations
                      </h3>
                    </div>
                    <div className="space-y-1">
                      <Link
                        href="/vendor"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center justify-between p-2.5 rounded-xl text-sm font-medium text-[#F5F7FA] hover:bg-white/5 hover:text-[#F5C445] transition group"
                      >
                        <span>Vendor Dashboard</span>
                        <ChevronRight size={16} className="text-[#8A94B0] group-hover:text-[#F5C445] group-hover:translate-x-0.5 transition" />
                      </Link>
                      <Link
                        href="/vendor/products/add"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center justify-between p-2.5 rounded-xl text-sm font-medium text-[#F5F7FA] hover:bg-white/5 hover:text-[#F5C445] transition group"
                      >
                        <span>Add New Product</span>
                        <ChevronRight size={16} className="text-[#8A94B0] group-hover:text-[#F5C445] group-hover:translate-x-0.5 transition" />
                      </Link>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-[#142850] to-[#1B2F5E] border border-[#D4AF37]/25 shadow-[0_4px_20px_rgba(212,175,55,0.08)] rounded-2xl p-4 transition">
                    <div className="flex items-center gap-2 mb-3">
                      <CreditCard size={18} className="text-[#D4AF37]" />
                      <h3 className="text-xs uppercase tracking-wider font-bold text-[#D4AF37]">
                        Payouts & Wallet
                      </h3>
                    </div>
                    <div className="space-y-1">
                      <Link
                        href="/vendor/wallet"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center justify-between p-2.5 rounded-xl text-sm font-medium text-[#F5F7FA] hover:bg-white/5 hover:text-[#F5C445] transition group"
                      >
                        <span>Vendor Payout Wallet</span>
                        <ChevronRight size={16} className="text-[#8A94B0] group-hover:text-[#F5C445] group-hover:translate-x-0.5 transition" />
                      </Link>
                      <Link
                        href="/wallet/send?mode=bank"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center justify-between p-2.5 rounded-xl text-sm font-medium text-[#F5F7FA] hover:bg-white/5 hover:text-[#F5C445] transition group"
                      >
                        <span>Withdraw to Bank</span>
                        <ChevronRight size={16} className="text-[#8A94B0] group-hover:text-[#F5C445] group-hover:translate-x-0.5 transition" />
                      </Link>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-[#142850] to-[#1B2F5E] border border-[#D4AF37]/25 shadow-[0_4px_20px_rgba(212,175,55,0.08)] rounded-2xl p-4 transition">
                    <div className="flex items-center gap-2 mb-3">
                      <ShoppingBag size={18} className="text-[#D4AF37]" />
                      <h3 className="text-xs uppercase tracking-wider font-bold text-[#D4AF37]">
                        Marketplace View
                      </h3>
                    </div>
                    <div className="space-y-1">
                      <Link
                        href="/"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center justify-between p-2.5 rounded-xl text-sm font-medium text-[#D4AF37] hover:bg-white/5 hover:text-[#F5C445] transition group"
                      >
                        <span>Customer Storefront</span>
                        <ArrowUpRight size={16} className="group-hover:translate-x-0.5 transition" />
                      </Link>
                      <Link
                        href="/products"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center justify-between p-2.5 rounded-xl text-sm font-medium text-[#F5F7FA] hover:bg-white/5 hover:text-[#F5C445] transition group"
                      >
                        <span>Live Catalog</span>
                        <ChevronRight size={16} className="text-[#8A94B0] group-hover:text-[#F5C445] group-hover:translate-x-0.5 transition" />
                      </Link>
                    </div>
                  </div>
                </>
              ) : (
                /* SHOPPER LINKS */
                <>
                  <div className="bg-gradient-to-br from-[#142850] to-[#1B2F5E] border border-[#D4AF37]/25 shadow-[0_4px_20px_rgba(212,175,55,0.08)] rounded-2xl p-4 shadow-sm hover:border-[#D4AF37]/30 transition">
                    <div className="flex items-center gap-2 mb-3">
                      <PackageCheck size={18} className="text-[#D4AF37]" />
                      <h3 className="text-xs uppercase tracking-wider font-bold text-[#D4AF37]">
                        Orders & Tracking
                      </h3>
                    </div>
                    <div className="space-y-1">
                      <Link
                        href="/orders"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center justify-between p-2.5 rounded-xl text-sm font-medium text-[#F5F7FA] hover:bg-white/5 hover:text-[#F5C445] transition group"
                      >
                        <span>My Orders & Waybill</span>
                        <ChevronRight size={16} className="text-[#8A94B0] group-hover:text-[#F5C445] group-hover:translate-x-0.5 transition" />
                      </Link>
                      <Link
                        href="/cart"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center justify-between p-2.5 rounded-xl text-sm font-medium text-[#F5F7FA] hover:bg-white/5 hover:text-[#F5C445] transition group"
                      >
                        <span>Shopping Cart</span>
                        <ChevronRight size={16} className="text-[#8A94B0] group-hover:text-[#F5C445] group-hover:translate-x-0.5 transition" />
                      </Link>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-[#142850] to-[#1B2F5E] border border-[#D4AF37]/25 shadow-[0_4px_20px_rgba(212,175,55,0.08)] rounded-2xl p-4 shadow-sm hover:border-[#D4AF37]/30 transition">
                    <div className="flex items-center gap-2 mb-3">
                      <Store size={18} className="text-[#D4AF37]" />
                      <h3 className="text-xs uppercase tracking-wider font-bold text-[#D4AF37]">
                        Merchant Portal
                      </h3>
                    </div>
                    {isVendor ? (
                      <div className="space-y-1">
                        <Link
                          href="/vendor"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center justify-between p-2.5 rounded-xl text-sm font-medium text-[#F5F7FA] hover:bg-white/5 hover:text-[#F5C445] transition group"
                        >
                          <span>Vendor Dashboard</span>
                          <ChevronRight size={16} className="text-[#8A94B0] group-hover:text-[#F5C445] group-hover:translate-x-0.5 transition" />
                        </Link>
                        <Link
                          href="/vendor/products/add"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center justify-between p-2.5 rounded-xl text-sm font-medium text-[#F5F7FA] hover:bg-white/5 hover:text-[#F5C445] transition group"
                        >
                          <span>Add New Product</span>
                          <ChevronRight size={16} className="text-[#8A94B0] group-hover:text-[#F5C445] group-hover:translate-x-0.5 transition" />
                        </Link>
                        <Link
                          href="/vendor/wallet"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center justify-between p-2.5 rounded-xl text-sm font-medium text-[#F5F7FA] hover:bg-white/5 hover:text-[#F5C445] transition group"
                        >
                          <span>Vendor Payout Wallet</span>
                          <ChevronRight size={16} className="text-[#8A94B0] group-hover:text-[#F5C445] group-hover:translate-x-0.5 transition" />
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs text-[#A8B0C5] leading-relaxed">
                          Sell to thousands of shoppers on SwiftMart with guaranteed escrow payouts.
                        </p>
                        <Link
                          href="/vendor/register"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center justify-between p-2.5 rounded-xl text-sm font-semibold bg-[#D4AF37]/15 text-[#F5C445] border border-[#D4AF37]/30 hover:bg-[#D4AF37]/25 transition group"
                        >
                          <span>Become a Vendor</span>
                          <ArrowUpRight size={16} className="group-hover:translate-x-0.5 transition" />
                        </Link>
                      </div>
                    )}
                  </div>

                  <div className="bg-gradient-to-br from-[#142850] to-[#1B2F5E] border border-[#D4AF37]/25 shadow-[0_4px_20px_rgba(212,175,55,0.08)] rounded-2xl p-4 shadow-sm hover:border-[#D4AF37]/30 transition">
                    <div className="flex items-center gap-2 mb-3">
                      <CreditCard size={18} className="text-[#D4AF37]" />
                      <h3 className="text-xs uppercase tracking-wider font-bold text-[#D4AF37]">
                        Fintech Actions
                      </h3>
                    </div>
                    <div className="space-y-1">
                      <Link
                        href="/wallet/send"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center justify-between p-2.5 rounded-xl text-sm font-medium text-[#F5F7FA] hover:bg-white/5 hover:text-[#F5C445] transition group"
                      >
                        <span>Send Money (P2P / Bank)</span>
                        <ChevronRight size={16} className="text-[#8A94B0] group-hover:text-[#F5C445] group-hover:translate-x-0.5 transition" />
                      </Link>
                      <Link
                        href="/wallet/fund"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center justify-between p-2.5 rounded-xl text-sm font-medium text-[#F5F7FA] hover:bg-white/5 hover:text-[#F5C445] transition group"
                      >
                        <span>Top-up / Fund Wallet</span>
                        <ChevronRight size={16} className="text-[#8A94B0] group-hover:text-[#F5C445] group-hover:translate-x-0.5 transition" />
                      </Link>
                      <Link
                        href="/wallet/history"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center justify-between p-2.5 rounded-xl text-sm font-medium text-[#F5F7FA] hover:bg-white/5 hover:text-[#F5C445] transition group"
                      >
                        <span>Transaction Statements</span>
                        <ChevronRight size={16} className="text-[#8A94B0] group-hover:text-[#F5C445] group-hover:translate-x-0.5 transition" />
                      </Link>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Bottom Actions: Log Out + Tagline */}
            <div className="mt-auto px-5 py-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#080D21]">
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-red-400 hover:text-white hover:bg-red-600/80 border border-red-500/40 transition active:scale-95"
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
              <p className="text-[11px] text-[#8A94B0] text-center sm:text-right">
                SwiftMart • Fast, Secure Marketplace & Fintech
              </p>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
