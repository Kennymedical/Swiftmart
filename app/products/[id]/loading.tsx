import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function ProductDetailLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0A1931] via-[#0D1D3A] to-[#0F2140] text-[#F5F7FA] pb-24 animate-pulse">
      {/* Top sticky bar */}
      <div className="sticky top-0 z-40 bg-[#0A1931]/90 backdrop-blur-md border-b border-[#D4AF37]/20 px-4 py-3 flex items-center justify-between">
        <Link href="/products" className="flex items-center gap-1.5 text-xs font-semibold text-[#D4AF37]">
          <ArrowLeft className="w-4 h-4" />
          <span>Shop</span>
        </Link>
        <div className="h-4 w-32 bg-[#142850] rounded-md border border-[#D4AF37]/15" />
        <div className="h-4 w-8 bg-[#142850] rounded-md border border-[#D4AF37]/15" />
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Main image skeleton */}
        <div className="relative aspect-square rounded-2xl bg-[#0A1931] border border-[#D4AF37]/25 overflow-hidden flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-[#142850] border border-[#D4AF37]/20" />
        </div>

        {/* Thumbnail row skeleton */}
        <div className="flex gap-2 pb-1">
          <div className="w-16 h-16 rounded-xl bg-[#142850] border border-[#D4AF37]/20 shrink-0" />
          <div className="w-16 h-16 rounded-xl bg-[#142850] border border-[#D4AF37]/20 shrink-0" />
          <div className="w-16 h-16 rounded-xl bg-[#142850] border border-[#D4AF37]/20 shrink-0" />
        </div>

        {/* Product details card skeleton */}
        <div className="bg-gradient-to-br from-[#142850] to-[#1B2F5E] border border-[#D4AF37]/25 rounded-2xl p-5 shadow-[0_4px_20px_rgba(212,175,55,0.08)] space-y-4">
          <div className="space-y-2">
            <div className="h-3 w-28 bg-[#0F2550] rounded border border-[#D4AF37]/15" />
            <div className="h-6 w-3/4 bg-[#0F2550] rounded border border-[#D4AF37]/15" />
          </div>

          <div className="flex items-baseline gap-3">
            <div className="h-7 w-32 bg-[#0F2550] rounded-lg border border-[#D4AF37]/20" />
            <div className="h-4 w-20 bg-[#0F2550] rounded" />
          </div>

          <div className="flex items-center gap-2">
            <div className="h-5 w-24 bg-[#0F2550] rounded-full border border-[#D4AF37]/15" />
            <div className="h-4 w-16 bg-[#0F2550] rounded" />
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#D4AF37]/15">
            <div className="h-4 bg-[#0F2550] rounded border border-[#D4AF37]/10" />
            <div className="h-4 bg-[#0F2550] rounded border border-[#D4AF37]/10" />
          </div>

          <div className="pt-2">
            <div className="h-12 w-full bg-[#D4AF37]/30 rounded-xl border border-[#D4AF37]/40" />
          </div>
        </div>

        {/* Description card skeleton */}
        <div className="bg-gradient-to-br from-[#142850] to-[#1B2F5E] border border-[#D4AF37]/25 rounded-2xl p-5 space-y-2">
          <div className="h-3 w-24 bg-[#0F2550] rounded border border-[#D4AF37]/15" />
          <div className="h-3 w-full bg-[#0F2550] rounded" />
          <div className="h-3 w-5/6 bg-[#0F2550] rounded" />
          <div className="h-3 w-2/3 bg-[#0F2550] rounded" />
        </div>
      </div>
    </div>
  );
}
