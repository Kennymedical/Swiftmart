'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/vendors', label: 'Vendors' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/payouts', label: 'Payouts' },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-40 bg-[#0F172A] px-2 pt-3 shadow-lg">
      <p className="px-3 pb-2 text-lg font-bold text-white">
        Swift<span className="text-[#D4AF37]">Mart</span> Admin
      </p>
      <div className="flex gap-1 overflow-x-auto pb-2">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`whitespace-nowrap rounded-t-lg px-4 py-2 text-sm font-medium ${
                active ? 'bg-gray-50 text-[#0F172A]' : 'text-slate-300'
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
