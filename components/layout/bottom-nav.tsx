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
    { href: '/', label: 'Home', icon: HomeIcon },
    { href: '/products', label: 'Shop', icon: ShopIcon },
    { href: '/post/create', label: 'Post', icon: PlusIcon },
    {
      href: '/notifications',
      label: 'Alerts',
      icon: BellIcon,
      badge: unreadNotifications,
    },
    { href: username ? `/profile/${username}` : '/login', label: 'Profile', icon: null, avatarUrl },
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

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#2563eb' : '#6b7280'} strokeWidth="2">
      <path d="M3 9l9-7 9 7v11a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" strokeLinejoin="round" />
    </svg>
  );
}
function ShopIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#2563eb' : '#6b7280'} strokeWidth="2">
      <path d="M4 8h16l-1.5 11a1 1 0 0 1-1 1H6.5a1 1 0 0 1-1-1z" />
      <path d="M8 8V6a4 4 0 1 1 8 0v2" />
    </svg>
  );
}
function PlusIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#2563eb' : '#6b7280'} strokeWidth="2">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}
function BellIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#2563eb' : '#6b7280'} strokeWidth="2">
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" strokeLinejoin="round" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  );
}
