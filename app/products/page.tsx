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
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-[#0F172A] px-4 py-5">
        <h1 className="text-xl font-bold text-white">
          Shop <span className="text-[#D4AF37]">SwiftMart</span>
        </h1>
        <p className="text-slate-300 text-xs mt-1">
          Great finds from trusted vendors
        </p>
      </div>

      {(!products || products.length === 0) ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <p className="text-gray-500">
            No products yet — vendors haven&apos;t listed anything.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 p-3">
          {products.map((product) => {
            const hasDiscount =
              product.compare_at_kobo &&
              product.compare_at_kobo > product.price_kobo;
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
                className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100"
              >
                <div className="relative aspect-square bg-gray-100">
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
                  <p className="text-xs text-gray-900 font-medium line-clamp-1 mb-1">
                    {product.name}
                  </p>

                  <div className="flex flex-col gap-0.5 mb-1">
                    <span className="text-[#0F172A] font-bold text-sm">
                      {formatNaira(product.price_kobo)}
                    </span>
                    {hasDiscount && (
                      <span className="text-[10px] text-gray-400 line-through">
                        {formatNaira(product.compare_at_kobo)}
                      </span>
                    )}
                  </div>

                  {(product.rating > 0 || product.sold_count > 0) && (
                    <div className="flex items-center gap-1 text-[10px] text-gray-500 mb-1">
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
  
