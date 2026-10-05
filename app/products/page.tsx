import { createClient } from '@/lib/supabase/server';
import { AddToCartButton } from '@/components/AddToCartButton';
import Link from 'next/link';
import { Package } from 'lucide-react';

function formatNaira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString('en-NG')}`;
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams?: { category?: string };
}) {
  const supabase = createClient();
  const selectedCategorySlug = searchParams?.category;

  // Fetch all categories for filter chips
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, slug')
    .order('name', { ascending: true });

  // Resolve category ID if slug is selected
  let selectedCategoryId: string | null = null;
  if (selectedCategorySlug) {
    const match = categories?.find((c) => c.slug === selectedCategorySlug);
    if (match) selectedCategoryId = match.id;
  }

  // Fetch active products, filtered by category if selected
  let query = supabase
    .from('products')
    .select('id, name, images, price_kobo, compare_at_kobo, rating, sold_count, status, category_id')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (selectedCategoryId) {
    query = query.eq('category_id', selectedCategoryId);
  }

  const { data: products } = await query;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0A1931] via-[#0D1D3A] to-[#0F2140] pb-24 text-[#F5F7FA]">
      <div className="bg-[#0A1931]/80 backdrop-blur-md border-b border-[#D4AF37]/20 px-4 py-4 space-y-3">
        <div>
          <h1 className="text-xl font-bold text-white">
            Shop <span className="text-[#D4AF37]">SwiftMart</span>
          </h1>
          <p className="text-[#A8B0C5] text-xs mt-1">
            Great finds from trusted vendors across Nigeria
          </p>
        </div>

        {/* Category Filter Chips */}
        {categories && categories.length > 0 && (
          <div
            role="region"
            aria-label="Filter products by category"
            className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs"
          >
            <Link
              href="/products"
              className={`px-3.5 py-1.5 rounded-full font-bold whitespace-nowrap transition border ${
                !selectedCategorySlug
                  ? 'bg-[#D4AF37] text-[#0A1931] border-[#D4AF37] shadow-[0_0_10px_rgba(212,175,55,0.3)]'
                  : 'bg-[#0F2550] text-[#E8C874] border-[#D4AF37]/25 hover:border-[#D4AF37]/50'
              }`}
            >
              All Items
            </Link>
            {categories.map((cat) => {
              const isActive = selectedCategorySlug === cat.slug;
              return (
                <Link
                  key={cat.id}
                  href={`/products?category=${cat.slug}`}
                  className={`px-3.5 py-1.5 rounded-full font-bold whitespace-nowrap transition border ${
                    isActive
                      ? 'bg-[#D4AF37] text-[#0A1931] border-[#D4AF37] shadow-[0_0_10px_rgba(212,175,55,0.3)]'
                      : 'bg-[#0F2550] text-[#E8C874] border-[#D4AF37]/25 hover:border-[#D4AF37]/50'
                  }`}
                >
                  {cat.name}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {(!products || products.length === 0) ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <Package className="w-12 h-12 text-[#A8B0C5]/40 mb-3" />
          <p className="text-[#A8B0C5] text-sm">
            {selectedCategorySlug
              ? 'No products found in this category yet.'
              : "No products yet — vendors haven't listed anything."}
          </p>
          {selectedCategorySlug && (
            <Link
              href="/products"
              className="mt-3 text-xs text-[#D4AF37] hover:underline font-semibold"
            >
              View all products
            </Link>
          )}
        </div>
      ) : (
        /* 2-column mobile grid, 3-column tablet, 4-column desktop */
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-3">
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

            const primaryImage = product.images?.[0];

            return (
              <div
                key={product.id}
                className="bg-gradient-to-br from-[#142850] to-[#1B2F5E] rounded-xl overflow-hidden border border-[#D4AF37]/25 shadow-[0_4px_20px_rgba(212,175,55,0.08)] flex flex-col justify-between"
              >
                <div>
                  <Link href={`/products/${product.id}`} className="block relative aspect-square bg-[#0A1931]/80 group">
                    {primaryImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={primaryImage}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                        <Package className="w-8 h-8 text-[#A8B0C5]/30 mb-1" />
                        <span className="text-[10px] text-[#A8B0C5]/70">No image</span>
                      </div>
                    )}
                    {hasDiscount && (
                      <span className="absolute top-1.5 left-1.5 bg-[#D4AF37] text-[#0A1931] text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
                        -{discountPercent}%
                      </span>
                    )}
                  </Link>

                  <div className="p-2.5">
                    <Link href={`/products/${product.id}`}>
                      <p className="text-xs sm:text-sm text-[#F5F7FA] font-medium line-clamp-1 mb-1 hover:text-[#D4AF37] transition">
                        {product.name}
                      </p>
                    </Link>

                    <div className="flex flex-col gap-0.5 mb-1.5">
                      <span className="text-[#E9C86A] font-black text-sm sm:text-base">
                        {formatNaira(displayPriceKobo)}
                      </span>
                      {hasDiscount && (
                        <span className="text-[10px] sm:text-xs text-gray-400 line-through">
                          {formatNaira(compareAtKobo!)}
                        </span>
                      )}
                    </div>

                    {(product.rating > 0 || product.sold_count > 0) && (
                      <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-[#A8B0C5] mb-1">
                        {product.rating > 0 && <span>⭐{product.rating.toFixed(1)}</span>}
                        {product.sold_count > 0 && <span>• {product.sold_count} sold</span>}
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-2.5 pt-0">
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
