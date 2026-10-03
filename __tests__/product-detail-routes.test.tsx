import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProductDetailPage, { generateMetadata } from '@/app/products/[id]/page';
import AdminProductDetailPage from '@/app/admin/products/[id]/page';
import { ProductGallery } from '@/components/products/ProductGallery';
import { notFound } from 'next/navigation';

vi.mock('next/navigation', () => ({
  notFound: vi.fn(),
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

  describe('Shopper Product Detail Route', () => {
    it('renders active product details with 20% retail markup and JSON-LD schema', async () => {
      const productData = {
        id: 'prod-123',
        name: 'Luxury Wristwatch',
        slug: 'luxury-wristwatch',
        description: 'Handcrafted luxury wristwatch.',
        images: ['https://images.unsplash.com/photo-watch-1.jpg'],
        price_kobo: 1000000, // ₦10,000 base -> ₦12,000 retail
        compare_at_kobo: null,
        stock: 5,
        status: 'active',
        rating: 4.8,
        review_count: 12,
        sold_count: 25,
        vendor: { id: 'vendor-1', business_name: 'Crown Watches', rating: 4.9 },
      };

      mockSupabase = buildProductMock({ data: productData });

      const page = await ProductDetailPage({ params: { id: 'prod-123' } });
      const { container } = render(page);

      expect(screen.getByText('Luxury Wristwatch')).toBeInTheDocument();
      expect(screen.getByText('₦12,000')).toBeInTheDocument();
      expect(screen.getByText('Crown Watches')).toBeInTheDocument();
      expect(screen.getByText('In Stock (5 available)')).toBeInTheDocument();
      expect(screen.getByTestId('mock-add-to-cart')).toBeInTheDocument();

      // JSON-LD structured data verification
      const scriptTag = container.querySelector('script[type="application/ld+json"]');
      expect(scriptTag).not.toBeNull();
      const schema = JSON.parse(scriptTag!.textContent || '{}');
      expect(schema['@type']).toBe('Product');
      expect(schema.name).toBe('Luxury Wristwatch');
      expect(schema.offers.price).toBe('12000.00');
      expect(schema.offers.seller.name).toBe('Crown Watches');
      expect(schema.offers.availability).toBe('https://schema.org/InStock');
    });

    it('generates dynamic metadata and Open Graph tags for active products', async () => {
      const productData = {
        id: 'prod-123',
        name: 'Leather Handbag',
        description: 'Premium Italian leather handbag.',
        images: ['https://images.unsplash.com/photo-bag-1.jpg'],
        price_kobo: 2000000, // ₦20,000 base -> ₦24,000 retail
        status: 'active',
      };

      mockSupabase = buildProductMock({ data: productData });

      const metadata = await generateMetadata({ params: { id: 'prod-123' } });

      expect(metadata.title).toBe('Leather Handbag - ₦24,000 | SwiftMart');
      expect(metadata.description).toBe('Premium Italian leather handbag.');
      expect(metadata.openGraph?.title).toBe('Leather Handbag - ₦24,000 | SwiftMart');
      expect(metadata.openGraph?.images).toEqual([
        { url: 'https://images.unsplash.com/photo-bag-1.jpg', alt: 'Leather Handbag' },
      ]);
      expect(metadata.twitter?.card).toBe('summary_large_image');
    });

    it('calls notFound() when product does not exist', async () => {
      mockSupabase = buildProductMock({ data: null });

      await ProductDetailPage({ params: { id: 'missing-id' } });
      expect(notFound).toHaveBeenCalled();
    });

    it('calls notFound() when product is draft or inactive for shoppers', async () => {
      const draftProduct = {
        id: 'prod-draft',
        name: 'Draft Product',
        price_kobo: 500000,
        status: 'draft',
      };
      mockSupabase = buildProductMock({ data: draftProduct });

      await ProductDetailPage({ params: { id: 'prod-draft' } });
      expect(notFound).toHaveBeenCalled();
    });

    it('throws error when Supabase fails unexpectedly', async () => {
      mockSupabase = buildProductMock({
        data: null,
        error: { code: '500', message: 'Database timeout connection failure' },
      });

      await expect(
        ProductDetailPage({ params: { id: 'prod-fail' } })
      ).rejects.toThrow('Database timeout connection failure');
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

      await AdminProductDetailPage({ params: { id: 'missing-admin-prod' } });
      expect(notFound).toHaveBeenCalled();
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

  describe('ProductGallery Keyboard Accessibility', () => {
    const testImages = [
      'https://images.unsplash.com/photo-1.jpg',
      'https://images.unsplash.com/photo-2.jpg',
      'https://images.unsplash.com/photo-3.jpg',
    ];

    it('updates active image when clicking a thumbnail', () => {
      render(<ProductGallery images={testImages} name="Test Shoes" />);

      const thumb2 = screen.getByLabelText(/View photo 2 of 3/);
      expect(thumb2).not.toHaveAttribute('aria-current');

      fireEvent.click(thumb2);
      expect(thumb2).toHaveAttribute('aria-current', 'true');
      expect(screen.getByAltText('Test Shoes - View 2')).toBeInTheDocument();
    });

    it('navigates next and previous thumbnails using ArrowRight and ArrowLeft', () => {
      render(<ProductGallery images={testImages} name="Test Shoes" />);

      const thumb1 = screen.getByLabelText(/View photo 1 of 3/);
      expect(thumb1).toHaveAttribute('aria-current', 'true');

      // Press ArrowRight to move to photo 2
      fireEvent.keyDown(thumb1, { key: 'ArrowRight' });
      const thumb2 = screen.getByLabelText(/View photo 2 of 3/);
      expect(thumb2).toHaveAttribute('aria-current', 'true');

      // Press ArrowLeft to move back to photo 1
      fireEvent.keyDown(thumb2, { key: 'ArrowLeft' });
      expect(thumb1).toHaveAttribute('aria-current', 'true');
    });
  });
});
