'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  ShoppingBag,
  Wallet,
  Bell,
  User,
  ShieldCheck,
  PackageCheck,
  CreditCard,
  Store,
  PlusCircle,
  History
} from 'lucide-react';

export interface BottomNavProps {
  unreadNotifications?: number;
  username?: string;
  avatarUrl?: string | null;
}

export function BottomNav({ unreadNotifications = 0 }: BottomNavProps) {
  const pathname = usePathname();

  // Hide on auth pages
  if (
    pathname?.startsWith('/login') ||
    pathname?.startsWith('/register') ||
    pathname?.startsWith('/signup')
  ) {
    return null;
  }

  const isAdmin = pathname?.startsWith('/admin');
  const isVendor = pathname?.startsWith('/vendor');

  // Operational items for Admin
  if (isAdmin) {
    const adminItems = [
      { href: '/admin', label: 'Console', icon: ShieldCheck, matchExact: true },
      { href: '/admin/orders', label: 'Escrow', icon: PackageCheck, matchExact: false },
      { href: '/admin/payouts', label: 'Payouts', icon: CreditCard, matchExact: false },
      { href: '/admin/wallet', label: 'Treasury', icon: Wallet, matchExact: false },
      { href: '/admin/vendors', label: 'Vendors', icon: Store, matchExact: false },
    ];

    return (
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0A1931]/95 backdrop-blur-md border-t border-[#D4AF37]/30 px-2 py-2 flex items-center justify-around sm:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.4)]">
        {adminItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.matchExact
            ? pathname === item.href
            : pathname === item.href || pathname?.startsWith(item.href);

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex flex-col items-center relative transition-colors ${
                isActive ? 'text-[#F5EAC2]' : 'text-[#E9C86A]/80 hover:text-[#E9C86A]'
              }`}
            >
              <div
                className={`p-1.5 rounded-xl transition-all ${
                  isActive
                    ? 'bg-gradient-to-b from-[#142850] to-[#1B2F5E] border border-[#D4AF37]/60 shadow-[0_0_12px_rgba(212,175,55,0.35)]'
                    : 'bg-transparent border border-transparent'
                }`}
              >
                <Icon size={19} className={isActive ? 'text-[#D4AF37]' : 'text-[#E9C86A]'} />
              </div>
              <span className={`text-[10px] mt-0.5 ${isActive ? 'font-bold text-[#F5EAC2]' : 'font-medium text-[#E9C86A]'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    );
  }

  // Operational items for Vendor
  if (isVendor) {
    const vendorItems = [
      { href: '/vendor', label: 'Store', icon: Store, matchExact: true },
      { href: '/vendor/products/add', label: 'Add Item', icon: PlusCircle, matchExact: true },
      { href: '/vendor/wallet', label: 'Wallet', icon: Wallet, matchExact: false },
      { href: '/products', label: 'Catalog', icon: ShoppingBag, matchExact: false },
      { href: '/', label: 'Home', icon: Home, matchExact: true },
    ];

    return (
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0A1A3A]/95 backdrop-blur-md border-t border-[#E9C86A]/30 px-2 py-2 flex items-center justify-around sm:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.4)]">
        {vendorItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.matchExact
            ? pathname === item.href
            : pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex flex-col items-center relative transition-colors ${
                isActive ? 'text-[#F5EAC2]' : 'text-[#E9C86A]/80 hover:text-[#E9C86A]'
              }`}
            >
              <div
                className={`p-1.5 rounded-xl transition-all ${
                  isActive
                    ? 'bg-gradient-to-b from-[#1E3A7A] to-[#142A5E] border border-[#E9C86A]/60 shadow-[0_0_12px_rgba(233,200,106,0.35)]'
                    : 'bg-transparent border border-transparent'
                }`}
              >
                <Icon size={19} className={isActive ? 'text-[#F5EAC2]' : 'text-[#E9C86A]'} />
              </div>
              <span className={`text-[10px] mt-0.5 ${isActive ? 'font-bold text-[#F5EAC2]' : 'font-medium text-[#E9C86A]'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    );
  }

  // Standard Shopper navigation
  const items = [
    { href: '/', label: 'Home', icon: Home, matchExact: true },
    { href: '/products', label: 'Shop', icon: ShoppingBag, matchExact: false },
    { href: '/wallet', label: 'Wallet', icon: Wallet, matchExact: false },
    { href: '/notifications', label: 'Alerts', icon: Bell, badge: unreadNotifications, matchExact: false },
    { href: '/profile', label: 'Profile', icon: User, matchExact: false },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0A1A3A]/95 backdrop-blur-md border-t border-[#E9C86A]/30 px-2 py-2 flex items-center justify-around sm:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.4)]">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = item.matchExact
          ? pathname === item.href
          : pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));

        return (
          <Link
            key={item.label}
            href={item.href}
            className={`flex flex-col items-center relative transition-colors ${
              isActive ? 'text-[#F5EAC2]' : 'text-[#E9C86A]/80 hover:text-[#E9C86A]'
            }`}
          >
            <div
              className={`p-1.5 rounded-xl transition-all ${
                isActive
                  ? 'bg-gradient-to-b from-[#1E3A7A] to-[#142A5E] border border-[#E9C86A]/60 shadow-[0_0_12px_rgba(233,200,106,0.35)]'
                  : 'bg-transparent border border-transparent'
              }`}
            >
              <Icon size={19} className={isActive ? 'text-[#F5EAC2]' : 'text-[#E9C86A]'} />
            </div>
            {item.badge && item.badge > 0 ? (
              <span className="absolute -top-1 right-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold text-white shadow-sm">
                {item.badge > 9 ? '9+' : item.badge}
              </span>
            ) : null}
            <span className={`text-[10px] mt-0.5 ${isActive ? 'font-bold text-[#F5EAC2]' : 'font-medium text-[#E9C86A]'}`}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
