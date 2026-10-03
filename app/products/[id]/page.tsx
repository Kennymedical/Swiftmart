import { createClient } from '@/lib/supabase/server';
import { AddToCartButton } from '@/components/AddToCartButton';
import Link from 'next/link';
import { ArrowLeft, Store, ShieldCheck, Truck } from 'lucide-react';

function formatNaira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString('en-NG')}`;
}

export default async function ProductDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: product } = await supabase
    .from('products')
    .select(
      'id, name, slug, description, images, price_kobo, compare_at_kobo, stock, status, rating, review_count, sold_count, vendor:vendors(id, business_name, rating)'
    )
    .eq('id', params.id)
    .single();

  if (!product) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0A1931] via-[#0D1D3A] to-[#0F2140] text-[#F5F7FA] p-6 flex flex-col items-center justify-center">
        <p className="text-[#A8B0C5] text-sm mb-4">Product not found or unavailable.</p>
        <Link
          href="/products"
          className="px-4 py-2 rounded-xl bg-[#142850] border border-[#D4AF37]/40 text-xs font-bold text-[#D4AF37]"
        >
          Return to Shop
        </Link>
      </div>
    );
  }

  const displayPriceKobo = Math.round(product.price_kobo * 1.2);
  const compareAtKobo = product.compare_at_kobo ? Math.round(product.compare_at_kobo * 1.2) : null;
  const hasDiscount = compareAtKobo && compareAtKobo > displayPriceKobo;
  const discountPercent = hasDiscount
    ? Math.round(((compareAtKobo - displayPriceKobo) / compareAtKobo) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0A1931] via-[#0D1D3A] to-[#0F2140] text-[#F5F7FA] pb-24">
      <div className="sticky top-0 z-40 bg-[#0A1931]/90 backdrop-blur-md border-b border-[#D4AF37]/20 px-4 py-3 flex items-center justify-between">
        <Link href="/products" className="flex items-center gap-1.5 text-xs font-semibold text-[#D4AF37]">
          <ArrowLeft className="w-4 h-4" />
          <span>Shop</span>
        </Link>
        <span className="text-xs font-bold text-[#F5F7FA] truncate max-w-[200px]">{product.name}</span>
        <Link href="/cart" className="text-xs font-bold text-[#D4AF37]">
          Cart
        </Link>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <div className="relative aspect-square rounded-2xl bg-[#0A1931] border border-[#D4AF37]/25 overflow-hidden shadow-[0_4px_25px_rgba(212,175,55,0.1)]">
          {product.images?.[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[#8A94B0]">No image available</div>
          )}
          {hasDiscount && (
            <span className="absolute top-3 left-3 bg-[#D4AF37] text-[#0A1931] text-xs font-black px-2.5 py-1 rounded-full shadow-md">
              -{discountPercent}% OFF
            </span>
          )}
        </div>

        {product.images && product.images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {product.images.map((img: string, idx: number) => (
              <div
                key={idx}
                className="w-16 h-16 rounded-xl bg-[#0A1931] border border-[#D4AF37]/20 overflow-hidden shrink-0"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        )}

        <div className="bg-gradient-to-br from-[#142850] to-[#1B2F5E] border border-[#D4AF37]/25 rounded-2xl p-5 shadow-[0_4px_20px_rgba(212,175,55,0.08)] space-y-4">
          <div>
            {product.vendor && (
              <div className="flex items-center gap-1.5 text-xs text-[#A8B0C5] mb-1">
                <Store className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>{product.vendor.business_name}</span>
                {product.vendor.rating > 0 && (
                  <span className="text-[#E8C874]">★ {product.vendor.rating.toFixed(1)}</span>
                )}
              </div>
            )}
            <h1 className="text-lg sm:text-xl font-bold text-[#F5F7FA]">{product.name}</h1>
          </div>

          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-black text-[#D4AF37]">{formatNaira(displayPriceKobo)}</span>
            {hasDiscount && (
              <span className="text-sm text-gray-400 line-through">{formatNaira(compareAtKobo!)}</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                product.stock > 0
                  ? 'bg-[#2ED573]/20 text-[#2ED573] border border-[#2ED573]/30'
                  : 'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}
            >
              {product.stock > 0 ? `In Stock (${product.stock} available)` : 'Out of Stock'}
            </span>
            {(product.sold_count ?? 0) > 0 && (
              <span className="text-xs text-[#A8B0C5]">{product.sold_count} sold</span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#D4AF37]/15 text-xs text-[#A8B0C5]">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#2ED573] shrink-0" />
              <span>Escrow Protected</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-[#E8C874] shrink-0" />
              <span>Doorstep Delivery</span>
            </div>
          </div>

          <div className="pt-2">
            <AddToCartButton productId={product.id} />
          </div>
        </div>

        {product.description && (
          <div className="bg-gradient-to-br from-[#142850] to-[#1B2F5E] border border-[#D4AF37]/25 rounded-2xl p-5 shadow-[0_4px_20px_rgba(212,175,55,0.08)]">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#D4AF37] mb-2">Description</h2>
            <p className="text-xs sm:text-sm text-[#F5EAC2] whitespace-pre-line leading-relaxed">
              {product.description}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
