import { createClient } from '@/lib/supabase/server';
import { ProductActions } from '../ProductActions';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, Package } from 'lucide-react';

function naira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default async function AdminProductDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: product } = await supabase
    .from('products')
    .select(
      'id, name, slug, description, images, price_kobo, compare_at_kobo, stock, status, rating, review_count, sold_count, created_at, vendor:vendors(id, business_name, status, user_id)'
    )
    .eq('id', params.id)
    .single();

  if (!product) {
    return (
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-1.5 text-xs text-[#D4AF37] hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Products
        </Link>
        <p className="text-center text-[#A8B0C5] py-16">Product not found.</p>
      </div>
    );
  }

  const vendorBasePrice = product.price_kobo;
  const swiftmartMarkupPrice = Math.round(vendorBasePrice * 1.2); // 20% SwiftMart markup
  const platformMarkupEarned = swiftmartMarkupPrice - vendorBasePrice;
  const platformCommission = Math.round(vendorBasePrice * 0.1); // 10% platform commission
  const vendorNetPayout = vendorBasePrice - platformCommission;
  const totalPlatformEarnings = platformMarkupEarned + platformCommission;

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Navigation breadcrumbs */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#D4AF37] hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Product Catalog
        </Link>
        <Link
          href={`/products/${product.id}`}
          target="_blank"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0F2550] border border-[#D4AF37]/30 text-xs font-bold text-[#E8C874] hover:bg-[#142850] transition"
        >
          <span>Storefront View</span>
          <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

      {/* Main Product Card */}
      <div className="bg-gradient-to-br from-[#142850] to-[#1B2F5E] border border-[#D4AF37]/25 rounded-2xl shadow-[0_4px_20px_rgba(212,175,55,0.08)] p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-[#D4AF37]/15">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-black text-[#F5F7FA]">{product.name}</h1>
            <p className="text-xs text-[#A8B0C5]">
              Product ID: <span className="font-mono text-[#D4AF37]">{product.id}</span>
            </p>
          </div>
          <span
            className={`self-start px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              product.status === 'active'
                ? 'bg-[#2ED573]/20 text-[#2ED573] border border-[#2ED573]/40'
                : product.status === 'draft'
                ? 'bg-[#D4AF37]/20 text-[#E8C874] border border-[#D4AF37]/40'
                : 'bg-red-500/20 text-red-400 border border-red-500/40'
            }`}
          >
            {product.status}
          </span>
        </div>

        {/* Media & Financial Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="aspect-square rounded-xl bg-[#0A1931] border border-[#D4AF37]/20 overflow-hidden flex items-center justify-center">
              {product.images?.[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <Package className="w-16 h-16 text-[#A8B0C5]/40" />
              )}
            </div>
            {product.images && product.images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {product.images.map((img: string, i: number) => (
                  <div key={i} className="aspect-square rounded-lg bg-[#0A1931] border border-[#D4AF37]/15 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="bg-[#0A1931]/70 border border-[#D4AF37]/20 rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#D4AF37]">
                Fintech Pricing & Commission Split
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center text-[#A8B0C5]">
                  <span>Vendor Base Price:</span>
                  <span className="font-bold text-[#F5F7FA]">{naira(vendorBasePrice)}</span>
                </div>
                <div className="flex justify-between items-center text-[#A8B0C5]">
                  <span>SwiftMart 20% Markup:</span>
                  <span className="font-bold text-[#2ED573]">+{naira(platformMarkupEarned)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-[#D4AF37]/15 text-[#D4AF37]">
                  <span className="font-bold">Live Shopper Retail Price:</span>
                  <span className="text-base font-black text-[#D4AF37]">{naira(swiftmartMarkupPrice)}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-[#0F2550]/80 border border-[#D4AF37]/15 rounded-xl p-3">
                <p className="text-[10px] text-[#A8B0C5] uppercase">Vendor Net Payout</p>
                <p className="text-sm font-black text-[#F5F7FA] mt-0.5">{naira(vendorNetPayout)}</p>
                <p className="text-[10px] text-[#8A94B0] mt-0.5">Base minus 10% comm.</p>
              </div>
              <div className="bg-[#0F2550]/80 border border-[#D4AF37]/15 rounded-xl p-3">
                <p className="text-[10px] text-[#A8B0C5] uppercase">SwiftMart Earnings</p>
                <p className="text-sm font-black text-[#E8C874] mt-0.5">{naira(totalPlatformEarnings)}</p>
                <p className="text-[10px] text-[#2ED573] mt-0.5">Markup + 10% comm.</p>
              </div>
            </div>

            {product.vendor && (
              <div className="bg-[#0A1931]/70 border border-[#D4AF37]/20 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-[#A8B0C5] uppercase tracking-wider">Merchant / Vendor</p>
                  <p className="text-sm font-bold text-[#F5F7FA] mt-0.5">{product.vendor.business_name}</p>
                </div>
                <Link
                  href={`/admin/vendors/${product.vendor.id}`}
                  className="px-3 py-1.5 rounded-lg bg-[#142850] border border-[#D4AF37]/30 text-xs font-semibold text-[#D4AF37] hover:bg-[#1B2F5E] transition"
                >
                  View Merchant
                </Link>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-[#0A1931]/50 border border-[#D4AF37]/15 rounded-xl p-2.5">
                <p className="text-[10px] text-[#A8B0C5]">Inventory</p>
                <p className="text-sm font-bold text-[#F5F7FA]">{product.stock} units</p>
              </div>
              <div className="bg-[#0A1931]/50 border border-[#D4AF37]/15 rounded-xl p-2.5">
                <p className="text-[10px] text-[#A8B0C5]">Units Sold</p>
                <p className="text-sm font-bold text-[#F5F7FA]">{product.sold_count ?? 0}</p>
              </div>
              <div className="bg-[#0A1931]/50 border border-[#D4AF37]/15 rounded-xl p-2.5">
                <p className="text-[10px] text-[#A8B0C5]">Rating</p>
                <p className="text-sm font-bold text-[#E8C874]">★ {Number(product.rating ?? 0).toFixed(1)}</p>
              </div>
            </div>
          </div>
        </div>

        {product.description && (
          <div className="pt-4 border-t border-[#D4AF37]/15">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#D4AF37] mb-2">Description</h3>
            <p className="text-xs sm:text-sm text-[#F5EAC2] whitespace-pre-line leading-relaxed">
              {product.description}
            </p>
          </div>
        )}

        <div className="pt-4 border-t border-[#D4AF37]/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-xs text-[#A8B0C5]">
            Listed on {new Date(product.created_at).toLocaleDateString('en-NG', { dateStyle: 'long' })}
          </p>
          <ProductActions productId={product.id} />
        </div>
      </div>
    </div>
  );
}
