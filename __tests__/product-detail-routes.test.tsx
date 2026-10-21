import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ProductDetailPage, { generateMetadata } from '@/app/products/[id]/page';
import AdminProductDetailPage from '@/app/admin/products/[id]/page';
import ProductDetailLoading from '@/app/products/[id]/loading';
import ProductNotFound from '@/app/products/[id]/not-found';
import ProductDetailError from '@/app/products/[id]/error';
import AdminProductDetailLoading from '@/app/admin/products/[id]/loading';
import AdminProductNotFound from '@/app/admin/products/[id]/not-found';
import AdminProductDetailError from '@/app/admin/products/[id]/error';
import { ProductGallery } from '@/components/products/ProductGallery';

const notFoundMock = vi.fn(() => {
  const err = new Error('NEXT_NOT_FOUND');
  (err as any).digest = 'NEXT_NOT_FOUND';
  throw err;
});

vi.mock('next/navigation', () => ({
  notFound: () => notFoundMock(),
  usePathname: vi.fn(() => '/'),
  useRouter: vi.fn(() => ({ push: vi.fn(), refresh: vi.fn() })),
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children?: React.ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/components/AddToCartButton', () => ({
  AddToCartButton: ({ productId }: { productId: string }) => (
    <button data-testid="mock-add-to-cart">Add to Cart ({productId})</button>
  ),
}));

vi.mock('@/app/admin/products/ProductActions', () => ({
  ProductActions: ({ productId }: { productId: string }) => (
    <div data-testid="mock-product-actions">Actions ({productId})</div>
  ),
}));

let mockSupabase: any;

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => mockSupabase,
}));

function buildProductMock({
  data = null,
  error = null,
}: {
  data?: any;
  error?: any;
}) {
  return {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data, error }),
    })),
  };
}

