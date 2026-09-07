'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface BottomNavProps {
  username?: string | null;
  avatarUrl?: string | null;
  unreadNotifications?: number;
}

export function BottomNav({ username, avatarUrl, unreadNotifications = 0 }: BottomNavProps) {
  const pathname = usePathname();

  const items = [
    { href: '/products', label: 'Shop', icon: ShopIcon },
    { href: '/wallet', label: 'Wallet', icon: WalletIcon },
    {
      href: '/notifications',
      label: 'Alerts',
      icon: BellIcon,
      badge: unreadNotifications,
    },
    { href: username ? '/profile' : '/login', label: 'Profile', icon: null, avatarUrl },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t bg-white sm:hidden">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.label}
            href={item.href}
            className="relative flex flex-1 flex-col items-center gap-0.5 py-2"
          >
            {item.avatarUrl !== undefined ? (
              <div className="h-6 w-6 overflow-hidden rounded-full bg-gray-200">
                {item.avatarUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.avatarUrl} alt="Profile" className="h-full w-full object-cover" />
                )}
              </div>
            ) : (
              item.icon && <item.icon active={active} />
            )}
            {!!item.badge && (
              <span className="absolute right-4 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                {item.badge > 9 ? '9+' : item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function ShopIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#D4AF37' : '#6b7280'} strokeWidth="2">
      <path d="M4 8h16l-1.5 11a1 1 0 0 1-1 1H6.5a1 1 0 0 1-1-1z" />
      <path d="M8 8V6a4 4 0 1 1 8 0v2" />
    </svg>
  );
}
function WalletIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#D4AF37' : '#6b7280'} strokeWidth="2">
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18" />
      <circle cx="16.5" cy="14.5" r="1" fill={active ? '#D4AF37' : '#6b7280'} />
    </svg>
  );
}
function BellIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#D4AF37' : '#6b7280'} strokeWidth="2">
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" strokeLinejoin="round" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  );
                }
