import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import { AdminNav } from '@/app/admin/AdminNav';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}));

describe('AdminNav Nested Route Active States & Pillar Highlights', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('highlights Overview pillar on /admin root', () => {
    vi.mocked(usePathname).mockReturnValue('/admin');
    render(<AdminNav />);

    const overviewTab = screen.getByRole('tab', { name: /overview/i });
    expect(overviewTab).toHaveAttribute('aria-selected', 'true');
    expect(overviewTab).toHaveAttribute('aria-current', 'page');
  });

  it('highlights Ledger & Treasury and Profit Wallet sub-tab on /admin/wallet', () => {
    vi.mocked(usePathname).mockReturnValue('/admin/wallet');
    render(<AdminNav />);

    const treasuryTab = screen.getByRole('tab', { name: /ledger & treasury/i });
    expect(treasuryTab).toHaveAttribute('aria-selected', 'true');

    const profitWalletSub = screen.getByRole('tab', { name: /profit wallet/i });
    expect(profitWalletSub).toHaveAttribute('aria-selected', 'true');
  });

  it('highlights Ledger & Treasury and Users Escrows sub-tab on /admin/orders', () => {
    vi.mocked(usePathname).mockReturnValue('/admin/orders');
    render(<AdminNav />);

    const treasuryTab = screen.getByRole('tab', { name: /ledger & treasury/i });
    expect(treasuryTab).toHaveAttribute('aria-selected', 'true');

    const escrowsSub = screen.getByRole('tab', { name: /users escrows/i });
    expect(escrowsSub).toHaveAttribute('aria-selected', 'true');
  });

  it('highlights Ledger & Treasury and Payout Queues sub-tab on /admin/payouts', () => {
    vi.mocked(usePathname).mockReturnValue('/admin/payouts');
    render(<AdminNav />);

    const treasuryTab = screen.getByRole('tab', { name: /ledger & treasury/i });
    expect(treasuryTab).toHaveAttribute('aria-selected', 'true');

    const payoutsSub = screen.getByRole('tab', { name: /payout queues/i });
    expect(payoutsSub).toHaveAttribute('aria-selected', 'true');
  });

  it('highlights Directory and Vendors sub-tab on /admin/vendors', () => {
    vi.mocked(usePathname).mockReturnValue('/admin/vendors');
    render(<AdminNav />);

    const directoryTab = screen.getByRole('tab', { name: /directory/i });
    expect(directoryTab).toHaveAttribute('aria-selected', 'true');

    const vendorsSub = screen.getByRole('tab', { name: /^vendors$/i });
    expect(vendorsSub).toHaveAttribute('aria-selected', 'true');
  });

  it('highlights Directory and Customers & Staff sub-tab on /admin/staff and /admin/users', () => {
    vi.mocked(usePathname).mockReturnValue('/admin/staff');
    const { unmount } = render(<AdminNav />);

    const directoryTab = screen.getByRole('tab', { name: /directory/i });
    expect(directoryTab).toHaveAttribute('aria-selected', 'true');

    const staffSub = screen.getByRole('tab', { name: /customers & staff/i });
    expect(staffSub).toHaveAttribute('aria-selected', 'true');
    unmount();

    vi.mocked(usePathname).mockReturnValue('/admin/users');
    render(<AdminNav />);
    expect(screen.getByRole('tab', { name: /directory/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /customers & staff/i })).toHaveAttribute('aria-selected', 'true');
  });

  it('highlights Directory and KYC Approvals sub-tab on /admin/kyc', () => {
    vi.mocked(usePathname).mockReturnValue('/admin/kyc');
    render(<AdminNav />);

    expect(screen.getByRole('tab', { name: /directory/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /kyc approvals/i })).toHaveAttribute('aria-selected', 'true');
  });

  it('highlights Catalog & Marketplace and Markups & Rates on /admin/commissions', () => {
    vi.mocked(usePathname).mockReturnValue('/admin/commissions');
    render(<AdminNav />);

    expect(screen.getByRole('tab', { name: /catalog & marketplace/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /markups & rates/i })).toHaveAttribute('aria-selected', 'true');
  });
});
