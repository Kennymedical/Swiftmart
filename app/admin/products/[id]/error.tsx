'use client';

import Link from 'next/link';
import { AlertOctagon, ArrowLeft, RotateCcw } from 'lucide-react';
import { useEffect } from 'react';

export default function AdminProductDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Admin product detail error:', error);
  }, [error]);

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <Link
        href="/admin/products"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#D4AF37] hover:underline"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Product Catalog
      </Link>

      <div className="bg-gradient-to-br from-[#142850] to-[#1B2F5E] border border-red-500/30 rounded-2xl p-8 text-center shadow-[0_4px_25px_rgba(248,113,113,0.12)] space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-[#F87171] mx-auto">
          <AlertOctagon className="w-8 h-8" />
        </div>

        <div>
          <h1 className="text-xl font-bold text-[#F5F7FA]">Error Loading Product Details</h1>
          <p className="text-xs text-[#A8B0C5] mt-1.5 max-w-sm mx-auto leading-relaxed">
            Failed to retrieve product record from Supabase. You can try refreshing the request or return to the catalog.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#F2D57E] to-[#D4A937] text-[#0A1931] text-xs font-bold shadow hover:opacity-95 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retry Query</span>
          </button>
          <Link
            href="/admin/products"
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-[#0F2550] border border-[#D4AF37]/30 text-xs font-semibold text-[#D4AF37] hover:bg-[#142850] transition"
          >
            Back to Catalog
          </Link>
        </div>
      </div>
    </div>
  );
}
