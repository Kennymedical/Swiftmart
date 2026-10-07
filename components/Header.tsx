'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  ShoppingCart,
  Menu,
  X,
  PackageCheck,
  Store,
  CreditCard,
  LogOut,
  ChevronRight,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  Percent,
  PlusCircle,
  Truck,
  Users,
  Plus,
  Search,
  Lock,
  UserCog
} from 'lucide-react';

export function Header() {
  const supabase = createClient();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'customer' | 'vendor' | 'admin' | 'staff'>('customer');
  const [isVendorApproved, setIsVendorApproved] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Live operational badges
  const [pendingPayoutCount, setPendingPayoutCount] = useState(0);
  const [pendingEscrowCount, setPendingEscrowCount] = useState(0);
  const [vendorPendingCashout, setVendorPendingCashout] = useState(0);

  const isAdminDashboard = pathname?.startsWith('/admin');
  const isVendorDashboard = pathname?.startsWith('/vendor');
  const isDashboard = isAdminDashboard || isVendorDashboard;

  useEffect(() => {
    async function loadUserData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setUserEmail(user.email ?? null);

        // Cart items
        try {
          const { count } = await supabase
            .from('cart_items')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id);
          setCartCount(count ?? 0);
        } catch (e) {}

        // User profile & role
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .maybeSingle();
          if (profile?.role) {
            setUserRole(profile.role);
          }
        } catch (e) {}

        // Vendor status
        try {
          const { data: vendor } = await supabase
            .from('vendors')
            .select('id, status')
            .eq('user_id', user.id)
            .maybeSingle();
          if (vendor?.status === 'approved') {
            setIsVendorApproved(true);
          }
        } catch (e) {}

        // Admin badge metrics
        try {
          const { count: payoutCount } = await supabase
            .from('transactions')
            .select('id', { count: 'exact', head: true })
            .eq('type', 'payout')
            .eq('status', 'pending');
          setPendingPayoutCount(payoutCount ?? 0);

          const { count: escrowOrders } = await supabase
            .from('orders')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'paid');
          setPendingEscrowCount(escrowOrders ?? 0);
        } catch (e) {}

        // Vendor badge metrics
        try {
          const { data: userWallet } = await supabase
            .from('wallets')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();
          if (userWallet) {
            const { count: vPending } = await supabase
              .from('transactions')
              .select('id', { count: 'exact', head: true })
              .eq('wallet_id', userWallet.id)
              .eq('type', 'payout')
              .eq('status', 'pending');
            setVendorPendingCashout(vPending ?? 0);
          }
        } catch (e) {}

      } catch (err) {
        console.warn('Failed loading user context in Header:', err);
      }
    }
    loadUserData();
  }, [supabase, pathname]);

  // Suppress root header on auth and admin pages so admin layout provides the single source of truth (no duplicate headers)
  if (
    pathname?.startsWith('/login') ||
    pathname?.startsWith('/register') ||
    pathname?.startsWith('/signup') ||
    pathname?.startsWith('/admin/login') ||
    pathname?.startsWith('/vendor/login') ||
    pathname?.startsWith('/admin')
  ) {
    return null;
  }

  const handleExitDashboard = () => {
    setMenuOpen(false);
    router.push('/');
  };

  const handleSignOut = async () => {
    sessionStorage.removeItem('swiftmart_admin_pin_verified');
    sessionStorage.removeItem('swiftmart_vendor_pin_verified');
    await supabase.auth.signOut();
    setMenuOpen(false);
    router.push('/login');
    router.refresh();
  };

  const getHeaderTitle = () => {
    if (isAdminDashboard) {
      return (
        <div className="flex flex-col items-center">
          <span className="text-base sm:text-lg font-black text-[#D4AF37] tracking-wider uppercase flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#D4AF37]" /> SwiftMart Admin
          </span>
          <span className="text-[10px] text-[#A8B0C5] tracking-wide">
            Console Quick Access
          </span>
        </div>
      );
    }

    if (isVendorDashboard) {
      return (
        <div className="flex flex-col items-center">
          <span className="text-base sm:text-lg font-black text-[#D4AF37] tracking-wider uppercase flex items-center gap-1.5">
            <Store className="w-4 h-4 text-[#D4AF37]" /> Vendor Portal
          </span>
          <span className="text-[10px] text-[#A8B0C5] tracking-wide">
            Merchant Operations
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
    else if (pathname?.startsWith('/post')) titleText = 'Community Feed';

    return (
      <h1 className="text-base sm:text-lg font-bold text-[#D4AF37] tracking-wide">
        {titleText}
      </h1>
    );
  };

  const q = searchQuery.toLowerCase().trim();

  return (
    <header className="sticky top-0 z-50 w-full bg-[#0A1931] border-b border-[#D4AF37]/20 shadow-md">
      <div className="flex items-center justify-between px-3 py-2.5 max-w-7xl mx-auto">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
          className="p-2 text-[#D4AF37] hover:text-[#E8C874] transition rounded-lg hover:bg-white/5 active:scale-95"
        >
          {menuOpen ? <X size={24} className="text-[#D4AF37]" /> : <Menu size={24} />}
        </button>

        <div className="flex-1 text-center">
          {getHeaderTitle()}
        </div>

        {isDashboard ? (
          <button
            onClick={handleExitDashboard}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-400 hover:text-white bg-red-950/40 hover:bg-red-600/80 border border-red-500/30 rounded-xl transition active:scale-95"
            aria-label="Exit dashboard"
          >
            <LogOut size={15} />
            <span className="hidden sm:inline">Exit</span>
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

      {menuOpen && (
        <div className="fixed inset-0 z-50 flex flex-col">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
            onClick={() => setMenuOpen(false)}
          />

          <div className="relative w-full max-h-[92vh] overflow-y-auto bg-[#0A1931] border-b-2 border-[#D4AF37]/40 shadow-2xl z-10 flex flex-col animate-in slide-in-from-top duration-300">
            {/* Top drawer header */}
            <div className="px-5 pt-5 pb-4 border-b border-white/10 bg-gradient-to-b from-[#111A3E] to-[#0A1028]">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-black tracking-tight">
                      <span className="text-white">Swift</span>
                      <span className="text-[#D4AF37]">Mart</span>
                    </span>
                    <span className="flex items-center gap-1 text-[10px] bg-[#D4AF37]/20 text-[#F5C445] border border-[#D4AF37]/40 px-2 py-0.5 rounded-full font-semibold">
                      <Sparkles size={11} /> {isAdminDashboard ? 'Admin Hub' : isVendorDashboard ? 'Merchant Hub' : 'Quick Access Hub'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setMenuOpen(false)}
                  className="p-2 text-[#A8B0C5] hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition"
                  aria-label="Close menu"
                >
                  <X size={20} className="text-[#D4AF37]" />
                </button>
              </div>

              {/* Compact in-drawer live search */}
              <div className="mt-3 relative">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#D4AF37]" />
                <input
                  type="text"
                  placeholder="Quick search shortcuts, actions & hidden tools..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#0A152B] border border-[#D4AF37]/40 text-xs text-white placeholder-[#8A94B0] rounded-xl pl-9 pr-8 py-2 focus:outline-none focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37]"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8A94B0] hover:text-white"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            {/* CURATED SHORTCUT TILES WITH ROLE ENFORCEMENT & LIVE BADGES */}
            <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-6xl mx-auto w-full">
              {isAdminDashboard && (userRole === 'admin' || userRole === 'staff') ? (
                <>
                  {/* ADMIN SECTION 1: Treasury */}
                  {('commissions payouts treasury governance'.includes(q) || !q) && (
                    <div className="bg-gradient-to-br from-[#142850] to-[#1B2F5E] border border-[#D4AF37]/25 rounded-2xl p-4 shadow-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <Percent size={18} className="text-[#D4AF37]" />
                        <h3 className="text-xs uppercase tracking-wider font-bold text-[#D4AF37]">
                          Treasury & Commissions
                        </h3>
                      </div>
                      <div className="space-y-1">
                        <Link
                          href="/admin/commissions"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center justify-between p-2.5 rounded-xl text-sm font-medium text-[#F5F7FA] hover:bg-white/5 hover:text-[#F5C445] transition group"
                        >
                          <div>
                            <div className="font-semibold">Commission & Fee Rules</div>
                            <div className="text-[11px] text-[#A8B0C5]">Audit trail & scheduled markups</div>
                          </div>
                          <ChevronRight size={16} className="text-[#8A94B0] group-hover:text-[#F5C445] shrink-0" />
                        </Link>
                        <Link
                          href="/admin/payouts"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center justify-between p-2.5 rounded-xl text-sm font-medium text-[#F5F7FA] hover:bg-white/5 hover:text-[#F5C445] transition group"
                        >
                          <div className="flex items-center gap-2">
                            <div>
                              <div className="font-semibold">Vendor Payout Queue</div>
                              <div className="text-[11px] text-[#A8B0C5]">Approve manual bank payouts</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {pendingPayoutCount > 0 && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-black animate-pulse shadow-sm">
                                {pendingPayoutCount} pending
                              </span>
                            )}
                            <ChevronRight size={16} className="text-[#8A94B0] group-hover:text-[#F5C445] shrink-0" />
                          </div>
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* ADMIN SECTION 2: Fulfillment & Logistics */}
                  {('orders escrow logistics shipping delivery'.includes(q) || !q) && (
                    <div className="bg-gradient-to-br from-[#142850] to-[#1B2F5E] border border-[#D4AF37]/25 rounded-2xl p-4 shadow-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <PackageCheck size={18} className="text-[#D4AF37]" />
                        <h3 className="text-xs uppercase tracking-wider font-bold text-[#D4AF37]">
                          Fulfillment & Escrow
                        </h3>
                      </div>
                      <div className="space-y-1">
                        <Link
                          href="/admin/orders"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center justify-between p-2.5 rounded-xl text-sm font-medium text-[#F5F7FA] hover:bg-white/5 hover:text-[#F5C445] transition group"
                        >
                          <div>
                            <div className="font-semibold">Orders & Escrow Releases</div>
                            <div className="text-[11px] text-[#A8B0C5]">Release funds to vendors</div>
                          </div>
                          <div className="flex items-center gap-1">
                            {pendingEscrowCount > 0 && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#D4AF37]/20 border border-[#D4AF37]/50 text-[#F5C445]">
                                {pendingEscrowCount} active
                              </span>
                            )}
                            <ChevronRight size={16} className="text-[#8A94B0] group-hover:text-[#F5C445] shrink-0" />
                          </div>
                        </Link>
                        <Link
                          href="/admin/logistics"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center justify-between p-2.5 rounded-xl text-sm font-medium text-[#F5F7FA] hover:bg-white/5 hover:text-[#F5C445] transition group"
                        >
                          <div>
                            <div className="font-semibold">Logistics & Waybill Surcharges</div>
                            <div className="text-[11px] text-[#A8B0C5]">Configure distance & profit margin</div>
                          </div>
                          <ChevronRight size={16} className="text-[#8A94B0] group-hover:text-[#F5C445] shrink-0" />
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* ADMIN SECTION 3: Identity & Staff Administration */}
                  {('staff kyc identity moderation users roles'.includes(q) || !q) && (
                    <div className="bg-gradient-to-br from-[#142850] to-[#1B2F5E] border border-[#D4AF37]/25 rounded-2xl p-4 shadow-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <UserCog size={18} className="text-[#D4AF37]" />
                        <h3 className="text-xs uppercase tracking-wider font-bold text-[#D4AF37]">
                          Identity & Staff Roles
                        </h3>
                      </div>
                      <div className="space-y-1">
                        <Link
                          href="/admin/staff"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center justify-between p-2.5 rounded-xl text-sm font-semibold bg-[#D4AF37]/15 text-[#F5C445] border border-[#D4AF37]/30 hover:bg-[#D4AF37]/25 transition group"
                        >
                          <div>
                            <div className="font-bold flex items-center gap-1.5">
                              <UserCog size={15} /> Staff Role Management
                            </div>
                            <div className="text-[11px] text-[#A8B0C5]">Assign roles & modular permissions</div>
                          </div>
                          <ChevronRight size={16} className="text-[#D4AF37] group-hover:translate-x-0.5 shrink-0" />
                        </Link>
                        <Link
                          href="/admin/kyc"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center justify-between p-2.5 rounded-xl text-sm font-medium text-[#F5F7FA] hover:bg-white/5 hover:text-[#F5C445] transition group"
                        >
                          <div>
                            <div className="font-semibold">Paystack NIN & KYC Verification</div>
                            <div className="text-[11px] text-[#A8B0C5]">Audit vendor applications</div>
                          </div>
                          <ChevronRight size={16} className="text-[#8A94B0] group-hover:text-[#F5C445] shrink-0" />
                        </Link>
                      </div>
                    </div>
                  )}
                </>
              ) : isVendorDashboard && isVendorApproved ? (
                <>
                  {/* VENDOR TILES */}
                  {('add product listing create'.includes(q) || !q) && (
                    <div className="bg-gradient-to-br from-[#142850] to-[#1B2F5E] border border-[#D4AF37]/25 rounded-2xl p-4 shadow-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <PlusCircle size={18} className="text-[#D4AF37]" />
                        <h3 className="text-xs uppercase tracking-wider font-bold text-[#D4AF37]">
                          Product Catalog
                        </h3>
                      </div>
                      <Link
                        href="/vendor/products/add"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center justify-between p-2.5 rounded-xl text-sm font-semibold bg-[#D4AF37]/15 text-[#F5C445] border border-[#D4AF37]/30 hover:bg-[#D4AF37]/25 transition group"
                      >
                        <div className="flex items-center gap-2">
                          <Plus size={16} />
                          <span>Add New Listing</span>
                        </div>
                        <ChevronRight size={16} className="group-hover:translate-x-0.5 transition" />
                      </Link>
                    </div>
                  )}

                  {('withdraw bank payout cashout money'.includes(q) || !q) && (
                    <div className="bg-gradient-to-br from-[#142850] to-[#1B2F5E] border border-[#D4AF37]/25 rounded-2xl p-4 shadow-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <CreditCard size={18} className="text-[#D4AF37]" />
                        <h3 className="text-xs uppercase tracking-wider font-bold text-[#D4AF37]">
                          Banking & Payouts
                        </h3>
                      </div>
                      <Link
                        href="/wallet/send?mode=bank"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center justify-between p-2.5 rounded-xl text-sm font-medium text-[#F5F7FA] hover:bg-white/5 hover:text-[#F5C445] transition group"
                      >
                        <div>
                          <div className="font-semibold">Withdraw to Bank</div>
                          <div className="text-[11px] text-[#A8B0C5]">Instant payout to Nigerian account</div>
                        </div>
                        <div className="flex items-center gap-1">
                          {vendorPendingCashout > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              {vendorPendingCashout} processing
                            </span>
                          )}
                          <ChevronRight size={16} className="text-[#8A94B0] group-hover:text-[#F5C445] shrink-0" />
                        </div>
                      </Link>
                    </div>
                  )}

                  {('catalog profile store kyc'.includes(q) || !q) && (
                    <div className="bg-gradient-to-br from-[#142850] to-[#1B2F5E] border border-[#D4AF37]/25 rounded-2xl p-4 shadow-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <Store size={18} className="text-[#D4AF37]" />
                        <h3 className="text-xs uppercase tracking-wider font-bold text-[#D4AF37]">
                          Store & Credentials
                        </h3>
                      </div>
                      <div className="space-y-1">
                        <Link
                          href="/products"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center justify-between p-2.5 rounded-xl text-sm font-medium text-[#F5F7FA] hover:bg-white/5 hover:text-[#F5C445] transition group"
                        >
                          <div>
                            <div className="font-semibold">Live Marketplace Catalog</div>
                            <div className="text-[11px] text-[#A8B0C5]">View public listings</div>
                          </div>
                          <ChevronRight size={16} className="text-[#8A94B0] group-hover:text-[#F5C445] shrink-0" />
                        </Link>
                        <Link
                          href="/profile"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center justify-between p-2.5 rounded-xl text-sm font-medium text-[#F5F7FA] hover:bg-white/5 hover:text-[#F5C445] transition group"
                        >
                          <div>
                            <div className="font-semibold">Merchant Profile & KYC</div>
                            <div className="text-[11px] text-[#A8B0C5]">Store credentials & bank</div>
                          </div>
                          <ChevronRight size={16} className="text-[#8A94B0] group-hover:text-[#F5C445] shrink-0" />
                        </Link>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* SHOPPER TILES */}
                  {('orders waybill cart tracking'.includes(q) || !q) && (
                    <div className="bg-gradient-to-br from-[#142850] to-[#1B2F5E] border border-[#D4AF37]/25 rounded-2xl p-4 shadow-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <PackageCheck size={18} className="text-[#D4AF37]" />
                        <h3 className="text-xs uppercase tracking-wider font-bold text-[#D4AF37]">
                          Track & Orders
                        </h3>
                      </div>
                      <div className="space-y-1">
                        <Link
                          href="/orders"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center justify-between p-2.5 rounded-xl text-sm font-medium text-[#F5F7FA] hover:bg-white/5 hover:text-[#F5C445] transition group"
                        >
                          <div>
                            <div className="font-semibold">My Orders & Waybill</div>
                            <div className="text-[11px] text-[#A8B0C5]">Track shipments & escrow status</div>
                          </div>
                          <ChevronRight size={16} className="text-[#8A94B0] group-hover:text-[#F5C445] shrink-0" />
                        </Link>
                        <Link
                          href="/cart"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center justify-between p-2.5 rounded-xl text-sm font-medium text-[#F5F7FA] hover:bg-white/5 hover:text-[#F5C445] transition group"
                        >
                          <div>
                            <div className="font-semibold">Shopping Cart ({cartCount})</div>
                            <div className="text-[11px] text-[#A8B0C5]">Checkout pending items</div>
                          </div>
                          <ChevronRight size={16} className="text-[#8A94B0] group-hover:text-[#F5C445] shrink-0" />
                        </Link>
                      </div>
                    </div>
                  )}

                  {('fintech transfer send fund wallet statement'.includes(q) || !q) && (
                    <div className="bg-gradient-to-br from-[#142850] to-[#1B2F5E] border border-[#D4AF37]/25 rounded-2xl p-4 shadow-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <CreditCard size={18} className="text-[#D4AF37]" />
                        <h3 className="text-xs uppercase tracking-wider font-bold text-[#D4AF37]">
                          Fintech Services
                        </h3>
                      </div>
                      <div className="space-y-1">
                        <Link
                          href="/wallet/send"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center justify-between p-2.5 rounded-xl text-sm font-medium text-[#F5F7FA] hover:bg-white/5 hover:text-[#F5C445] transition group"
                        >
                          <div>
                            <div className="font-semibold">Send Money (P2P / Bank)</div>
                            <div className="text-[11px] text-[#A8B0C5]">Transfer to users & banks</div>
                          </div>
                          <ChevronRight size={16} className="text-[#8A94B0] group-hover:text-[#F5C445] shrink-0" />
                        </Link>
                        <Link
                          href="/wallet/fund"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center justify-between p-2.5 rounded-xl text-sm font-medium text-[#F5F7FA] hover:bg-white/5 hover:text-[#F5C445] transition group"
                        >
                          <div>
                            <div className="font-semibold">Fund / Top-up Wallet</div>
                            <div className="text-[11px] text-[#A8B0C5]">Virtual account & cards</div>
                          </div>
                          <ChevronRight size={16} className="text-[#8A94B0] group-hover:text-[#F5C445] shrink-0" />
                        </Link>
                        <Link
                          href="/wallet/history"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center justify-between p-2.5 rounded-xl text-sm font-medium text-[#F5F7FA] hover:bg-white/5 hover:text-[#F5C445] transition group"
                        >
                          <div>
                            <div className="font-semibold">Transaction Statement</div>
                            <div className="text-[11px] text-[#A8B0C5]">Past deposits & receipts</div>
                          </div>
                          <ChevronRight size={16} className="text-[#8A94B0] group-hover:text-[#F5C445] shrink-0" />
                        </Link>
                      </div>
                    </div>
                  )}

                  {('vendor merchant register onboarding feed'.includes(q) || !q) && (
                    <div className="bg-gradient-to-br from-[#142850] to-[#1B2F5E] border border-[#D4AF37]/25 rounded-2xl p-4 shadow-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <Store size={18} className="text-[#D4AF37]" />
                        <h3 className="text-xs uppercase tracking-wider font-bold text-[#D4AF37]">
                          Merchant Portals
                        </h3>
                      </div>
                      <div className="space-y-2">
                        {isVendorApproved ? (
                          <Link
                            href="/vendor/login"
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center justify-between p-2.5 rounded-xl text-sm font-semibold bg-[#D4AF37]/20 text-[#F5C445] border border-[#D4AF37]/40 hover:bg-[#D4AF37]/30 transition group"
                          >
                            <div className="flex items-center gap-1.5">
                              <Lock size={14} className="text-[#D4AF37]" />
                              <span>Vendor Portal Access</span>
                            </div>
                            <ArrowUpRight size={16} className="group-hover:translate-x-0.5 shrink-0" />
                          </Link>
                        ) : (
                          <Link
                            href="/vendor/register"
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center justify-between p-2.5 rounded-xl text-sm font-semibold bg-[#D4AF37]/15 text-[#F5C445] border border-[#D4AF37]/30 hover:bg-[#D4AF37]/25 transition group"
                          >
                            <div>
                              <div>Become a Vendor</div>
                              <div className="text-[11px] text-[#A8B0C5]">Register store & verify NIN</div>
                            </div>
                            <ArrowUpRight size={16} className="group-hover:translate-x-0.5 shrink-0" />
                          </Link>
                        )}
                        {(userRole === 'admin' || userRole === 'staff') && (
                          <Link
                            href="/admin/login"
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center justify-between p-2.5 rounded-xl text-sm font-semibold bg-red-950/30 text-red-300 border border-red-500/30 hover:bg-red-900/40 transition group"
                          >
                            <div className="flex items-center gap-1.5">
                              <ShieldCheck size={14} className="text-red-400" />
                              <span>Admin Console Gateway</span>
                            </div>
                            <ArrowUpRight size={16} className="group-hover:translate-x-0.5 shrink-0" />
                          </Link>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Bottom actions */}
            <div className="mt-auto px-5 py-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#080D21]">
              <div className="flex items-center gap-3">
                {isDashboard && (
                  <button
                    onClick={handleExitDashboard}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-[#D4AF37] border border-[#D4AF37]/40 hover:bg-[#142850] transition active:scale-95"
                  >
                    <ArrowUpRight size={14} />
                    <span>Exit to Customer Storefront</span>
                  </button>
                )}

                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-red-400 hover:text-white hover:bg-red-600/80 border border-red-500/40 transition active:scale-95"
                >
                  <LogOut size={14} />
                  <span>Sign Out of SwiftMart</span>
                </button>
              </div>

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
