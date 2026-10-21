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
  matches: (pathname: string) => boolean;
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
    matches: (path) =>
      path.startsWith('/admin/wallet') ||
      path.startsWith('/admin/payouts') ||
      path.startsWith('/admin/orders'),
    subTabs: [
      {
        href: '/admin/wallet',
        label: 'Profit Wallet',
        matches: (path) => path === '/admin/wallet' || path.startsWith('/admin/wallet/'),
      },
      {
        href: '/admin/orders',
        label: 'Users Escrows',
        matches: (path) => path === '/admin/orders' || path.startsWith('/admin/orders/'),
      },
      {
        href: '/admin/payouts',
        label: 'Payout Queues',
        matches: (path) => path === '/admin/payouts' || path.startsWith('/admin/payouts/'),
      },
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
      path.startsWith('/admin/kyc') ||
      path.startsWith('/admin/security') ||
      path.startsWith('/admin/staff'),
    subTabs: [
      {
        href: '/admin/vendors',
        label: 'Vendors',
        matches: (path) => path === '/admin/vendors' || path.startsWith('/admin/vendors/'),
      },
      {
        href: '/admin/users',
        label: 'Customers & Staff',
        matches: (path) =>
          path === '/admin/users' ||
          path.startsWith('/admin/users/') ||
          path === '/admin/staff' ||
          path.startsWith('/admin/staff/'),
      },
      {
        href: '/admin/logistics',
        label: 'Logistics Partners',
        matches: (path) => path === '/admin/logistics' || path.startsWith('/admin/logistics/'),
      },
      {
        href: '/admin/kyc',
        label: 'KYC Approvals',
        matches: (path) => path === '/admin/kyc' || path.startsWith('/admin/kyc/'),
      },
      {
        href: '/admin/security',
        label: 'Security Alerts',
        matches: (path) => path === '/admin/security' || path.startsWith('/admin/security/'),
      },
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
      {
        href: '/admin/products',
        label: 'Product Lists',
        matches: (path) => path === '/admin/products' || path.startsWith('/admin/products/'),
      },
      {
        href: '/admin/commissions',
        label: 'Markups & Rates',
        matches: (path) => path === '/admin/commissions' || path.startsWith('/admin/commissions/'),
      },
      {
        href: '/admin/posts',
        label: 'Feed Moderation',
        matches: (path) => path === '/admin/posts' || path.startsWith('/admin/posts/'),
      },
    ],
  },
];

export function AdminNav() {
  const pathname = usePathname();
  const currentPillar = PILLARS.find((p) => p.matches(pathname)) || PILLARS[0];

  return (
    <nav
      aria-label="Admin Navigation"
      className="bg-[#0A1931]/95 border-b border-[#D4AF37]/25 shadow-lg"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Tier 1: Primary Pillars */}
        <div
          role="tablist"
          aria-label="Admin Sections"
          className="flex gap-2 sm:gap-4 overflow-x-auto py-2.5 scrollbar-none touch-pan-x"
        >
          {PILLARS.map((pillar) => {
            const Icon = pillar.icon;
            const isActive = pillar.matches(pathname);
            return (
              <Link
                key={pillar.id}
                href={pillar.href}
                role="tab"
                aria-selected={isActive}
                aria-current={isActive ? 'page' : undefined}
                className={`flex items-center gap-2 whitespace-nowrap px-3.5 py-2 text-xs sm:text-sm font-bold transition-all rounded-xl min-h-[40px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A1931] ${
                  isActive
                    ? 'text-[#F5C445] bg-[#142850] border border-[#D4AF37]/60 shadow-[0_2px_14px_rgba(212,175,55,0.25)] ring-1 ring-[#D4AF37]/40'
                    : 'text-[#A8B0C5] hover:text-[#F5F7FA] hover:bg-[#142850]/50 border-transparent'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive
                      ? 'text-[#F5C445] drop-shadow-[0_0_6px_rgba(212,175,55,0.4)]'
                      : 'text-[#8A94B0]'
                  }`}
                />
                <span>{pillar.label}</span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] shadow-[0_0_8px_#D4AF37] ml-0.5" />
                )}
              </Link>
            );
          })}
        </div>

        {/* Tier 2: Contextual Drill-Down Sub-Tabs */}
        {currentPillar.subTabs && currentPillar.subTabs.length > 0 && (
          <div
            role="tablist"
            aria-label={`${currentPillar.label} sub-tabs`}
            className="flex gap-1.5 overflow-x-auto pt-1 pb-2 border-t border-[#D4AF37]/15 scrollbar-none -mx-1 px-1 touch-pan-x"
          >
            {currentPillar.subTabs.map((sub) => {
              const isSubActive = sub.matches(pathname);
              return (
                <Link
                  key={sub.href}
                  href={sub.href}
                  role="tab"
                  aria-selected={isSubActive}
                  aria-current={isSubActive ? 'page' : undefined}
                  className={`text-xs px-3 py-1.5 font-semibold transition-all rounded-lg whitespace-nowrap min-h-[32px] flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] focus-visible:ring-offset-1 focus-visible:ring-offset-[#0A1931] ${
                    isSubActive
                      ? 'text-[#F5C445] bg-[#1A3160] border border-[#D4AF37]/40 font-bold shadow-sm'
                      : 'text-[#8A94B0] hover:text-[#F5F7FA] hover:bg-white/5'
                  }`}
                >
                  {isSubActive && (
                    <span className="w-1 h-1 rounded-full bg-[#D4AF37]" />
                  )}
                  <span>{sub.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
}
