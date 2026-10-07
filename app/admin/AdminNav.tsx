'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  WalletCards,
  Users,
  ShoppingBag,
} from 'lucide-react';

interface SubTab {
  href: string;
  label: string;
}

interface Pillar {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  matches: (pathname: string) => boolean;
  subTabs?: SubTab[];
}

const PILLARS: Pillar[] = [
  {
    id: 'overview',
    label: 'Overview',
    href: '/admin',
    icon: LayoutDashboard,
    matches: (path) => path === '/admin',
  },
  {
    id: 'treasury',
    label: 'Ledger & Treasury',
    href: '/admin/wallet',
    icon: WalletCards,
    matches: (path) => path.startsWith('/admin/wallet') || path.startsWith('/admin/payouts') || path.startsWith('/admin/orders'),
    subTabs: [
      { href: '/admin/wallet', label: 'Profit Wallet' },
      { href: '/admin/orders', label: 'Users Escrows' },
      { href: '/admin/payouts', label: 'Payout Queues' },
    ],
  },
  {
    id: 'directory',
    label: 'Directory',
    href: '/admin/vendors',
    icon: Users,
    matches: (path) =>
      path.startsWith('/admin/vendors') ||
      path.startsWith('/admin/users') ||
      path.startsWith('/admin/logistics') ||
      path.startsWith('/admin/kyc') || path.startsWith('/admin/security'),
    subTabs: [
      { href: '/admin/vendors', label: 'Vendors' },
      { href: '/admin/users', label: 'Customers & Staff' },
      { href: '/admin/logistics', label: 'Logistics Partners' },
      { href: '/admin/kyc', label: 'KYC Approvals' },
      { href: '/admin/security', label: 'Security Alerts' },
    ],
  },
  {
    id: 'marketplace',
    label: 'Catalog & Marketplace',
    href: '/admin/products',
    icon: ShoppingBag,
    matches: (path) =>
      path.startsWith('/admin/products') ||
      path.startsWith('/admin/commissions') ||
      path.startsWith('/admin/posts'),
    subTabs: [
      { href: '/admin/products', label: 'Product Lists' },
      { href: '/admin/commissions', label: 'Markups & Rates' },
      { href: '/admin/posts', label: 'Feed Moderation' },
    ],
  },
];

export function AdminNav() {
  const pathname = usePathname();
  const currentPillar = PILLARS.find((p) => p.matches(pathname)) || PILLARS[0];

  return (
    <nav className="bg-[#0A1931]/95 border-b border-[#D4AF37]/25 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Tier 1: Primary Pillars */}
        <div className="flex gap-2 sm:gap-4 overflow-x-auto py-2.5 scrollbar-none">
          {PILLARS.map((pillar) => {
            const Icon = pillar.icon;
            const isActive = pillar.matches(pathname);
            return (
              <Link
                key={pillar.id}
                href={pillar.href}
                className={`flex items-center gap-2 whitespace-nowrap px-3.5 py-2 text-xs sm:text-sm font-bold transition rounded-xl ${
                  isActive
                    ? 'text-[#D4AF37] bg-[#142850] border border-[#D4AF37]/40 shadow-[0_2px_12px_rgba(212,175,55,0.18)]'
                    : 'text-[#A8B0C5] hover:text-[#F5F7FA] hover:bg-[#142850]/40'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#D4AF37]' : 'text-[#A8B0C5]'}`} />
                <span>{pillar.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Tier 2: Contextual Drill-Down Sub-Tabs */}
        {currentPillar.subTabs && currentPillar.subTabs.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pt-1 pb-2.5 border-t border-[#D4AF37]/15">
            {currentPillar.subTabs.map((sub) => {
              const isSubActive = pathname === sub.href;
              return (
                <Link
                  key={sub.href}
                  href={sub.href}
                  className={`text-xs px-3 py-1 font-semibold transition rounded-lg ${
                    isSubActive
                      ? 'text-[#E8C874] bg-[#1B2F5E] border-b-2 border-[#D4AF37]'
                      : 'text-[#8A94B0] hover:text-[#E8C874]'
                  }`}
                >
                  {sub.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
}
