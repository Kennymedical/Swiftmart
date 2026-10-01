import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import { Header } from '@/components/Header';
import UserWalletPage from '@/app/wallet/page';
import BankTransferFlow, { extractEdgeError } from '@/app/wallet/send/page';
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

describe('Wallet Transfer UI: Paystack Error Rendering & Loading State Reset', () => {
  const TEST_PIN_HASH = 'a7676dcaaa624e374064b600b976ebc809645a630742ae77174284a9dc78362c'; // SHA-256 for "1234"

  function setupTransferMock(invokeWalletTransferImpl?: any) {
    return {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'user-100',
              email: 'shopper@swiftmart.test',
              user_metadata: { transaction_pin_hash: TEST_PIN_HASH },
            },
          },
        }),
        signOut: vi.fn().mockResolvedValue({}),
      },
      from: vi.fn((table: string) => {
        if (table === 'wallets') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { balance_kobo: 5000000 }, // ₦50,000 balance
            }),
          };
        }
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            ilike: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: 'prof-2', full_name: 'Amaka Eze', username: 'amaka' },
            }),
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
      functions: {
        invoke: vi.fn((fnName: string, options?: any) => {
          if (fnName.startsWith('resolve-account')) {
            return Promise.resolve({
              data: {
                banks: [{ code: '044', name: 'Access Bank' }],
              },
            });
          }
          if (fnName === 'wallet-transfer') {
            return invokeWalletTransferImpl ? invokeWalletTransferImpl(options) : Promise.resolve({ data: {} });
          }
          return Promise.resolve({ data: {} });
        }),
      },
    };
  }

  it('renders customer-facing Paystack dashboard error and resets loading state when transfer fails with non-2xx', async () => {
    let transferAttempted = false;
    mockSupabase = setupTransferMock(async () => {
      transferAttempted = true;
      return {
        error: {
          message: 'FunctionsHttpError: Edge Function returned a non-2xx status code',
        },
      };
    });

    render(<BankTransferFlow />);

    // 1. Enter username and verify
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/@username/i)).toBeInTheDocument();
    });
    const usernameInput = screen.getByPlaceholderText(/@username/i);
    fireEvent.change(usernameInput, { target: { value: '@amaka' } });

    const verifyBtn = screen.getByRole('button', { name: /verify/i });
    fireEvent.click(verifyBtn);

    await waitFor(() => {
      expect(screen.getByText('Amaka Eze')).toBeInTheDocument();
    });

    // 2. Proceed to amount step
    const continueBtn = screen.getByRole('button', { name: /^continue$/i });
    fireEvent.click(continueBtn);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument();
    });

    // 3. Enter amount
    const amountInput = screen.getByPlaceholderText('0.00');
    fireEvent.change(amountInput, { target: { value: '2000' } });

    const proceedToReviewBtn = screen.getByRole('button', { name: /^continue$/i });
    fireEvent.click(proceedToReviewBtn);

    // 4. Review details step
    await waitFor(() => {
      expect(screen.getByText('Review Transfer Details')).toBeInTheDocument();
    });
    const proceedToPinBtn = screen.getByRole('button', { name: /proceed to pin authorization/i });
    fireEvent.click(proceedToPinBtn);

    // 5. Enter 4-digit PIN: 1, 2, 3, 4
    await waitFor(() => {
      expect(screen.getByText('Enter Transaction PIN')).toBeInTheDocument();
    });

    // Verify keypad is initially rendered before submit
    expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '1' }));
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    fireEvent.click(screen.getByRole('button', { name: '4' }));

    // 6. Assert error toast renders the clear Paystack instructions
    await waitFor(() => {
      expect(
        screen.getByText(
          'Paystack transfer error: Test account balance is empty or transfers are disabled in your Paystack dashboard.'
        )
      ).toBeInTheDocument();
    });

    expect(transferAttempted).toBe(true);

    // 7. Verify loading state is reset: spinner is gone and keypad is visible again
    expect(screen.queryByText('Processing transfer securely...')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '0' })).toBeInTheDocument();
  });

  it('renders structured error message and resets loading state when backend provides error payload', async () => {
    mockSupabase = setupTransferMock(async () => {
      return {
        data: {
          error: 'Daily transfer limit of ₦100,000 exceeded for this account',
        },
      };
    });

    render(<BankTransferFlow />);

    // Step 1: Username
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/@username/i)).toBeInTheDocument();
    });
    fireEvent.change(screen.getByPlaceholderText(/@username/i), { target: { value: '@amaka' } });
    fireEvent.click(screen.getByRole('button', { name: /verify/i }));

    await waitFor(() => {
      expect(screen.getByText('Amaka Eze')).toBeInTheDocument();
    });

    // Step 2: Amount
    fireEvent.click(screen.getByRole('button', { name: /^continue$/i }));
    await waitFor(() => {
      expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument();
    });
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '5000' } });
    fireEvent.click(screen.getByRole('button', { name: /^continue$/i }));

    // Step 3: Review
    await waitFor(() => {
      expect(screen.getByText('Review Transfer Details')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /proceed to pin authorization/i }));

    // Step 4: PIN Entry
    await waitFor(() => {
      expect(screen.getByText('Enter Transaction PIN')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: '1' }));
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    fireEvent.click(screen.getByRole('button', { name: '4' }));

    // Error toast verification
    await waitFor(() => {
      expect(
        screen.getByText('Daily transfer limit of ₦100,000 exceeded for this account')
      ).toBeInTheDocument();
    });

    // Keypad restored & loading cleared
    expect(screen.queryByText('Processing transfer securely...')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
  });

  it('renders clear bank resolution error toast and clears resolving state when resolve-account returns non-2xx', async () => {
    mockSupabase = setupTransferMock();
    mockSupabase.functions.invoke = vi.fn((fnName: string) => {
      if (fnName.startsWith('resolve-account?action=banks')) {
        return Promise.resolve({
          data: {
            banks: [{ code: '044', name: 'Access Bank' }],
          },
        });
      }
      if (fnName === 'resolve-account') {
        return Promise.resolve({
          error: {
            message: 'FunctionsHttpError: Edge Function returned a non-2xx status code',
          },
        });
      }
      return Promise.resolve({ data: {} });
    });

    render(<BankTransferFlow />);

    // Switch to Bank Account tab
    const bankTab = screen.getByRole('button', { name: /bank account/i });
    fireEvent.click(bankTab);

    // Enter 10-digit account number and select bank
    await waitFor(() => {
      expect(screen.getByPlaceholderText('0123456789')).toBeInTheDocument();
    });
    fireEvent.change(screen.getByPlaceholderText('0123456789'), { target: { value: '0123456789' } });

    const bankSelect = screen.getByRole('combobox');
    fireEvent.change(bankSelect, { target: { value: '044' } });

    // Assert error toast surfaces clear Paystack message
    await waitFor(() => {
      expect(
        screen.getByText(
          'Paystack transfer error: Test account balance is empty or transfers are disabled in your Paystack dashboard.'
        )
      ).toBeInTheDocument();
    });

    // Assert resolving indicator is cleared
    expect(screen.queryByText(/verifying bank account/i)).not.toBeInTheDocument();
  });
});

