import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function AdminProductDetailLoading() {
  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6 animate-pulse">
      {/* Navigation breadcrumbs skeleton */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#D4AF37]"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Product Catalog
        </Link>
        <div className="h-8 w-32 bg-[#0F2550] rounded-xl border border-[#D4AF37]/20" />
      </div>

      {/* Main Product Card skeleton */}
      <div className="bg-gradient-to-br from-[#142850] to-[#1B2F5E] border border-[#D4AF37]/25 rounded-2xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-[#D4AF37]/15">
          <div className="space-y-2">
            <div className="h-7 w-64 bg-[#0F2550] rounded-lg border border-[#D4AF37]/15" />
            <div className="h-4 w-44 bg-[#0F2550] rounded border border-[#D4AF37]/10" />
          </div>
          <div className="h-6 w-20 bg-[#0F2550] rounded-full border border-[#D4AF37]/20" />
        </div>

        {/* Media & Financial Breakdown skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="aspect-square rounded-xl bg-[#0A1931] border border-[#D4AF37]/20 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-[#142850] border border-[#D4AF37]/15" />
            </div>
            <div className="grid grid-cols-4 gap-2">
              <div className="aspect-square rounded-lg bg-[#0A1931] border border-[#D4AF37]/15" />
              <div className="aspect-square rounded-lg bg-[#0A1931] border border-[#D4AF37]/15" />
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-[#0A1931]/70 border border-[#D4AF37]/20 rounded-xl p-4 space-y-3">
              <div className="h-3.5 w-48 bg-[#0F2550] rounded border border-[#D4AF37]/15" />
              <div className="space-y-2 pt-1">
                <div className="h-4 w-full bg-[#0F2550] rounded" />
                <div className="h-4 w-full bg-[#0F2550] rounded" />
                <div className="h-5 w-full bg-[#0F2550] rounded pt-2" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#0F2550]/80 border border-[#D4AF37]/15 rounded-xl p-3 h-20" />
              <div className="bg-[#0F2550]/80 border border-[#D4AF37]/15 rounded-xl p-3 h-20" />
            </div>

            <div className="bg-[#0A1931]/70 border border-[#D4AF37]/20 rounded-xl p-4 h-16" />

            <div className="grid grid-cols-3 gap-2">
              <div className="bg-[#0A1931]/50 border border-[#D4AF37]/15 rounded-xl p-2.5 h-14" />
              <div className="bg-[#0A1931]/50 border border-[#D4AF37]/15 rounded-xl p-2.5 h-14" />
              <div className="bg-[#0A1931]/50 border border-[#D4AF37]/15 rounded-xl p-2.5 h-14" />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-[#D4AF37]/15 space-y-2">
          <div className="h-3 w-28 bg-[#0F2550] rounded border border-[#D4AF37]/15" />
          <div className="h-3 w-full bg-[#0F2550] rounded" />
          <div className="h-3 w-4/5 bg-[#0F2550] rounded" />
        </div>

        <div className="pt-4 border-t border-[#D4AF37]/15 flex justify-between items-center">
          <div className="h-4 w-36 bg-[#0F2550] rounded" />
          <div className="h-9 w-44 bg-[#0F2550] rounded-xl border border-[#D4AF37]/20" />
        </div>
      </div>
    </div>
  );
}
