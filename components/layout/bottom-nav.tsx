'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  ShoppingBag,
  Bell,
  User,
  LayoutDashboard,
  Wallet,
  Users,
  LogOut,
} from 'lucide-react';

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  // Suppress all navigation bars completely while logging in or registering
  const isAuthRoute =
    pathname?.startsWith('/login') ||
    pathname?.startsWith('/register') ||
    pathname?.startsWith('/signup') ||
    pathname?.startsWith('/admin/login') ||
    pathname?.startsWith('/vendor/login');

  if (isAuthRoute) {
    return null;
  }

  const isAdmin = pathname.startsWith('/admin');
  const isVendor = pathname.startsWith('/vendor');

  const handleExitDashboard = () => {
    router.push('/');
  };

  // ADMIN DASHBOARD BOTTOM NAV: Exactly 3 buttons
  // 1. Overview (/admin)
  // 2. Directory (/admin/vendors)
  // 3. Exit Dashboard (Back to Storefront)
  if (isAdmin) {
    return (
      <nav
        aria-label="Admin Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 bg-[#0A1931]/95 backdrop-blur-md border-t border-[#D4AF37]/30 px-6 py-2.5 shadow-[0_-4px_20px_rgba(0,0,0,0.5)] md:hidden"
      >
        <div className="flex items-center justify-around max-w-md mx-auto">
          <Link
            href="/admin"
            className={`flex flex-col items-center gap-1 text-[11px] font-bold transition ${
              pathname === '/admin' ? 'text-[#D4AF37]' : 'text-[#A8B0C5] hover:text-[#D4AF37]'
            }`}
          >
            <LayoutDashboard size={20} />
            <span>Overview</span>
          </Link>

          <Link
            href="/admin/vendors"
            className={`flex flex-col items-center gap-1 text-[11px] font-bold transition ${
              pathname.startsWith('/admin/vendors') ? 'text-[#D4AF37]' : 'text-[#A8B0C5] hover:text-[#D4AF37]'
            }`}
          >
            <Users size={20} />
            <span>Directory</span>
          </Link>

          <button
            onClick={handleExitDashboard}
            type="button"
            className="flex flex-col items-center gap-1 text-[11px] font-bold text-red-400 hover:text-red-300 transition"
          >
            <LogOut size={20} />
            <span>Exit Admin</span>
          </button>
        </div>
      </nav>
    );
  }

  // VENDOR DASHBOARD BOTTOM NAV: Exactly 3 buttons
  // 1. Overview (/vendor)
  // 2. Wallet (/vendor/wallet) at the center
  // 3. Exit Dashboard (Back to Storefront)
  if (isVendor) {
    return (
      <nav
        aria-label="Vendor Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 bg-[#0A1931]/95 backdrop-blur-md border-t border-[#D4AF37]/30 px-6 py-2.5 shadow-[0_-4px_20px_rgba(0,0,0,0.5)] md:hidden"
      >
        <div className="flex items-center justify-around max-w-md mx-auto">
          <Link
            href="/vendor"
            className={`flex flex-col items-center gap-1 text-[11px] font-bold transition ${
              pathname === '/vendor' ? 'text-[#D4AF37]' : 'text-[#A8B0C5] hover:text-[#D4AF37]'
            }`}
          >
            <LayoutDashboard size={20} />
            <span>Overview</span>
          </Link>

          <Link
            href="/vendor/wallet"
            className={`flex flex-col items-center gap-1 text-[11px] font-bold transition ${
              pathname === '/vendor/wallet' ? 'text-[#D4AF37]' : 'text-[#A8B0C5] hover:text-[#D4AF37]'
            }`}
          >
            <div className="p-1 rounded-full bg-[#142850] border border-[#D4AF37]/40 shadow-[0_0_10px_rgba(212,175,55,0.2)]">
              <Wallet size={20} className="text-[#D4AF37]" />
            </div>
            <span>Wallet</span>
          </Link>

          <button
            onClick={handleExitDashboard}
            type="button"
            className="flex flex-col items-center gap-1 text-[11px] font-bold text-red-400 hover:text-red-300 transition"
          >
            <LogOut size={20} />
            <span>Exit Vendor</span>
          </button>
        </div>
      </nav>
    );
  }

  // STANDARD CONSUMER BOTTOM NAV
  const consumerLinks = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/products', label: 'Shop', icon: ShoppingBag },
    { href: '/wallet', label: 'Wallet', icon: Wallet },
    { href: '/notifications', label: 'Alerts', icon: Bell },
    { href: '/profile', label: 'Profile', icon: User },
  ];

  return (
    <nav
      aria-label="Consumer Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-[#0A1931]/95 backdrop-blur-md border-t border-[#D4AF37]/30 px-4 py-2 shadow-[0_-4px_20px_rgba(0,0,0,0.5)] md:hidden"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {consumerLinks.map(({ href, label, icon: Icon }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 text-[10px] font-medium transition ${
                isActive ? 'text-[#D4AF37] font-bold' : 'text-[#A8B0C5] hover:text-[#D4AF37]'
              }`}
            >
              <Icon size={18} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
