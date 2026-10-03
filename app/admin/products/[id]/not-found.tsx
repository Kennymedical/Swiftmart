import Link from 'next/link';
import { ArrowLeft, PackageX, Search } from 'lucide-react';

export default function AdminProductNotFound() {
  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <Link
        href="/admin/products"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#D4AF37] hover:underline"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Product Catalog
      </Link>

      <div className="bg-gradient-to-br from-[#142850] to-[#1B2F5E] border border-[#D4AF37]/25 rounded-2xl p-8 text-center shadow-[0_4px_20px_rgba(212,175,55,0.08)] space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-[#0F2550] border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] mx-auto shadow-inner">
          <PackageX className="w-8 h-8" />
        </div>

        <div>
          <h1 className="text-xl font-bold text-[#F5F7FA]">Product Not Found in Catalog</h1>
          <p className="text-xs text-[#A8B0C5] mt-1.5 max-w-sm mx-auto leading-relaxed">
            The requested product ID does not exist in the database or may have been permanently purged.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/admin/products"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#F2D57E] to-[#D4A937] text-[#0A1931] text-xs font-bold shadow hover:opacity-95 transition"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search Catalog</span>
          </Link>
          <Link
            href="/admin"
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-[#0F2550] border border-[#D4AF37]/30 text-xs font-semibold text-[#D4AF37] hover:bg-[#142850] transition"
          >
            Admin Overview
          </Link>
        </div>
      </div>
    </div>
  );
}
