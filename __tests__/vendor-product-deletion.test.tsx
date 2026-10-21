import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { VendorProductActions } from '@/components/VendorProductActions';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    refresh: vi.fn(),
  })),
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

describe('Vendor Product Deletion & Archiving', () => {
  let mockRefresh: any;

  beforeEach(() => {
    mockRefresh = vi.fn();
    vi.mocked(useRouter).mockReturnValue({
      push: vi.fn(),
      refresh: mockRefresh,
    } as any);
  });

  it('deletes cleanly from database when product has no past customer orders', async () => {
    const deleteSpy = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    const updateSpy = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'order_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
            }),
          };
        }
        if (table === 'products') {
          return {
            delete: deleteSpy,
            update: updateSpy,
          };
        }
        return {};
      }),
    };

    render(<VendorProductActions productId="prod-clean-delete" />);

    const deleteBtn = screen.getByRole('button', { name: /^delete$/i });
    expect(deleteBtn).toBeInTheDocument();

    // First click: prompts confirmation
    fireEvent.click(deleteBtn);
    expect(screen.getByRole('button', { name: /confirm\?/i })).toBeInTheDocument();

    // Second click: executes deletion
    fireEvent.click(screen.getByRole('button', { name: /confirm\?/i }));

    await waitFor(() => {
      // Must query order_items to verify order history
      expect(mockSupabase.from).toHaveBeenCalledWith('order_items');
      // No existing orders -> products.delete() must be invoked
      expect(deleteSpy).toHaveBeenCalledTimes(1);
      // Must NOT archive/update when clean deletion is safe
      expect(updateSpy).not.toHaveBeenCalled();
      // Router must refresh view
      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });
  });

  it('archives product with status "archived" when customer orders exist to preserve order history', async () => {
    const deleteSpy = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    const updateSpy = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'order_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ count: 4, error: null }), // 4 historical orders exist
            }),
          };
        }
        if (table === 'products') {
          return {
            delete: deleteSpy,
            update: updateSpy,
          };
        }
        return {};
      }),
    };

    render(<VendorProductActions productId="prod-with-orders" />);

    const deleteBtn = screen.getByRole('button', { name: /^delete$/i });
    fireEvent.click(deleteBtn);

    const confirmBtn = screen.getByRole('button', { name: /confirm\?/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      // Must check order_items count
      expect(mockSupabase.from).toHaveBeenCalledWith('order_items');
      // Past orders exist: must update status to archived
      expect(updateSpy).toHaveBeenCalledWith({ status: 'archived' });
      // Must NOT hard-delete to avoid foreign key errors and preserve order/dispute/escrow records
      expect(deleteSpy).not.toHaveBeenCalled();
      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });
  });

  it('displays error message and resets confirmation state if deletion or archiving fails', async () => {
    mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'order_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
            }),
          };
        }
        if (table === 'products') {
          return {
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: { message: 'Database constraint failure' } }),
            }),
          };
        }
        return {};
      }),
    };

    render(<VendorProductActions productId="prod-fail" />);

    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirm\?/i }));

    expect(await screen.findByText('Database constraint failure')).toBeInTheDocument();
    // Resets back to Delete button
    expect(screen.getByRole('button', { name: /^delete$/i })).toBeInTheDocument();
    expect(mockRefresh).not.toHaveBeenCalled();
  });
});
