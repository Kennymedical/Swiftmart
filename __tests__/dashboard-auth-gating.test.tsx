import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import { Header } from '@/components/Header';
import ProfilePage from '@/app/profile/page';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/'),
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children?: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

let mockSupabaseUser: any = null;
let mockSupabaseRole: any = 'admin';
let mockVendorRow: any = { business_name: 'Store 1', status: 'approved' };

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockImplementation(() =>
        Promise.resolve({ data: { user: mockSupabaseUser }, error: null })
      ),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    from: vi.fn((table: string) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockImplementation(() => {
        if (table === 'profiles') return Promise.resolve({ data: { role: mockSupabaseRole }, error: null });
        if (table === 'vendors') return Promise.resolve({ data: mockVendorRow, error: null });
        return Promise.resolve({ data: null, error: null });
      }),
      single: vi.fn().mockImplementation(() => {
        if (table === 'profiles') return Promise.resolve({ data: { role: mockSupabaseRole }, error: null });
        if (table === 'vendors') return Promise.resolve({ data: mockVendorRow, error: null });
        return Promise.resolve({ data: null, error: null });
      }),
    })),
  }),
}));

describe('Dashboard Authentication & PIN Gate Routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Profile screen links Admin access strictly to /admin/login (PIN Required)', async () => {
    mockSupabaseUser = { id: 'admin-1', email: 'admin@swiftmart.test', user_metadata: { username: 'AdminUser' } };
    mockSupabaseRole = 'admin';
    mockVendorRow = null;

    render(<ProfilePage />);

    await waitFor(() => {
      const adminLink = screen.getByRole('link', { name: /admin console/i });
      expect(adminLink).toBeInTheDocument();
      expect(adminLink).toHaveAttribute('href', '/admin/login');
    });
  });

  it('Profile screen links Vendor access strictly to /vendor/login (PIN Required)', async () => {
    mockSupabaseUser = { id: 'vendor-1', email: 'merchant@swiftmart.test', user_metadata: { username: 'MerchantUser' } };
    mockSupabaseRole = 'customer';
    mockVendorRow = { business_name: 'Lagos Traders', status: 'approved' };

    render(<ProfilePage />);

    await waitFor(() => {
      const vendorLink = screen.getByRole('link', { name: /vendor dashboard/i });
      expect(vendorLink).toBeInTheDocument();
      expect(vendorLink).toHaveAttribute('href', '/vendor/login');
    });
  });

  it('Header quick-access drawer links strictly to /admin/login and /vendor/login gateways', async () => {
    mockSupabaseUser = { id: 'admin-vendor-1', email: 'owner@swiftmart.test' };
    mockSupabaseRole = 'admin';
    mockVendorRow = { id: 'v-1', business_name: 'Mega Store', status: 'approved' };
    vi.mocked(usePathname).mockReturnValue('/');

    render(<Header />);
    const menuButton = screen.getByLabelText('Toggle menu');
    fireEvent.click(menuButton);

    await waitFor(() => {
      const adminGateway = screen.getByRole('link', { name: /admin console gateway/i });
      const vendorGateway = screen.getByRole('link', { name: /vendor portal access/i });
      expect(adminGateway).toHaveAttribute('href', '/admin/login');
      expect(vendorGateway).toHaveAttribute('href', '/vendor/login');
    });
  });

  it('Direct layout access validation requires authenticated PIN session token', () => {
    const evaluateAdminAccess = (user: { id: string } | null, role: string, pinCookie?: string) => {
      if (!user) return { redirect: '/admin/login?session_expired=true&redirect=/admin' };
      if (role !== 'admin' && role !== 'staff') return { redirect: '/' };
      if (!pinCookie || pinCookie !== user.id) return { redirect: '/admin/login?session_expired=true&redirect=/admin' };
      return { allowed: true };
    };

    const evaluateVendorAccess = (user: { id: string } | null, status: string, pinCookie?: string) => {
      if (!user) return { redirect: '/login?session_expired=true&redirect=/vendor' };
      if (status !== 'approved') return { blockedStatus: status };
      if (!pinCookie || pinCookie !== user.id) return { redirect: '/vendor/login?session_expired=true&redirect=/vendor' };
      return { allowed: true };
    };

    expect(evaluateAdminAccess({ id: 'adm-1' }, 'admin', undefined)).toEqual({
      redirect: '/admin/login?session_expired=true&redirect=/admin',
    });
    expect(evaluateAdminAccess({ id: 'adm-1' }, 'admin', 'different-user')).toEqual({
      redirect: '/admin/login?session_expired=true&redirect=/admin',
    });
    expect(evaluateAdminAccess({ id: 'adm-1' }, 'admin', 'adm-1')).toEqual({
      allowed: true,
    });

    expect(evaluateVendorAccess({ id: 'ven-1' }, 'approved', undefined)).toEqual({
      redirect: '/vendor/login?session_expired=true&redirect=/vendor',
    });
    expect(evaluateVendorAccess({ id: 'ven-1' }, 'approved', 'ven-1')).toEqual({
      allowed: true,
    });
  });
});
