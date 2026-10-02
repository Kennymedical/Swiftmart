'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function CartOrdersTabs() {
  const pathname = usePathname();

  return (
    <div className="flex bg-[#0A1931]/90 backdrop-blur-md border-b border-[#D4AF37]/20 px-2 pt-1">
      <Link
        href="/cart"
        className={`flex-1 text-center py-2.5 text-xs sm:text-sm font-bold transition rounded-t-lg ${
          pathname === '/cart'
            ? 'text-[#D4AF37] border-b-2 border-[#D4AF37] bg-[#142850]/50 shadow-[0_2px_10px_rgba(212,175,55,0.15)]'
            : 'text-[#8A94B0] hover:text-[#F5F7FA] hover:bg-[#142850]/20'
        }`}
      >
        Cart
      </Link>
      <Link
        href="/orders"
        className={`flex-1 text-center py-2.5 text-xs sm:text-sm font-bold transition rounded-t-lg ${
          pathname === '/orders'
            ? 'text-[#D4AF37] border-b-2 border-[#D4AF37] bg-[#142850]/50 shadow-[0_2px_10px_rgba(212,175,55,0.15)]'
            : 'text-[#8A94B0] hover:text-[#F5F7FA] hover:bg-[#142850]/20'
        }`}
      >
        My Orders & Waybill
      </Link>
    </div>
  );
}
