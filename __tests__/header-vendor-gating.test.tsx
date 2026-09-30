import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import { Header } from '@/components/Header';

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

const shopperUser = { id: 'user-1', email: 'shopper@swiftmart.test' };
const vendorUser = { id: 'user-2', email: 'vendor@swiftmart.test' };

function buildSupabaseMock(user: { id: string; email: string } | null, vendorRow: unknown) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
    from: vi.fn((table: string) => {
      if (table === 'vendors') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: vendorRow }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue([{ count: 0 }]),
      };
    }),
  };
}

function openMenu() {
  fireEvent.click(screen.getByRole('button', { name: /toggle menu/i }));
}

beforeEach(() => {
  vi.mocked(usePathname).mockReturnValue('/');
});

describe('Header merchant portal role gating', () => {
  it('shows shoppers only the Become a Vendor entry and no vendor portal links', async () => {
    mockSupabase = buildSupabaseMock(shopperUser, null);
    render(<Header />);
    openMenu();

    expect(await screen.findByText('Become a Vendor')).toBeInTheDocument();
    expect(screen.queryByText('Vendor Dashboard')).not.toBeInTheDocument();
    expect(screen.queryByText('Add New Product')).not.toBeInTheDocument();
    expect(screen.queryByText('Vendor Payout Wallet')).not.toBeInTheDocument();
  });

  it('shows approved vendors the merchant portal links instead of the signup entry', async () => {
    mockSupabase = buildSupabaseMock(vendorUser, { id: 'vendor-1' });
    render(<Header />);
    openMenu();

    expect(await screen.findByText('Vendor Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Add New Product')).toBeInTheDocument();
    expect(screen.getByText('Vendor Payout Wallet')).toBeInTheDocument();
    expect(screen.queryByText('Become a Vendor')).not.toBeInTheDocument();
  });

  it('never exposes admin console links in the public drawer', async () => {
    mockSupabase = buildSupabaseMock(vendorUser, { id: 'vendor-1' });
    render(<Header />);
    openMenu();

    await waitFor(() => {
      expect(screen.queryByText(/admin/i)).not.toBeInTheDocument();
    });
  });

  it('is hidden on login, register and signup pages', () => {
    vi.mocked(usePathname).mockReturnValue('/login');
    mockSupabase = buildSupabaseMock(null, null);
    const { container } = render(<Header />);
    expect(container).toBeEmptyDOMElement();
  });
});
