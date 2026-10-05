import { createClient } from '@/lib/supabase/server';
import { AddToCartButton } from '@/components/AddToCartButton';
import Link from 'next/link';
import { Package, Search, Store } from 'lucide-react';

function formatNaira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString('en-NG')}`;
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams?: { category?: string; q?: string; vendor?: string };
}) {
  const supabase = createClient();
  const selectedCategorySlug = searchParams?.category;
  const searchQuery = searchParams?.q?.trim() || '';
  const vendorId = searchParams?.vendor;

  // 1. Fetch categories for chips
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, slug')
    .order('name', { ascending: true });

  let selectedCategoryId: string | null = null;
  if (selectedCategorySlug) {
    const match = categories?.find((c) => c.slug === selectedCategorySlug);
    if (match) selectedCategoryId = match.id;
  }

  // 2. Fetch vendor details if filtering by vendor storefront
  let vendorDetails: { id: string; business_name: string } | null = null;
  if (vendorId) {
    const { data: v } = await supabase
      .from('vendors')
      .select('id, business_name')
      .eq('id', vendorId)
      .maybeSingle();
    if (v) vendorDetails = v;
  }

  // 3. Build product query
  let query = supabase
    .from('products')
    .select(`
      id,
      name,
      images,
      price_kobo,
      compare_at_kobo,
      rating,
      sold_count,
      status,
      category_id,
      vendor_id,
      vendors (id, business_name)
    `)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (selectedCategoryId) {
    query = query.eq('category_id', selectedCategoryId);
  }

  if (vendorId) {
    query = query.eq('vendor_id', vendorId);
  }

  if (searchQuery) {
    query = query.ilike('name', `%${searchQuery}%`);
  }

  const { data: products } = await query;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0A1931] via-[#0D1D3A] to-[#0F2140] pb-24 text-[#F5F7FA]">
      {/* Unified Single Header Toolbar (No duplicate h1 title) */}
      <div className="sticky top-14 z-30 bg-[#0A1931]/95 backdrop-blur-md border-b border-[#D4AF37]/20 px-4 py-3 space-y-2.5">
        {/* Vendor Storefront Banner if selected (No verify badge) */}
        {vendorDetails ? (
          <div className="flex items-center justify-between bg-[#142850]/80 border border-[#D4AF37]/30 rounded-xl px-3 py-2">
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4 text-[#D4AF37]" />
              <div>
                <h2 className="text-sm font-bold text-white tracking-wide">{vendorDetails.business_name}</h2>
                <p className="text-[10px] text-[#A8B0C5]">Official Storefront ({products?.length || 0} products)</p>
              </div>
            </div>
            <Link
              href="/products"
              className="text-xs text-[#D4AF37] hover:underline font-semibold"
            >
              View All Stores
            </Link>
          </div>
        ) : null}

        {/* Product Search Form */}
        <form method="GET" action="/products" className="relative flex items-center">
          {selectedCategorySlug && (
            <input type="hidden" name="category" value={selectedCategorySlug} />
          )}
          {vendorId && (
            <input type="hidden" name="vendor" value={vendorId} />
          )}
          <Search className="absolute left-3 w-4 h-4 text-[#A8B0C5]" />
          <input
            type="text"
            name="q"
            defaultValue={searchQuery}
            placeholder={vendorDetails ? `Search in ${vendorDetails.business_name}...` : "Search products in SwiftMart..."}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#0F2140] border border-[#D4AF37]/25 text-xs text-[#F5F7FA] placeholder-[#A8B0C5] focus:border-[#D4AF37] focus:outline-none transition"
          />
        </form>

        {/* Category Filter Chips */}
        {categories && categories.length > 0 && (
          <div
            role="region"
            aria-label="Filter products by category"
            className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs"
          >
            <Link
              href={vendorId ? `/products?vendor=${vendorId}` : '/products'}
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
              const linkUrl = vendorId
                ? `/products?vendor=${vendorId}&category=${cat.slug}`
                : `/products?category=${cat.slug}`;
              return (
                <Link
                  key={cat.id}
                  href={linkUrl}
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

      {/* Product Catalog Grid (2-column layout on mobile) */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4">
        {!products || products.length === 0 ? (
          <div className="py-20 text-center text-[#A8B0C5]">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-40 text-[#D4AF37]" />
            <p className="text-sm font-semibold">No products found</p>
            <p className="text-xs mt-1">Try searching for something else or clearing filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {products.map((product) => {
              const vendor = Array.isArray(product.vendors) ? product.vendors[0] : product.vendors;
              const vendorName = vendor?.business_name;

              return (
                <div
                  key={product.id}
                  className="group flex flex-col justify-between bg-gradient-to-b from-[#142850] to-[#0D1D3A] rounded-2xl overflow-hidden border border-[#D4AF37]/20 hover:border-[#D4AF37]/50 transition shadow-lg hover:shadow-[0_8px_24px_rgba(0,0,0,0.4)]"
                >
                  <Link href={`/products/${product.id}`} className="block relative aspect-square bg-[#0A1931] overflow-hidden">
                    {product.images?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#A8B0C5]/40">
                        <Package className="w-10 h-10" />
                      </div>
                    )}
                  </Link>

                  <div className="p-3 flex flex-col justify-between flex-1">
                    <div>
                      {/* Vendor Store Link */}
                      {product.vendor_id && vendorName && (
                        <Link
                          href={`/products?vendor=${product.vendor_id}`}
                          className="text-[11px] font-semibold text-[#D4AF37] hover:underline line-clamp-1 mb-1 block"
                        >
                          {vendorName}
                        </Link>
                      )}
                      <Link
                        href={`/products/${product.id}`}
                        className="text-xs sm:text-sm font-bold text-white hover:text-[#D4AF37] line-clamp-2 transition leading-snug"
                      >
                        {product.name}
                      </Link>
                      <div className="mt-1.5 flex items-baseline gap-2">
                        <span className="text-sm sm:text-base font-extrabold text-[#D4AF37]">
                          {formatNaira(product.price_kobo)}
                        </span>
                        {product.compare_at_kobo && product.compare_at_kobo > product.price_kobo && (
                          <span className="text-[10px] text-[#A8B0C5] line-through">
                            {formatNaira(product.compare_at_kobo)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-3">
                      <AddToCartButton productId={product.id} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
