import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/layout/bottom-nav';

vi.mock('next/navigation', () => ({
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

let mockSupabase: any;

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabase,
}));

function buildSupabaseMock(userRole: string | null = null, isVendor: boolean = false) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: { id: 'test-user', email: 'test@swiftmart.test' },
        },
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    from: vi.fn((table: string) => {
      if (table === 'vendors') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: isVendor ? { id: 'v-1', business_name: 'Vendor Store' } : null,
          }),
        };
      }
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: userRole ? { role: userRole } : { role: 'customer' },
          }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue([{ count: 3 }]),
      };
    }),
  };
}

describe('Dashboard Operational Navigation & Cart Gating', () => {
  it('hides the cart and shows operational admin links and sign out when on /admin', async () => {
    vi.mocked(usePathname).mockReturnValue('/admin');
    mockSupabase = buildSupabaseMock('admin', false);

    render(<Header />);

    // Cart is hidden in header
    expect(screen.queryByLabelText(/shopping cart/i)).not.toBeInTheDocument();

    // Top header shows quick Sign Out button
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();

    // Open drawer menu
    fireEvent.click(screen.getByRole('button', { name: /toggle menu/i }));

    // Admin operational sections appear
    expect(await screen.findByText('Admin Core')).toBeInTheDocument();
    expect(screen.getByText('System Pulse & Overview')).toBeInTheDocument();
    expect(screen.getByText('Profit Treasury & Escrow')).toBeInTheDocument();
    expect(screen.getByText('Orders & Escrow Releases')).toBeInTheDocument();
    expect(screen.getByText('Vendor Payout Requests')).toBeInTheDocument();
    expect(screen.getByText('Vendor Directory & KYC')).toBeInTheDocument();
    expect(screen.getByText('Product Approvals')).toBeInTheDocument();

    // Shopper cart & order links are replaced
    expect(screen.queryByText('My Orders & Waybill')).not.toBeInTheDocument();
    expect(screen.queryByText('Shopping Cart')).not.toBeInTheDocument();
  });

  it('hides the cart and shows operational vendor links and sign out when on /vendor', async () => {
    vi.mocked(usePathname).mockReturnValue('/vendor');
    mockSupabase = buildSupabaseMock('customer', true);

    render(<Header />);

    // Cart is hidden
    expect(screen.queryByLabelText(/shopping cart/i)).not.toBeInTheDocument();

    // Header has sign out
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();

    // Open drawer
    fireEvent.click(screen.getByRole('button', { name: /toggle menu/i }));

    // Vendor operational sections appear
    expect(await screen.findByText('Store Operations')).toBeInTheDocument();
    expect(screen.getByText('Vendor Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Add New Product')).toBeInTheDocument();
    expect(screen.getByText('Vendor Payout Wallet')).toBeInTheDocument();
    expect(screen.getByText('Withdraw to Bank')).toBeInTheDocument();

    // Shopper cart is replaced
    expect(screen.queryByText('My Orders & Waybill')).not.toBeInTheDocument();
    expect(screen.queryByText('Shopping Cart')).not.toBeInTheDocument();
  });

  it('renders operational bottom nav items for admin and vendor without shopper items', () => {
    vi.mocked(usePathname).mockReturnValue('/admin');
    const { unmount } = render(<BottomNav />);
    expect(screen.getByText('Console')).toBeInTheDocument();
    expect(screen.getByText('Escrow')).toBeInTheDocument();
    expect(screen.getByText('Treasury')).toBeInTheDocument();
    expect(screen.queryByText('Alerts')).not.toBeInTheDocument();
    unmount();

    vi.mocked(usePathname).mockReturnValue('/vendor');
    render(<BottomNav />);
    expect(screen.getByText('Store')).toBeInTheDocument();
    expect(screen.getByText('Add Item')).toBeInTheDocument();
    expect(screen.getByText('Catalog')).toBeInTheDocument();
    expect(screen.queryByText('Alerts')).not.toBeInTheDocument();
  });
});
