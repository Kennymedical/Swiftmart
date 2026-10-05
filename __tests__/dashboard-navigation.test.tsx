import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/layout/bottom-nav';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

const mockSignOut = vi.fn().mockResolvedValue({ error: null });

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'usr-1', email: 'merchant@example.com' } },
        error: null,
      }),
      signOut: mockSignOut,
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: { role: 'admin' }, error: null }),
          single: () => Promise.resolve({ data: { role: 'admin' }, error: null }),
        }),
      }),
    }),
  }),
}));

describe('Dashboard Operational Navigation & Cart Gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hides the shopper cart icon when visiting /admin and renders Admin operational actions', async () => {
    vi.mocked(usePathname).mockReturnValue('/admin');
    render(<Header />);

    await waitFor(() => {
      expect(screen.queryByLabelText('Cart')).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/cart/i)).not.toBeInTheDocument();
    });

    const openMenuButton = screen.getByLabelText('Toggle menu');
    fireEvent.click(openMenuButton);

    expect(screen.getByText('System Pulse & Overview')).toBeInTheDocument();
    expect(screen.getByText('Profit Treasury & Escrow')).toBeInTheDocument();
    expect(screen.getByText('Vendor Payout Requests')).toBeInTheDocument();
    expect(screen.getByText('Vendor Directory & KYC')).toBeInTheDocument();
  });

  it('hides the shopper cart icon when visiting /vendor and renders Vendor operational actions', async () => {
    vi.mocked(usePathname).mockReturnValue('/vendor');
    render(<Header />);

    await waitFor(() => {
      expect(screen.queryByLabelText('Cart')).not.toBeInTheDocument();
    });

    const openMenuButton = screen.getByLabelText('Toggle menu');
    fireEvent.click(openMenuButton);

    expect(screen.getByText('Vendor Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Add New Product')).toBeInTheDocument();
    expect(screen.getByText('Vendor Payout Wallet')).toBeInTheDocument();
  });

  it('renders operational bottom nav items for admin and vendor without shopper items', () => {
    vi.mocked(usePathname).mockReturnValue('/admin');
    const { unmount } = render(<BottomNav />);
    expect(screen.getByText('Console')).toBeInTheDocument();
    expect(screen.getByText('Escrow')).toBeInTheDocument();
    expect(screen.getByText('Payouts')).toBeInTheDocument();
    expect(screen.getByText('Commissions')).toBeInTheDocument();
    expect(screen.getByText('Vendors')).toBeInTheDocument();
    expect(screen.queryByText('Alerts')).not.toBeInTheDocument();
    unmount();

    vi.mocked(usePathname).mockReturnValue('/vendor');
    render(<BottomNav />);
    expect(screen.getByText('Orders')).toBeInTheDocument();
    expect(screen.getByText('Add Item')).toBeInTheDocument();
    expect(screen.getByText('Wallet')).toBeInTheDocument();
    expect(screen.getByText('Catalog')).toBeInTheDocument();
    expect(screen.queryByText('Alerts')).not.toBeInTheDocument();
  });
});
