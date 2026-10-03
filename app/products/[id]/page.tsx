import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { AddToCartButton } from '@/components/AddToCartButton';
import { ProductGallery } from '@/components/products/ProductGallery';
import Link from 'next/link';
import { ArrowLeft, Store, ShieldCheck, Truck } from 'lucide-react';
import { notFound } from 'next/navigation';

function formatNaira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString('en-NG')}`;
}

interface ProductPageProps {
  params: { id: string };
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const supabase = createClient();
  const { data: product } = await supabase
    .from('products')
    .select('id, name, slug, description, images, price_kobo, status')
    .eq('id', params.id)
    .single();

  if (!product || product.status !== 'active') {
    return {
      title: 'Product Not Found | SwiftMart',
      description: 'The requested product is not available on SwiftMart.',
    };
  }

  const retailPrice = Math.round((product.price_kobo * 1.2) / 100).toLocaleString('en-NG');
  const title = `${product.name} - ₦${retailPrice} | SwiftMart`;
  const description =
    product.description && product.description.trim().length > 0
      ? product.description.slice(0, 160)
      : `Buy ${product.name} on SwiftMart. Escrow protected marketplace with doorstep delivery across Nigeria.`;
  const primaryImage = product.images?.[0];

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      images: primaryImage ? [{ url: primaryImage, alt: product.name }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: primaryImage ? [primaryImage] : [],
    },
  };
}

export default async function ProductDetailPage({
  params,
}: ProductPageProps) {
  const supabase = createClient();

  const { data: product, error } = await supabase
    .from('products')
    .select(
      'id, name, slug, description, images, price_kobo, compare_at_kobo, stock, status, rating, review_count, sold_count, vendor:vendors(id, business_name, rating)'
    )
    .eq('id', params.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(error.message || 'Failed to load product');
  }

  if (!product || product.status !== 'active') {
    notFound();
  }

  const displayPriceKobo = Math.round(product.price_kobo * 1.2);
  const compareAtKobo = product.compare_at_kobo ? Math.round(product.compare_at_kobo * 1.2) : null;
  const hasDiscount = compareAtKobo && compareAtKobo > displayPriceKobo;
  const discountPercent = hasDiscount
    ? Math.round(((compareAtKobo - displayPriceKobo) / compareAtKobo) * 100)
    : 0;

  const vendorData = Array.isArray(product.vendor) ? product.vendor[0] : product.vendor;
  const vendorName = vendorData?.business_name || 'SwiftMart Merchant';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: product.images || [],
    description:
      product.description && product.description.trim().length > 0
        ? product.description
        : `Buy ${product.name} on SwiftMart. Escrow protected marketplace with doorstep delivery.`,
    sku: product.id,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'NGN',
      price: (displayPriceKobo / 100).toFixed(2),
      availability:
        product.stock > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: vendorName,
      },
    },
    ...(product.rating > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: product.rating,
            reviewCount: product.review_count || 1,
          },
        }
      : {}),
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0A1931] via-[#0D1D3A] to-[#0F2140] text-[#F5F7FA] pb-24">
      {/* Schema.org JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

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
        <div className="relative">
          <ProductGallery images={product.images || []} name={product.name} />
          {hasDiscount && (
            <span className="absolute top-3 left-3 bg-[#D4AF37] text-[#0A1931] text-xs font-black px-2.5 py-1 rounded-full shadow-md z-10 pointer-events-none">
              -{discountPercent}% OFF
            </span>
          )}
        </div>

        <div className="bg-gradient-to-br from-[#142850] to-[#1B2F5E] border border-[#D4AF37]/25 rounded-2xl p-5 shadow-[0_4px_20px_rgba(212,175,55,0.08)] space-y-4">
          <div>
            {vendorData && (
              <div className="flex items-center gap-1.5 text-xs text-[#A8B0C5] mb-1">
                <Store className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>{vendorData.business_name}</span>
                {vendorData.rating > 0 && (
                  <span className="text-[#E8C874]">★ {vendorData.rating.toFixed(1)}</span>
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
