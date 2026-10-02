'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ShoppingBag, Wallet, Bell, User } from 'lucide-react';

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
