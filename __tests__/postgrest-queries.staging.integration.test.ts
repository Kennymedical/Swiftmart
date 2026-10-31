import { createClient } from '@supabase/supabase-js';
import { describe, it, expect } from 'vitest';

/**
 * Staging-only PostgREST integration tests.
 *
 * Exercises the actual live PostgREST endpoints and query schemas for:
 * - Orders & order_items (including delivered_at, line_total_kobo, vendor_payout_kobo)
 * - Profiles (is_active boolean, role)
 * - Vendors (status, business_name)
 * - Products (vendor_id, price_kobo, stock)
 * - Wallets & Transactions (user_id and wallet_id foreign keys)
 *
 * Runs ONLY when staging credentials are explicitly provided:
 * SUPABASE_INTEGRATION_URL=... SUPABASE_INTEGRATION_SERVICE_ROLE_KEY=... npm run test:integration:postgrest
 *
 * SAFELY SKIPS in CI, local unit test runs, or environments without staging credentials.
 */

const url = process.env.SUPABASE_INTEGRATION_URL;
const serviceKey = process.env.SUPABASE_INTEGRATION_SERVICE_ROLE_KEY;
const enabled = Boolean(url && serviceKey);
const suite = enabled ? describe : describe.skip;

const supabase = enabled
  ? createClient(url!, serviceKey!, { auth: { autoRefreshToken: false, persistSession: false } })
  : null;

suite('Staging PostgREST Query & Schema Integration Tests (Live Database)', () => {
  it('executes orders query including delivered_at and order_items line_total_kobo and vendor_payout_kobo without schema errors', async () => {
    // Validates that PostgREST accepts the real column projections used in admin & vendor wallet/orders
    const { data, error } = await supabase!
      .from('orders')
      .select(`
        id,
        order_number,
        total_kobo,
        status,
        delivered_at,
        created_at,
        order_items (
          id,
          order_id,
          line_total_kobo,
          vendor_payout_kobo,
          product_name,
          unit_price_kobo,
          quantity
        )
      `)
      .limit(5);

    expect(error, error?.message).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });

  it('queries profiles using is_active, role, full_name, and rejects nonexistent status column', async () => {
    // Querying with actual columns succeeds
    const { data, error } = await supabase!
      .from('profiles')
      .select('id, full_name, phone, role, is_active, created_at')
      .limit(5);

    expect(error, error?.message).toBeNull();
    expect(Array.isArray(data)).toBe(true);

    // Confirm that PostgREST schema rejects 'status' column on profiles
    const { error: invalidColError } = await supabase!
      .from('profiles')
      .select('id, status')
      .limit(1);

    expect(invalidColError).not.toBeNull();
  });

  it('queries vendors using business_name, status, and KYC columns', async () => {
    const { data, error } = await supabase!
      .from('vendors')
      .select('id, user_id, business_name, status, commission_rate, rating')
      .limit(5);

    expect(error, error?.message).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });

  it('queries products with vendor_id foreign key, price_kobo, and stock', async () => {
    const { data, error } = await supabase!
      .from('products')
      .select('id, vendor_id, name, price_kobo, stock, status')
      .limit(5);

    expect(error, error?.message).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });

  it('queries wallets by user_id and transactions by wallet_id', async () => {
    const { data: wallets, error: walletError } = await supabase!
      .from('wallets')
      .select('id, user_id, balance_kobo')
      .limit(5);

    expect(walletError, walletError?.message).toBeNull();
    expect(Array.isArray(wallets)).toBe(true);

    const { data: txs, error: txError } = await supabase!
      .from('transactions')
      .select('id, wallet_id, type, amount_kobo, status, created_at')
      .limit(5);

    expect(txError, txError?.message).toBeNull();
    expect(Array.isArray(txs)).toBe(true);
  });
});
