import Link from 'next/link';
import { ArrowLeft, PackageSearch, ShoppingBag } from 'lucide-react';

export default function ProductNotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0A1931] via-[#0D1D3A] to-[#0F2140] text-[#F5F7FA] pb-24">
      {/* Navigation header */}
      <div className="sticky top-0 z-40 bg-[#0A1931]/90 backdrop-blur-md border-b border-[#D4AF37]/20 px-4 py-3 flex items-center justify-between">
        <Link href="/products" className="flex items-center gap-1.5 text-xs font-semibold text-[#D4AF37]">
          <ArrowLeft className="w-4 h-4" />
          <span>Shop</span>
        </Link>
        <span className="text-xs font-bold text-[#A8B0C5]">SwiftMart Product</span>
        <Link href="/cart" className="text-xs font-bold text-[#D4AF37]">
          Cart
        </Link>
      </div>

      <div className="max-w-md mx-auto p-6 flex flex-col items-center text-center mt-12">
        <div className="w-20 h-20 rounded-2xl bg-[#142850] border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] mb-6 shadow-[0_4px_25px_rgba(212,175,55,0.15)]">
          <PackageSearch className="w-10 h-10 stroke-[1.75]" />
        </div>

        <h1 className="text-xl sm:text-2xl font-black text-[#F5F7FA] mb-2">
          Product Not Found
        </h1>
        <p className="text-xs sm:text-sm text-[#A8B0C5] leading-relaxed mb-6">
          This product is currently unavailable, out of stock, or may have been unlisted by the merchant.
        </p>

        <div className="w-full space-y-3">
          <Link
            href="/products"
            className="flex items-center justify-center gap-2 w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#F2D57E] to-[#D4A937] text-[#0A1931] text-xs font-bold tracking-wide shadow-[0_4px_20px_rgba(212,175,55,0.25)] hover:opacity-95 transition"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Browse Available Products</span>
          </Link>

          <Link
            href="/"
            className="flex items-center justify-center w-full py-3 px-4 rounded-xl bg-[#142850] border border-[#D4AF37]/30 text-xs font-semibold text-[#D4AF37] hover:bg-[#1B2F5E] transition"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
