'use client';

import Link from 'next/link';
import { AlertCircle, RotateCcw, ShoppingBag } from 'lucide-react';
import { useEffect } from 'react';

export default function ProductDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log unexpected client error to monitoring if present
    console.error('Storefront product detail error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0A1931] via-[#0D1D3A] to-[#0F2140] text-[#F5F7FA] p-6 flex flex-col items-center justify-center">
      <div className="w-full max-w-md bg-gradient-to-br from-[#142850] to-[#1B2F5E] border border-red-500/30 rounded-2xl p-6 text-center shadow-[0_4px_25px_rgba(248,113,113,0.15)] space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-[#F87171] mx-auto">
          <AlertCircle className="w-8 h-8" />
        </div>

        <div>
          <h1 className="text-lg sm:text-xl font-bold text-[#F5F7FA]">Unable to Load Product</h1>
          <p className="text-xs text-[#A8B0C5] mt-1.5 leading-relaxed">
            We encountered a temporary issue while fetching the product details. Please try again or return to the shop catalog.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
          <button
            onClick={() => reset()}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#F2D57E] to-[#D4A937] text-[#0A1931] text-xs font-bold shadow hover:opacity-95 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
          <Link
            href="/products"
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-[#0F2550] border border-[#D4AF37]/30 text-xs font-semibold text-[#D4AF37] hover:bg-[#142850] transition"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Return to Shop</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
