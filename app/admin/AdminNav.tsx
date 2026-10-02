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
    <nav className="sticky top-[57px] z-40 bg-[#0A1931]/90 backdrop-blur-md border-b border-[#D4AF37]/20 px-3 pt-2 shadow-lg">
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`whitespace-nowrap px-3.5 py-1.5 text-xs sm:text-sm font-bold transition rounded-lg ${
                active
                  ? 'text-[#D4AF37] border-b-2 border-[#D4AF37] bg-[#142850]/60 shadow-[0_2px_10px_rgba(212,175,55,0.15)]'
                  : 'text-[#8A94B0] hover:text-[#F5F7FA] hover:bg-[#142850]/30'
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
