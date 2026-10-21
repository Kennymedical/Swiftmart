'use client';

import Link from 'next/link';

export function PostFab({ isVendor }: { isVendor: boolean }) {
  if (!isVendor) return null;

  return (
    <Link
      href="/vendor/products/add"
      className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#0F172A] border-2 border-[#D4AF37] shadow-lg sm:hidden"
      aria-label="Add product"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="2.5">
        <path d="M12 5v14M5 12h14" strokeLinecap="round" />
      </svg>
    </Link>
  );
      }
