'use client';

import { useEffect, useState } from 'react';
import { useState as useMenuState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

const MENU_ITEMS = [
  { href: '/', label: 'Home' },
  { href: '/products', label: 'Shop' },
  { href: '/cart', label: 'Cart' },
  { href: '/post/create', label: 'Create Post' },
  { href: '/notifications', label: 'Notifications' },
  { href: '/wallet', label: 'Wallet' },
  { href: '/profile', label: 'Profile' },
];

export function Header() {
  const supabase = createClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    async function loadCartCount() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { count } = await supabase
        .from('cart_items')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);

      setCartCount(count ?? 0);
    }
    loadCartCount();
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full bg-[#0F172A] shadow-lg">
      <div className="flex items-center justify-between px-4 py-3">
        <h1 className="text-2xl font-bold">
          <span className="text-white">Swift</span>
          <span className="text-[#D4AF37]">Mart</span>
        </h1>

        <div className="flex items-center gap-2">
          <Link href="/cart" className="relative p-2" aria-label="Cart">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="2">
              <path d="M4 8h16l-1.5 11a1 1 0 0 1-1 1H6.5a1 1 0 0 1-1-1z" />
              <path d="M8 8V6a4 4 0 1 1 8 0v2" />
            </svg>
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                {cartCount > 9 ? '9+' : cartCount}
              </span>
            )}
          </Link>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
            className="flex flex-col gap-1.5 p-2"
          >
            <span className="block w-6 h-0.5 bg-white" />
            <span className="block w-6 h-0.5 bg-white" />
            <span className="block w-6 h-0.5 bg-white" />
          </button>
        </div>
      </div>

      {menuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setMenuOpen(false)}
          />
          <nav className="absolute right-4 top-14 z-50 w-48 bg-white rounded-xl shadow-xl overflow-hidden">
            {MENU_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-3 text-sm text-[#0F172A] font-medium hover:bg-gray-50 border-b border-gray-100 last:border-0"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </>
      )}
    </header>
  );
}
