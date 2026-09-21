'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function CartOrdersTabs() {
  const pathname = usePathname();

  return (
    <div className="flex bg-white border-b border-gray-100">
      <Link
        href="/cart"
        className={`flex-1 text-center py-3 text-sm font-semibold ${
          pathname === '/cart' ? 'text-[#0F172A] border-b-2 border-[#D4AF37]' : 'text-gray-400'
        }`}
      >
        Cart
      </Link>
      <Link
        href="/orders"
        className={`flex-1 text-center py-3 text-sm font-semibold ${
          pathname === '/orders' ? 'text-[#0F172A] border-b-2 border-[#D4AF37]' : 'text-gray-400'
        }`}
      >
        My Orders
      </Link>
    </div>
  );
          }
          