describe('Wallet Transfer Duplicate Submission Prevention', () => {
  const TEST_PIN_HASH = 'a7676dcaaa624e374064b600b976ebc809645a630742ae77174284a9dc78362c';

  it('guarantees rapid repeated clicks cannot submit duplicate wallet-transfer requests', async () => {
    let callCount = 0;
    mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'u-dup-1',
              email: 'dup@swiftmart.test',
              user_metadata: { transaction_pin_hash: TEST_PIN_HASH },
            },
          },
        }),
        signOut: vi.fn().mockResolvedValue({}),
      },
      from: vi.fn((table: string) => {
        if (table === 'wallets') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { balance_kobo: 5000000 } }),
          };
        }
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            ilike: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'p-dup', username: 'kene', full_name: 'Kene Nnamdi' } }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        };
      }),
      functions: {
        invoke: vi.fn(async (fnName: string) => {
          if (fnName.startsWith('resolve-account')) return { data: { banks: [] } };
          if (fnName === 'wallet-transfer') {
            callCount++;
            // Simulate realistic network latency for the Edge Function / Paystack call
            await new Promise((resolve) => setTimeout(resolve, 80));
            return { data: { success: true, reference: 'TRX-DUP-CHECK' } };
          }
          return { data: {} };
        }),
      },
    };

    render(<BankTransferFlow />);

    // Step 1: User
    await waitFor(() => expect(screen.getByPlaceholderText(/@username/i)).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText(/@username/i), { target: { value: '@kene' } });
    fireEvent.click(screen.getByRole('button', { name: /verify/i }));

    await waitFor(() => expect(screen.getByText('Kene Nnamdi')).toBeInTheDocument());

    // Step 2: Amount
    fireEvent.click(screen.getByRole('button', { name: /^continue$/i }));
    await waitFor(() => expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '3500' } });
    fireEvent.click(screen.getByRole('button', { name: /^continue$/i }));

    // Step 3: Review
    await waitFor(() => expect(screen.getByText('Review Transfer Details')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /proceed to pin authorization/i }));

    // Step 4: PIN Entry
    await waitFor(() => expect(screen.getByText('Enter Transaction PIN')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '1' }));
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    fireEvent.click(screen.getByRole('button', { name: '3' }));

    const btn4 = screen.getByRole('button', { name: '4' });
    // Rapid repeated clicks on the confirming PIN digit
    fireEvent.click(btn4);
    fireEvent.click(btn4);
    fireEvent.click(btn4);

    await waitFor(() => expect(screen.getByText(/Transfer Successful!/i)).toBeInTheDocument());
    expect(callCount).toBe(1);
  });
});
