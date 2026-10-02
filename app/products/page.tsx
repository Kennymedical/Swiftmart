import { createClient } from '@/lib/supabase/server';
import { AddToCartButton } from '@/components/AddToCartButton';

function formatNaira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString('en-NG')}`;
}

export default async function ProductsPage() {
  const supabase = createClient();

  const { data: products } = await supabase
    .from('products')
    .select('id, name, images, price_kobo, compare_at_kobo, rating, sold_count, status')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0A1931] via-[#0D1D3A] to-[#0F2140] pb-24 text-[#F5F7FA]">
      <div className="bg-[#0A1931]/80 backdrop-blur-md border-b border-[#D4AF37]/20 px-4 py-4">
        <h1 className="text-xl font-bold text-white">
          Shop <span className="text-[#D4AF37]">SwiftMart</span>
        </h1>
        <p className="text-[#A8B0C5] text-xs mt-1">
          Great finds from trusted vendors
        </p>
      </div>

      {(!products || products.length === 0) ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <p className="text-[#A8B0C5]">
            No products yet — vendors haven&apos;t listed anything.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 p-3">
          {products.map((product) => {
            const displayPriceKobo = Math.round(product.price_kobo * 1.2);
            const compareAtKobo = product.compare_at_kobo ? Math.round(product.compare_at_kobo * 1.2) : null;
            const hasDiscount =
              compareAtKobo &&
              compareAtKobo > displayPriceKobo;
            const discountPercent = hasDiscount
              ? Math.round(
                  ((product.compare_at_kobo - product.price_kobo) /
                    product.compare_at_kobo) *
                    100
                )
              : 0;

            return (
              <div
                key={product.id}
                className="bg-gradient-to-br from-[#142850] to-[#1B2F5E] rounded-xl overflow-hidden border border-[#D4AF37]/25 shadow-[0_4px_20px_rgba(212,175,55,0.08)]"
              >
                <div className="relative aspect-square bg-[#0A1931]/80">
                  {product.images?.[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                  {hasDiscount && (
                    <span className="absolute top-1 left-1 bg-[#D4AF37] text-[#0F172A] text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      -{discountPercent}%
                    </span>
                  )}
                </div>

                <div className="p-2">
                  <p className="text-xs text-[#F5F7FA] font-medium line-clamp-1 mb-1">
                    {product.name}
                  </p>

                  <div className="flex flex-col gap-0.5 mb-1">
                    <span className="text-[#0F172A] font-bold text-sm">
                      {formatNaira(displayPriceKobo)}
                    </span>
                    {hasDiscount && (
                      <span className="text-[10px] text-gray-400 line-through">
                        {formatNaira(compareAtKobo!)}
                      </span>
                    )}
                  </div>

                  {(product.rating > 0 || product.sold_count > 0) && (
                    <div className="flex items-center gap-1 text-[10px] text-[#A8B0C5] mb-1">
                      {product.rating > 0 && <span>⭐{product.rating.toFixed(1)}</span>}
                      {product.sold_count > 0 && <span>{product.sold_count} sold</span>}
                    </div>
                  )}

                  <AddToCartButton productId={product.id} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
  
