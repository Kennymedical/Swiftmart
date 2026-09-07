import { createClient } from '@/lib/supabase/server';

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
      <div className="bg-[#0F172A] px-4 py-6">
        <h1 className="text-2xl font-bold text-white">
          Shop <span className="text-[#D4AF37]">SwiftMart</span>
        </h1>
        <p className="text-slate-300 text-sm mt-1">
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
        <div className="grid grid-cols-2 gap-3 p-4">
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
                className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100"
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
                    <span className="absolute top-2 left-2 bg-[#D4AF37] text-[#0F172A] text-xs font-bold px-2 py-1 rounded-full">
                      -{discountPercent}%
                    </span>
                  )}
                </div>

                <div className="p-3">
                  <p className="text-sm text-gray-900 font-medium line-clamp-2 mb-1">
                    {product.name}
                  </p>

                  <div className="flex items-baseline gap-1.5 mb-1">
                    <span className="text-[#0F172A] font-bold">
                      {formatNaira(product.price_kobo)}
                    </span>
                    {hasDiscount && (
                      <span className="text-xs text-gray-400 line-through">
                        {formatNaira(product.compare_at_kobo)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    {product.rating > 0 && (
                      <span>⭐ {product.rating.toFixed(1)}</span>
                    )}
                    {product.sold_count > 0 && (
                      <span>{product.sold_count} sold</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
    }
                        
