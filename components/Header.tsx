'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ShoppingCart, Menu, X, Home, ShoppingBag, Wallet, Bell, User, PlusCircle, Store, Shield } from 'lucide-react';

const MENU_ITEMS = [
  { href: '/', label: 'Home Feed', icon: Home },
  { href: '/products', label: 'Shop / Marketplace', icon: ShoppingBag },
  { href: '/cart', label: 'Cart', icon: ShoppingCart },
  { href: '/wallet', label: 'Fintech Wallet', icon: Wallet },
  { href: '/post/create', label: 'Create Post', icon: PlusCircle },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/profile', label: 'My Profile', icon: User },
  { href: '/vendor/orders', label: 'Vendor Dashboard', icon: Store },
  { href: '/admin/wallet', label: 'Admin Profit Wallet', icon: Shield },
];

export function Header() {
  const supabase = createClient();
  const pathname = usePathname();
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

  // Determine dynamic title based on path
  const getHeaderTitle = () => {
    if (pathname === '/') {
      return (
        <div className="flex flex-col items-center">
          <span className="text-xl font-black tracking-tight">
            <span className="text-white">Swift</span>
            <span className="text-[#D4AF37]">Mart</span>
          </span>
          <span className="text-[10px] text-[#D4AF37]/90 font-medium tracking-wide">
            Marketplace & Fintech all together
          </span>
        </div>
      );
    }

    let titleText = 'SwiftMart';
    if (pathname?.startsWith('/products')) titleText = 'Shop / Marketplace';
    else if (pathname?.startsWith('/cart')) titleText = 'My Cart';
    else if (pathname?.startsWith('/wallet')) titleText = 'Wallet';
    else if (pathname?.startsWith('/notifications')) titleText = 'Notifications';
    else if (pathname?.startsWith('/profile')) titleText = 'Profile';
    else if (pathname?.startsWith('/orders')) titleText = 'My Orders';
    else if (pathname?.startsWith('/vendor')) titleText = 'Vendor Dashboard';
    else if (pathname?.startsWith('/admin')) titleText = 'Admin Console';
    else if (pathname?.startsWith('/post')) titleText = 'Create Post';

    return (
      <h1 className="text-base sm:text-lg font-bold text-white tracking-wide">
        {titleText}
      </h1>
    );
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-[#0A1028] border-b border-[#D4AF37]/20 shadow-md">
      <div className="flex items-center justify-between px-3 py-2.5 max-w-7xl mx-auto">
        {/* Left: Hamburger menu */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
          className="p-2 text-white hover:text-[#D4AF37] transition rounded-lg hover:bg-white/5"
        >
          {menuOpen ? <X size={24} className="text-[#D4AF37]" /> : <Menu size={24} />}
        </button>

        {/* Center: Title / App Branding */}
        <div className="flex-1 text-center">
          {getHeaderTitle()}
        </div>

        {/* Right: Cart Button */}
        <Link
          href="/cart"
          className="relative p-2 text-[#D4AF37] hover:text-[#F5C445] transition rounded-lg hover:bg-white/5"
          aria-label="Shopping Cart"
        >
          <ShoppingCart size={22} strokeWidth={2} />
          {cartCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white shadow-sm">
              {cartCount > 9 ? '9+' : cartCount}
            </span>
          )}
        </Link>
      </div>

      {/* Slide-over Side Drawer Menu (Left side) */}
      {menuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setMenuOpen(false)}
          />
          <nav className="fixed left-0 top-0 bottom-0 z-50 w-72 bg-[#0A1028] border-r border-[#D4AF37]/25 shadow-2xl flex flex-col p-4 animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-2">
              <div>
                <span className="text-xl font-black">
                  <span className="text-white">Swift</span>
                  <span className="text-[#D4AF37]">Mart</span>
                </span>
                <p className="text-[10px] text-[#D4AF37]/80">Marketplace & Fintech</p>
              </div>
              <button
                onClick={() => setMenuOpen(false)}
                className="p-1.5 text-gray-400 hover:text-white rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 py-2">
              {MENU_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                      isActive
                        ? 'bg-[#D4AF37]/15 text-[#F5C445] border border-[#D4AF37]/30'
                        : 'text-gray-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <Icon size={18} className={isActive ? 'text-[#F5C445]' : 'text-gray-400'} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>

            <div className="pt-4 border-t border-white/10 text-center text-xs text-gray-500">
              SwiftMart App v2.0
            </div>
          </nav>
        </>
      )}
    </header>
  );
}
