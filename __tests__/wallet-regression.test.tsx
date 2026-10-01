import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import { Header } from '@/components/Header';
import UserWalletPage from '@/app/wallet/page';
import { extractEdgeError } from '@/app/wallet/send/page';
import { extractAdminPayoutError } from '@/app/admin/wallet/page';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/wallet'),
  useRouter: vi.fn(() => ({ push: vi.fn(), refresh: vi.fn() })),
  useSearchParams: vi.fn(() => new URLSearchParams()),
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

function buildCustomerWalletSupabaseMock() {
  const mockUser = { id: 'cust-1', email: 'customer@swiftmart.test' };
  const mockWallet = {
    id: 'wallet-1',
    user_id: 'cust-1',
    balance_kobo: 500000,
    virtual_account_number: '1234567890',
    virtual_account_bank: 'Wema Bank',
  };
  const mockTransactions = [
    {
      id: 'tx-1',
      wallet_id: 'wallet-1',
      type: 'fund',
      amount_kobo: 500000,
      description: 'Top up',
      created_at: new Date().toISOString(),
    },
  ];

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      signOut: vi.fn().mockResolvedValue({}),
    },
    from: vi.fn((table: string) => {
      if (table === 'wallets') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockWallet }),
        };
      }
      if (table === 'transactions') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: mockTransactions }),
        };
      }
      if (table === 'cart_items') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ count: 0 }),
        };
      }
      if (table === 'vendors') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
    }),
  };
}

describe('Single Wallet Header Regression Tests', () => {
  beforeEach(() => {
    vi.mocked(usePathname).mockReturnValue('/wallet');
    mockSupabase = buildCustomerWalletSupabaseMock();
  });

  it('renders a single global header displaying "Wallet" when on /wallet', async () => {
    const { container } = render(<Header />);

    await waitFor(() => {
      const titleElement = screen.getByRole('heading', { level: 1, name: 'Wallet' });
      expect(titleElement).toBeInTheDocument();
    });

    const headers = container.querySelectorAll('header');
    expect(headers).toHaveLength(1);
  });

  it('ensures UserWalletPage does not render an internal <header> to prevent duplicate headers', async () => {
    const { container } = render(<UserWalletPage />);

    await waitFor(() => {
      expect(screen.getByText('Available Balance')).toBeInTheDocument();
    });

    const internalHeaders = container.querySelectorAll('header');
    expect(internalHeaders).toHaveLength(0);

    expect(screen.getByText('Add Money')).toBeInTheDocument();
    expect(screen.getByText('P2P Transfer')).toBeInTheDocument();
    expect(screen.getByText('Bank Transfer')).toBeInTheDocument();
  });
});

describe('Customer Flow: Transfer Error Messaging Regression Tests', () => {
  it('translates generic non-2xx Edge Function errors into clear Paystack dashboard balance/transfer instructions', async () => {
    const non2xxError = {
      message: 'Edge Function returned a non-2xx status code',
    };

    const message = await extractEdgeError(non2xxError, 'Transfer failed');
    expect(message).toBe(
      'Paystack transfer error: Test account balance is empty or transfers are disabled in your Paystack dashboard.'
    );
  });

  it('extracts structured error field from error.context.json() when available', async () => {
    const edgeErrorWithContext = {
      message: 'FunctionsHttpError: Edge Function returned a non-2xx status code',
      context: {
        json: async () => ({ error: 'Insufficient wallet balance for this transfer' }),
      },
    };

    const message = await extractEdgeError(edgeErrorWithContext, 'Transfer failed');
    expect(message).toBe('Insufficient wallet balance for this transfer');
  });

  it('extracts structured message field from error.context.json() when available', async () => {
    const edgeErrorWithContext = {
      message: 'FunctionsHttpError: Edge Function returned a non-2xx status code',
      context: {
        json: async () => ({ message: 'Beneficiary account number could not be resolved' }),
      },
    };

    const message = await extractEdgeError(edgeErrorWithContext, 'Transfer failed');
    expect(message).toBe('Beneficiary account number could not be resolved');
  });

  it('returns standard error message when it is a normal descriptive error', async () => {
    const standardError = new Error('Daily transfer limit exceeded');
    const message = await extractEdgeError(standardError, 'Transfer failed');
    expect(message).toBe('Daily transfer limit exceeded');
  });

  it('falls back to provided fallback string when error is empty or undefined', async () => {
    const message = await extractEdgeError(null, 'Custom fallback error');
    expect(message).toBe('Custom fallback error');
  });
});

describe('Admin Flow: Payout Error Messaging Regression Tests', () => {
  it('translates generic non-2xx Edge Function errors into clear Paystack admin instructions', async () => {
    const payoutErr = {
      message: 'Edge Function returned a non-2xx status code',
    };

    const message = await extractAdminPayoutError(payoutErr, null);
    expect(message).toBe(
      'Paystack transfer error: Check your Paystack dashboard balance and ensure Transfers are enabled for your account.'
    );
  });

  it('surfaces explicit payload error from payoutData when provided by edge response', async () => {
    const payoutData = {
      error: 'Invalid recipient bank code or account number',
    };

    const message = await extractAdminPayoutError(null, payoutData);
    expect(message).toBe('Invalid recipient bank code or account number');
  });

  it('extracts nested error from payoutErr.context.json() when edge function returns detailed JSON', async () => {
    const payoutErr = {
      message: 'FunctionsHttpError: non-2xx',
      context: {
        json: async () => ({ error: 'Treasury payout exceeds available balance' }),
      },
    };

    const message = await extractAdminPayoutError(payoutErr, null);
    expect(message).toBe('Treasury payout exceeds available balance');
  });

  it('falls back to default fallback when payoutErr has no message or context', async () => {
    const message = await extractAdminPayoutError({}, null, 'Default payout failure');
    expect(message).toBe('Default payout failure');
  });
});
