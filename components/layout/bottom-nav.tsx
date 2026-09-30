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
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0A1028]/95 backdrop-blur-md border-t border-[#D4AF37]/25 px-2 py-2 flex items-center justify-around sm:hidden">
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
              isActive ? 'text-[#F5C445]' : 'text-[#A0A3B1] hover:text-white'
            }`}
          >
            <div
              className={`p-1 rounded-full transition-all ${
                isActive
                  ? 'bg-[#D4AF37]/20 border border-[#D4AF37]'
                  : 'bg-transparent border border-transparent'
              }`}
            >
              <Icon size={20} className={isActive ? 'text-[#F5C445]' : 'text-[#A0A3B1]'} />
            </div>
            {item.badge && item.badge > 0 ? (
              <span className="absolute -top-1 right-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold text-white">
                {item.badge > 9 ? '9+' : item.badge}
              </span>
            ) : null}
            <span className={`text-[10px] mt-0.5 ${isActive ? 'font-bold text-[#F5C445]' : 'font-medium'}`}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
