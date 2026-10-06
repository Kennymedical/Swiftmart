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
  Plus
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

        try {
          const { count } = await supabase
            .from('cart_items')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id);
          setCartCount(count ?? 0);
        } catch (e) {
          // ignore
        }

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

  if (
    pathname?.startsWith('/login') ||
    pathname?.startsWith('/register') ||
    pathname?.startsWith('/signup')
  ) {
    return null;
  }

  const handleExitDashboard = () => {
    setMenuOpen(false);
    router.push('/');
  };

  const handleSignOut = async () => {
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
      let sub = 'Merchant Operations';
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
    else if (pathname?.startsWith('/post')) titleText = 'Community Feed';

    return (
      <h1 className="text-base sm:text-lg font-bold text-[#D4AF37] tracking-wide">
        {titleText}
      </h1>
    );
  };

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

          <div className="relative w-full max-h-[90vh] overflow-y-auto bg-[#0A1931] border-b-2 border-[#D4AF37]/40 shadow-2xl z-10 flex flex-col animate-in slide-in-from-top duration-300">
            <div className="px-5 pt-5 pb-4 border-b border-white/10 bg-gradient-to-b from-[#111A3E] to-[#0A1028]">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-black tracking-tight">
                      <span className="text-white">Swift</span>
                      <span className="text-[#D4AF37]">Mart</span>
                    </span>
                    <span className="flex items-center gap-1 text-[10px] bg-[#D4AF37]/20 text-[#F5C445] border border-[#D4AF37]/40 px-2 py-0.5 rounded-full font-semibold">
                      <Sparkles size={11} /> {isAdminDashboard ? 'Admin Operations' : isVendorDashboard ? 'Merchant Console' : 'Quick Access Hub'}
                    </span>
                  </div>
                  <p className="text-xs text-[#D4AF37] font-medium mt-1 tracking-wide">
                    {isAdminDashboard
                      ? 'Direct deep-link access to escrow releases, fee governance, payouts, and logistics.'
                      : isVendorDashboard
                      ? 'Quick tools: list new items, direct bank cashout, and public catalog.'
                      : 'Quick actions: tracked orders, instant P2P transfer, wallet top-up, and vendor registration.'}
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

            {/* CURATED UNSEEN ACTIONS ONLY */}
            <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-6xl mx-auto w-full">
              {isAdminDashboard ? (
                /* ADMIN: Hidden tools not present on top/bottom bars */
                <>
                  <div className="bg-gradient-to-br from-[#142850] to-[#1B2F5E] border border-[#D4AF37]/25 shadow-[0_4px_20px_rgba(212,175,55,0.08)] rounded-2xl p-4 transition">
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
                          <div className="font-semibold">Commission & Fee Governance</div>
                          <div className="text-[11px] text-[#A8B0C5]">Adjust markups, commissions & audit trail</div>
                        </div>
                        <ChevronRight size={16} className="text-[#8A94B0] group-hover:text-[#F5C445] group-hover:translate-x-0.5 transition shrink-0" />
                      </Link>
                      <Link
                        href="/admin/payouts"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center justify-between p-2.5 rounded-xl text-sm font-medium text-[#F5F7FA] hover:bg-white/5 hover:text-[#F5C445] transition group"
                      >
                        <div>
                          <div className="font-semibold">Vendor Payout Queue</div>
                          <div className="text-[11px] text-[#A8B0C5]">Verify bank payout requests</div>
                        </div>
                        <ChevronRight size={16} className="text-[#8A94B0] group-hover:text-[#F5C445] group-hover:translate-x-0.5 transition shrink-0" />
                      </Link>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-[#142850] to-[#1B2F5E] border border-[#D4AF37]/25 shadow-[0_4px_20px_rgba(212,175,55,0.08)] rounded-2xl p-4 transition">
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
                          <div className="text-[11px] text-[#A8B0C5]">Release funds upon delivery</div>
                        </div>
                        <ChevronRight size={16} className="text-[#8A94B0] group-hover:text-[#F5C445] group-hover:translate-x-0.5 transition shrink-0" />
                      </Link>
                      <Link
                        href="/admin/logistics"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center justify-between p-2.5 rounded-xl text-sm font-medium text-[#F5F7FA] hover:bg-white/5 hover:text-[#F5C445] transition group"
                      >
                        <div>
                          <div className="font-semibold">Logistics & Waybill Surcharges</div>
                          <div className="text-[11px] text-[#A8B0C5]">Configure delivery fee calculations</div>
                        </div>
                        <ChevronRight size={16} className="text-[#8A94B0] group-hover:text-[#F5C445] group-hover:translate-x-0.5 transition shrink-0" />
                      </Link>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-[#142850] to-[#1B2F5E] border border-[#D4AF37]/25 shadow-[0_4px_20px_rgba(212,175,55,0.08)] rounded-2xl p-4 transition">
                    <div className="flex items-center gap-2 mb-3">
                      <Users size={18} className="text-[#D4AF37]" />
                      <h3 className="text-xs uppercase tracking-wider font-bold text-[#D4AF37]">
                        Identity & Moderation
                      </h3>
                    </div>
                    <div className="space-y-1">
                      <Link
                        href="/admin/kyc"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center justify-between p-2.5 rounded-xl text-sm font-medium text-[#F5F7FA] hover:bg-white/5 hover:text-[#F5C445] transition group"
                      >
                        <div>
                          <div className="font-semibold">Paystack NIN & KYC Verification</div>
                          <div className="text-[11px] text-[#A8B0C5]">Audit pending merchant identities</div>
                        </div>
                        <ChevronRight size={16} className="text-[#8A94B0] group-hover:text-[#F5C445] group-hover:translate-x-0.5 transition shrink-0" />
                      </Link>
                      <Link
                        href="/admin/users"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center justify-between p-2.5 rounded-xl text-sm font-medium text-[#F5F7FA] hover:bg-white/5 hover:text-[#F5C445] transition group"
                      >
                        <div>
                          <div className="font-semibold">User Role Administration</div>
                          <div className="text-[11px] text-[#A8B0C5]">Audit shopper & vendor privileges</div>
                        </div>
                        <ChevronRight size={16} className="text-[#8A94B0] group-hover:text-[#F5C445] group-hover:translate-x-0.5 transition shrink-0" />
                      </Link>
                      <Link
                        href="/admin/posts"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center justify-between p-2.5 rounded-xl text-sm font-medium text-[#F5F7FA] hover:bg-white/5 hover:text-[#F5C445] transition group"
                      >
                        <div>
                          <div className="font-semibold">Community Feed Moderation</div>
                          <div className="text-[11px] text-[#A8B0C5]">Review user posts & reports</div>
                        </div>
                        <ChevronRight size={16} className="text-[#8A94B0] group-hover:text-[#F5C445] group-hover:translate-x-0.5 transition shrink-0" />
                      </Link>
                    </div>
                  </div>
                </>
              ) : isVendorDashboard ? (
                /* VENDOR: Hidden actions not present on bottom bar (Overview & Wallet) */
                <>
                  <div className="bg-gradient-to-br from-[#142850] to-[#1B2F5E] border border-[#D4AF37]/25 shadow-[0_4px_20px_rgba(212,175,55,0.08)] rounded-2xl p-4 transition">
                    <div className="flex items-center gap-2 mb-3">
                      <PlusCircle size={18} className="text-[#D4AF37]" />
                      <h3 className="text-xs uppercase tracking-wider font-bold text-[#D4AF37]">
                        Product Management
                      </h3>
                    </div>
                    <div className="space-y-1">
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
                  </div>

                  <div className="bg-gradient-to-br from-[#142850] to-[#1B2F5E] border border-[#D4AF37]/25 shadow-[0_4px_20px_rgba(212,175,55,0.08)] rounded-2xl p-4 transition">
                    <div className="flex items-center gap-2 mb-3">
                      <CreditCard size={18} className="text-[#D4AF37]" />
                      <h3 className="text-xs uppercase tracking-wider font-bold text-[#D4AF37]">
                        Banking & Cashout
                      </h3>
                    </div>
                    <div className="space-y-1">
                      <Link
                        href="/wallet/send?mode=bank"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center justify-between p-2.5 rounded-xl text-sm font-medium text-[#F5F7FA] hover:bg-white/5 hover:text-[#F5C445] transition group"
                      >
                        <div>
                          <div className="font-semibold">Withdraw to Bank</div>
                          <div className="text-[11px] text-[#A8B0C5]">Instant payout to Nigerian account</div>
                        </div>
                        <ChevronRight size={16} className="text-[#8A94B0] group-hover:text-[#F5C445] group-hover:translate-x-0.5 transition shrink-0" />
                      </Link>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-[#142850] to-[#1B2F5E] border border-[#D4AF37]/25 shadow-[0_4px_20px_rgba(212,175,55,0.08)] rounded-2xl p-4 transition">
                    <div className="flex items-center gap-2 mb-3">
                      <Store size={18} className="text-[#D4AF37]" />
                      <h3 className="text-xs uppercase tracking-wider font-bold text-[#D4AF37]">
                        Catalog & Profile
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
                          <div className="text-[11px] text-[#A8B0C5]">Check your products in store</div>
                        </div>
                        <ChevronRight size={16} className="text-[#8A94B0] group-hover:text-[#F5C445] group-hover:translate-x-0.5 transition shrink-0" />
                      </Link>
                      <Link
                        href="/profile"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center justify-between p-2.5 rounded-xl text-sm font-medium text-[#F5F7FA] hover:bg-white/5 hover:text-[#F5C445] transition group"
                      >
                        <div>
                          <div className="font-semibold">Merchant Profile & KYC</div>
                          <div className="text-[11px] text-[#A8B0C5]">View business & bank info</div>
                        </div>
                        <ChevronRight size={16} className="text-[#8A94B0] group-hover:text-[#F5C445] group-hover:translate-x-0.5 transition shrink-0" />
                      </Link>
                    </div>
                  </div>
                </>
              ) : (
                /* SHOPPER: Quick actions not present on bottom nav */
                <>
                  <div className="bg-gradient-to-br from-[#142850] to-[#1B2F5E] border border-[#D4AF37]/25 shadow-[0_4px_20px_rgba(212,175,55,0.08)] rounded-2xl p-4 transition">
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
                          <div className="text-[11px] text-[#A8B0C5]">Track shipments & escrow deliveries</div>
                        </div>
                        <ChevronRight size={16} className="text-[#8A94B0] group-hover:text-[#F5C445] group-hover:translate-x-0.5 transition shrink-0" />
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
                        <ChevronRight size={16} className="text-[#8A94B0] group-hover:text-[#F5C445] group-hover:translate-x-0.5 transition shrink-0" />
                      </Link>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-[#142850] to-[#1B2F5E] border border-[#D4AF37]/25 shadow-[0_4px_20px_rgba(212,175,55,0.08)] rounded-2xl p-4 transition">
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
                          <div className="text-[11px] text-[#A8B0C5]">Instant transfer to users & banks</div>
                        </div>
                        <ChevronRight size={16} className="text-[#8A94B0] group-hover:text-[#F5C445] group-hover:translate-x-0.5 transition shrink-0" />
                      </Link>
                      <Link
                        href="/wallet/fund"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center justify-between p-2.5 rounded-xl text-sm font-medium text-[#F5F7FA] hover:bg-white/5 hover:text-[#F5C445] transition group"
                      >
                        <div>
                          <div className="font-semibold">Fund / Top-up Wallet</div>
                          <div className="text-[11px] text-[#A8B0C5]">Virtual account & Paystack card</div>
                        </div>
                        <ChevronRight size={16} className="text-[#8A94B0] group-hover:text-[#F5C445] group-hover:translate-x-0.5 transition shrink-0" />
                      </Link>
                      <Link
                        href="/wallet/history"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center justify-between p-2.5 rounded-xl text-sm font-medium text-[#F5F7FA] hover:bg-white/5 hover:text-[#F5C445] transition group"
                      >
                        <div>
                          <div className="font-semibold">Transaction Statement</div>
                          <div className="text-[11px] text-[#A8B0C5]">View and download past receipts</div>
                        </div>
                        <ChevronRight size={16} className="text-[#8A94B0] group-hover:text-[#F5C445] group-hover:translate-x-0.5 transition shrink-0" />
                      </Link>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-[#142850] to-[#1B2F5E] border border-[#D4AF37]/25 shadow-[0_4px_20px_rgba(212,175,55,0.08)] rounded-2xl p-4 transition">
                    <div className="flex items-center gap-2 mb-3">
                      <Store size={18} className="text-[#D4AF37]" />
                      <h3 className="text-xs uppercase tracking-wider font-bold text-[#D4AF37]">
                        Merchant Onboarding & Feed
                      </h3>
                    </div>
                    <div className="space-y-2">
                      <Link
                        href="/vendor/register"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center justify-between p-2.5 rounded-xl text-sm font-semibold bg-[#D4AF37]/15 text-[#F5C445] border border-[#D4AF37]/30 hover:bg-[#D4AF37]/25 transition group"
                      >
                        <div>
                          <div>Become a Vendor</div>
                          <div className="text-[11px] text-[#A8B0C5]">Register store & verify Paystack NIN</div>
                        </div>
                        <ArrowUpRight size={16} className="group-hover:translate-x-0.5 transition shrink-0" />
                      </Link>

                      <Link
                        href="/post"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center justify-between p-2.5 rounded-xl text-sm font-medium text-[#F5F7FA] hover:bg-white/5 hover:text-[#F5C445] transition group"
                      >
                        <div>
                          <div className="font-semibold">Share to Community Feed</div>
                          <div className="text-[11px] text-[#A8B0C5]">Post updates and products</div>
                        </div>
                        <ChevronRight size={16} className="text-[#8A94B0] group-hover:text-[#F5C445] group-hover:translate-x-0.5 transition shrink-0" />
                      </Link>
                    </div>
                  </div>
                </>
              )}
            </div>

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