describe('Product Detail Routes & SEO & Gallery Accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Route-Level Metadata, Open Graph, Canonical URL & JSON-LD', () => {
    it('generates accurate metadata, Open Graph tags, and canonical URL for active product', async () => {
      const productData = {
        id: 'prod-456',
        name: 'Italian Leather Loafers',
        description: 'Genuine calfskin handcrafted loafers.',
        images: ['https://images.unsplash.com/photo-loafers-1.jpg'],
        price_kobo: 2500000, // ₦25,000 base -> ₦30,000 retail
        status: 'active',
      };

      mockSupabase = buildProductMock({ data: productData });

      const metadata = await generateMetadata({ params: { id: 'prod-456' } });

      expect(metadata.title).toBe('Italian Leather Loafers - ₦30,000 | SwiftMart');
      expect(metadata.description).toBe('Genuine calfskin handcrafted loafers.');
      expect(metadata.alternates?.canonical).toBe('https://swiftmart.ng/products/prod-456');
      expect(metadata.openGraph?.title).toBe('Italian Leather Loafers - ₦30,000 | SwiftMart');
      expect(metadata.openGraph?.url).toBe('https://swiftmart.ng/products/prod-456');
      expect(metadata.openGraph?.images).toEqual([
        { url: 'https://images.unsplash.com/photo-loafers-1.jpg', alt: 'Italian Leather Loafers' },
      ]);
      expect((metadata.twitter as any)?.card).toBe('summary_large_image');
      expect(metadata.twitter?.images).toEqual(['https://images.unsplash.com/photo-loafers-1.jpg']);
    });

    it('generates fallback metadata for missing product in generateMetadata', async () => {
      mockSupabase = buildProductMock({ data: null });

      const metadata = await generateMetadata({ params: { id: 'non-existent-id' } });

      expect(metadata.title).toBe('Product Not Found | SwiftMart');
      expect(metadata.description).toBe('The requested product is not available on SwiftMart.');
    });

    it('generates fallback metadata for inactive / draft product in generateMetadata', async () => {
      const draftProduct = {
        id: 'prod-draft-1',
        name: 'Unreleased Gadget',
        price_kobo: 100000,
        status: 'draft',
      };
      mockSupabase = buildProductMock({ data: draftProduct });

      const metadata = await generateMetadata({ params: { id: 'prod-draft-1' } });

      expect(metadata.title).toBe('Product Not Found | SwiftMart');
      expect(metadata.description).toBe('The requested product is not available on SwiftMart.');
    });

    it('calls notFound() when product does not exist in shopper page component', async () => {
      mockSupabase = buildProductMock({ data: null });

      await expect(ProductDetailPage({ params: { id: 'missing-id' } })).rejects.toThrow('NEXT_NOT_FOUND');
      expect(notFoundMock).toHaveBeenCalled();
    });

    it('calls notFound() when product is inactive in shopper page component', async () => {
      const inactiveProduct = {
        id: 'prod-inactive-1',
        name: 'Archived Item',
        price_kobo: 500000,
        status: 'archived',
      };
      mockSupabase = buildProductMock({ data: inactiveProduct });

      await expect(ProductDetailPage({ params: { id: 'prod-inactive-1' } })).rejects.toThrow('NEXT_NOT_FOUND');
      expect(notFoundMock).toHaveBeenCalled();
    });

    it('throws error when Supabase fails unexpectedly', async () => {
      mockSupabase = buildProductMock({
        data: null,
        error: { code: '500', message: 'Database connection failed' },
      });

      await expect(
        ProductDetailPage({ params: { id: 'prod-fail' } })
      ).rejects.toThrow('Database connection failed');
    });
  });

  describe('Automated Schema.org Validation (Product & BreadcrumbList JSON-LD)', () => {
    it('validates Product JSON-LD price, stock availability, seller, and URL consistency with BreadcrumbList', async () => {
      const productInStock = {
        id: 'prod-in-stock',
        name: 'Smart Fitness Tracker',
        slug: 'smart-fitness-tracker',
        description: 'Heart rate and sleep monitor with GPS.',
        images: ['https://images.unsplash.com/tracker.jpg'],
        price_kobo: 1500000, // ₦15,000 base -> ₦18,000 retail
        compare_at_kobo: 2000000,
        stock: 10,
        status: 'active',
        rating: 4.6,
        review_count: 8,
        sold_count: 14,
        vendor: { id: 'vendor-tech', business_name: 'Apex Gadgets Ltd', rating: 4.8 },
      };

      mockSupabase = buildProductMock({ data: productInStock });

      const page = await ProductDetailPage({ params: { id: 'prod-in-stock' } });
      const { container } = render(page);

      const scripts = Array.from(container.querySelectorAll('script[type="application/ld+json"]'));
      const productScript = scripts.find((s) => s.textContent?.includes('"@type":"Product"'));
      const breadcrumbScript = scripts.find((s) => s.textContent?.includes('"@type":"BreadcrumbList"'));

      expect(productScript).toBeDefined();
      expect(breadcrumbScript).toBeDefined();

      const productSchema = JSON.parse(productScript!.textContent || '{}');
      const breadcrumbSchema = JSON.parse(breadcrumbScript!.textContent || '{}');

      // Product Schema Structure
      expect(productSchema['@context']).toBe('https://schema.org');
      expect(productSchema['@type']).toBe('Product');
      expect(productSchema.name).toBe('Smart Fitness Tracker');
      expect(productSchema.sku).toBe('prod-in-stock');
      expect(productSchema.description).toBe('Heart rate and sleep monitor with GPS.');
      expect(productSchema.image).toEqual(['https://images.unsplash.com/tracker.jpg']);

      // Offer Verification: 20% markup (15000 * 1.2 = 18000.00)
      expect(productSchema.offers['@type']).toBe('Offer');
      expect(productSchema.offers.priceCurrency).toBe('NGN');
      expect(productSchema.offers.price).toBe('18000.00');
      expect(productSchema.offers.availability).toBe('https://schema.org/InStock');
      expect(productSchema.offers.url).toBe('https://swiftmart.ng/products/prod-in-stock');
      expect(productSchema.offers.seller).toEqual({
        '@type': 'Organization',
        name: 'Apex Gadgets Ltd',
      });

      // Rating verification
      expect(productSchema.aggregateRating).toEqual({
        '@type': 'AggregateRating',
        ratingValue: 4.6,
        reviewCount: 8,
      });

      // BreadcrumbList Schema Structure & Consistency
      expect(breadcrumbSchema['@context']).toBe('https://schema.org');
      expect(breadcrumbSchema['@type']).toBe('BreadcrumbList');
      expect(breadcrumbSchema.itemListElement).toHaveLength(3);

      expect(breadcrumbSchema.itemListElement[0]).toEqual({
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://swiftmart.ng/',
      });
      expect(breadcrumbSchema.itemListElement[1]).toEqual({
        '@type': 'ListItem',
        position: 2,
        name: 'Shop',
        item: 'https://swiftmart.ng/products',
      });
      expect(breadcrumbSchema.itemListElement[2]).toEqual({
        '@type': 'ListItem',
        position: 3,
        name: 'Smart Fitness Tracker',
        item: 'https://swiftmart.ng/products/prod-in-stock',
      });

      // Strict URL consistency between Breadcrumb leaf and Product Offer URL
      expect(breadcrumbSchema.itemListElement[2].item).toBe(productSchema.offers.url);
    });

    it('sets availability to OutOfStock when product inventory is 0', async () => {
      const productOutOfStock = {
        id: 'prod-oos-1',
        name: 'Vintage Denim Jacket',
        slug: 'vintage-denim-jacket',
        description: 'Classic washed denim jacket.',
        images: ['https://images.unsplash.com/jacket.jpg'],
        price_kobo: 800000,
        compare_at_kobo: null,
        stock: 0,
        status: 'active',
        rating: 0,
        review_count: 0,
        sold_count: 30,
        vendor: { id: 'vendor-apparel', business_name: 'Denim House', rating: 4.5 },
      };

      mockSupabase = buildProductMock({ data: productOutOfStock });

      const page = await ProductDetailPage({ params: { id: 'prod-oos-1' } });
      const { container } = render(page);

      const scripts = Array.from(container.querySelectorAll('script[type="application/ld+json"]'));
      const productScript = scripts.find((s) => s.textContent?.includes('"@type":"Product"'));
      const productSchema = JSON.parse(productScript!.textContent || '{}');

      expect(productSchema.offers.availability).toBe('https://schema.org/OutOfStock');
      expect(productSchema.aggregateRating).toBeUndefined();
    });
  });

  describe('Browser-Level ProductGallery Keyboard Navigation & Focus Visibility', () => {
    const galleryImages = [
      'https://images.unsplash.com/photo-angle-1.jpg',
      'https://images.unsplash.com/photo-angle-2.jpg',
      'https://images.unsplash.com/photo-angle-3.jpg',
    ];

    it('manages active-image state and renders aria-current attribute correctly', () => {
      render(<ProductGallery images={galleryImages} name="Luxury Sneaker" />);

      const thumb1 = screen.getByLabelText(/View photo 1 of 3/);
      const thumb2 = screen.getByLabelText(/View photo 2 of 3/);

      // Initial active state
      expect(thumb1).toHaveAttribute('aria-current', 'true');
      expect(thumb1.className).toContain('ring-2 ring-[#D4AF37]');
      expect(thumb2).not.toHaveAttribute('aria-current');

      // Click second thumbnail
      fireEvent.click(thumb2);

      expect(thumb2).toHaveAttribute('aria-current', 'true');
      expect(thumb2.className).toContain('ring-2 ring-[#D4AF37]');
      expect(thumb1).not.toHaveAttribute('aria-current');
      expect(screen.getByAltText('Luxury Sneaker - View 2')).toBeInTheDocument();
    });

    it('supports keyboard ArrowRight and ArrowLeft cycling between thumbnails', () => {
      render(<ProductGallery images={galleryImages} name="Luxury Sneaker" />);

      const thumb1 = screen.getByLabelText(/View photo 1 of 3/);

      // ArrowRight: 1 -> 2
      fireEvent.keyDown(thumb1, { key: 'ArrowRight' });
      const thumb2 = screen.getByLabelText(/View photo 2 of 3/);
      expect(thumb2).toHaveAttribute('aria-current', 'true');
      expect(screen.getByAltText('Luxury Sneaker - View 2')).toBeInTheDocument();

      // ArrowRight: 2 -> 3
      fireEvent.keyDown(thumb2, { key: 'ArrowRight' });
      const thumb3 = screen.getByLabelText(/View photo 3 of 3/);
      expect(thumb3).toHaveAttribute('aria-current', 'true');
      expect(screen.getByAltText('Luxury Sneaker - View 3')).toBeInTheDocument();

      // ArrowRight wraps around: 3 -> 1
      fireEvent.keyDown(thumb3, { key: 'ArrowRight' });
      expect(thumb1).toHaveAttribute('aria-current', 'true');
      expect(screen.getByAltText('Luxury Sneaker - View 1')).toBeInTheDocument();

      // ArrowLeft wraps around backwards: 1 -> 3
      fireEvent.keyDown(thumb1, { key: 'ArrowLeft' });
      expect(thumb3).toHaveAttribute('aria-current', 'true');

      // ArrowLeft: 3 -> 2
      fireEvent.keyDown(thumb3, { key: 'ArrowLeft' });
      expect(thumb2).toHaveAttribute('aria-current', 'true');
    });

    it('activates thumbnail on Enter and Space keypress', () => {
      render(<ProductGallery images={galleryImages} name="Luxury Sneaker" />);

      const thumb3 = screen.getByLabelText(/View photo 3 of 3/);

      // Space key activation
      fireEvent.keyDown(thumb3, { key: ' ' });
      expect(thumb3).toHaveAttribute('aria-current', 'true');
      expect(screen.getByAltText('Luxury Sneaker - View 3')).toBeInTheDocument();

      const thumb2 = screen.getByLabelText(/View photo 2 of 3/);

      // Enter key activation
      fireEvent.keyDown(thumb2, { key: 'Enter' });
      expect(thumb2).toHaveAttribute('aria-current', 'true');
      expect(screen.getByAltText('Luxury Sneaker - View 2')).toBeInTheDocument();
    });

    it('ensures thumbnails have focus visibility ring classes for keyboard users', () => {
      render(<ProductGallery images={galleryImages} name="Luxury Sneaker" />);

      const thumbs = screen.getAllByRole('button');
      thumbs.forEach((thumb) => {
        expect(thumb.className).toContain('focus-visible:ring-2');
        expect(thumb.className).toContain('focus-visible:ring-[#D4AF37]');
      });
    });

    it('renders fallback placeholder when image list is empty', () => {
      render(<ProductGallery images={[]} name="No Image Item" />);

      expect(screen.getByText('No image available')).toBeInTheDocument();
    });
  });

  describe('Admin Product Detail Route', () => {
    it('renders financial split for active or draft product in admin console', async () => {
      const adminProduct = {
        id: 'prod-admin-1',
        name: 'Solar Power Bank',
        description: 'Fast charging power bank.',
        images: ['https://images.unsplash.com/photo-solar.jpg'],
        price_kobo: 1000000, // ₦10,000 vendor base
        compare_at_kobo: null,
        stock: 15,
        status: 'draft',
        rating: 0,
        review_count: 0,
        sold_count: 0,
        created_at: '2026-09-01T12:00:00Z',
        vendor: {
          id: 'vendor-solar',
          business_name: 'Solar Systems Nig',
          status: 'approved',
          user_id: 'user-vendor-1',
        },
      };

      mockSupabase = buildProductMock({ data: adminProduct });

      const page = await AdminProductDetailPage({ params: { id: 'prod-admin-1' } });
      render(page);

      expect(screen.getByText('Solar Power Bank')).toBeInTheDocument();
      // Markup price: ₦12,000.00
      expect(screen.getByText('₦12,000.00')).toBeInTheDocument();
      // Vendor Net Payout (10000 - 1000): ₦9,000.00
      expect(screen.getByText('₦9,000.00')).toBeInTheDocument();
      // SwiftMart Earnings (2000 markup + 1000 commission): ₦3,000.00
      expect(screen.getByText('₦3,000.00')).toBeInTheDocument();
    });

    it('calls notFound() in admin if product ID does not exist', async () => {
      mockSupabase = buildProductMock({ data: null });

      await expect(AdminProductDetailPage({ params: { id: 'missing-admin-prod' } })).rejects.toThrow('NEXT_NOT_FOUND');
      expect(notFoundMock).toHaveBeenCalled();
    });

    it('throws error when Supabase fails in admin', async () => {
      mockSupabase = buildProductMock({
        data: null,
        error: { code: '500', message: 'Fatal query failure' },
      });

      await expect(
        AdminProductDetailPage({ params: { id: 'admin-fail' } })
      ).rejects.toThrow('Fatal query failure');
    });
  });

  describe('Browser-Level Route States (Loading, Not-Found, Error)', () => {
    describe('Shopper Route States', () => {
      it('renders shopper ProductDetailLoading skeleton with pulse animation and shop link', () => {
        const { container } = render(<ProductDetailLoading />);

        const pulseWrapper = container.firstChild as HTMLElement;
        expect(pulseWrapper).toHaveClass('animate-pulse');
        expect(screen.getByRole('link', { name: /shop/i })).toHaveAttribute('href', '/products');
      });

      it('renders shopper ProductNotFound with browse and home action links', () => {
        render(<ProductNotFound />);

        expect(screen.getByRole('heading', { level: 1, name: /product not found/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /browse available products/i })).toHaveAttribute('href', '/products');
        expect(screen.getByRole('link', { name: /back to home/i })).toHaveAttribute('href', '/');
      });

      it('renders shopper ProductDetailError and executes reset callback on Retry', () => {
        const resetMock = vi.fn();
        const testError = Object.assign(new Error('Connection dropped'), { digest: 'ERR_1' });

        render(<ProductDetailError error={testError} reset={resetMock} />);

        expect(screen.getByRole('heading', { level: 1, name: /unable to load product/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /return to shop/i })).toHaveAttribute('href', '/products');

        const tryAgainBtn = screen.getByRole('button', { name: /try again/i });
        fireEvent.click(tryAgainBtn);
        expect(resetMock).toHaveBeenCalledTimes(1);
      });
    });

    describe('Admin Route States', () => {
      it('renders admin AdminProductDetailLoading skeleton with catalog navigation link', () => {
        const { container } = render(<AdminProductDetailLoading />);

        const pulseWrapper = container.firstChild as HTMLElement;
        expect(pulseWrapper).toHaveClass('animate-pulse');
        expect(screen.getByRole('link', { name: /back to product catalog/i })).toHaveAttribute('href', '/admin/products');
      });

      it('renders admin AdminProductNotFound with search and overview action links', () => {
        render(<AdminProductNotFound />);

        expect(screen.getByRole('heading', { level: 1, name: /product not found in catalog/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /search catalog/i })).toHaveAttribute('href', '/admin/products');
        expect(screen.getByRole('link', { name: /admin overview/i })).toHaveAttribute('href', '/admin');
      });

      it('renders admin AdminProductDetailError and executes reset callback on Retry', () => {
        const resetMock = vi.fn();
        const testError = Object.assign(new Error('Failed Supabase query'), { digest: 'ERR_ADMIN_1' });

        render(<AdminProductDetailError error={testError} reset={resetMock} />);

        expect(screen.getByRole('heading', { level: 1, name: /error loading product details/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /back to catalog/i })).toHaveAttribute('href', '/admin/products');

        const retryBtn = screen.getByRole('button', { name: /retry query/i });
        fireEvent.click(retryBtn);
        expect(resetMock).toHaveBeenCalledTimes(1);
      });
    });
  });
});
