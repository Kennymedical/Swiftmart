'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/wallet', label: 'Profit Wallet' },
  { href: '/admin/vendors', label: 'Vendors' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/posts', label: 'Posts' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/payouts', label: 'Payouts' },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-40 bg-[#0F172A] border-b border-[#D4AF37]/20 px-2 pt-2 shadow-lg">
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`whitespace-nowrap rounded-t-lg px-4 py-2 text-xs sm:text-sm font-bold transition ${
                active
                  ? 'bg-[#151B3D] text-[#F5C445] border-t-2 border-x border-[#D4AF37]'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
