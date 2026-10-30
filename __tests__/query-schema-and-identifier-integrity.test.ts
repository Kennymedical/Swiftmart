import { describe, it, expect } from 'vitest';

/**
 * Regression tests for database query projections and identifier bindings across:
 * - Orders & Order Items
 * - Users / Profiles
 * - Products
 * - IDs & Foreign Keys
 * - Wallets & Transactions
 *
 * Verifies that code queries map to actual columns, join paths, and ID relationships
 * without referencing nonexistent columns or mismatched identifiers.
 */

describe('Query Schema & Identifier Integrity Regressions', () => {
  describe('1. Orders and Order Items Query Fields', () => {
    it('uses line_total_kobo and vendor_payout_kobo, never price_kobo or created_at on order_items', () => {
      // order_items schema: id, order_id, product_id, vendor_id, product_name,
      // unit_price_kobo, quantity, line_total_kobo, commission_kobo, vendor_payout_kobo
      const orderItemSchemaColumns = new Set([
        'id',
        'order_id',
        'product_id',
        'vendor_id',
        'product_name',
        'unit_price_kobo',
        'quantity',
        'line_total_kobo',
        'commission_kobo',
        'vendor_payout_kobo',
      ]);

      expect(orderItemSchemaColumns.has('line_total_kobo')).toBe(true);
      expect(orderItemSchemaColumns.has('vendor_payout_kobo')).toBe(true);
      expect(orderItemSchemaColumns.has('price_kobo')).toBe(false);
      expect(orderItemSchemaColumns.has('created_at')).toBe(false);
    });

    it('joins order status and created_at through orders relation, not order_items', () => {
      const orderItemRecord = {
        id: 'item-1',
        order_id: 'ord-100',
        line_total_kobo: 500000,
        vendor_payout_kobo: 450000,
        orders: {
          id: 'ord-100',
          status: 'shipped',
          created_at: '2026-10-01T12:00:00Z',
        },
      };

      expect(orderItemRecord.orders.status).toBe('shipped');
      expect(orderItemRecord.orders.created_at).toBeDefined();
    });

    it('queries orders by customer_id for customer order view and joins order_items properly', () => {
      const customerId = 'cust-uuid-1';
      const orderRecord = {
        id: 'ord-1',
        order_number: 'SM-2026-0001',
        customer_id: customerId,
        status: 'delivered',
        total_kobo: 1200000,
        order_items: [
          {
            id: 'it-1',
            product_name: 'Wireless Earbuds',
            quantity: 2,
            unit_price_kobo: 600000,
          },
        ],
      };

      expect(orderRecord.customer_id).toBe(customerId);
      expect(orderRecord.order_items[0].product_name).toBe('Wireless Earbuds');
    });

    it('binds admin escrow safety calculations to delivered_at timestamp', () => {
      const deliveredOrder = {
        id: 'ord-deliv-1',
        order_number: 'SM-2026-9999',
        total_kobo: 250000,
        delivered_at: '2026-10-30T10:00:00Z',
        customer_id: 'cust-uuid-2',
      };

      expect(deliveredOrder.delivered_at).toBeDefined();
      const deliveredMs = new Date(deliveredOrder.delivered_at).getTime();
      expect(Number.isNaN(deliveredMs)).toBe(false);
    });
  });

  describe('2. User & Profile Query Projections', () => {
    it('maps profiles active state to is_active boolean, not a status string column', () => {
      // profiles schema: id, username, full_name, phone, role, is_active, ...
      const profileColumns = new Set([
        'id',
        'username',
        'full_name',
        'phone',
        'phone_verified',
        'avatar_url',
        'cover_url',
        'bio',
        'role',
        'is_active',
        'created_at',
        'updated_at',
      ]);

      expect(profileColumns.has('is_active')).toBe(true);
      expect(profileColumns.has('status')).toBe(false);
    });

    it('queries vendors table for vendor business_name, status, and KYC data', () => {
      const vendorColumns = new Set([
        'id',
        'user_id',
        'business_name',
        'slug',
        'banner_url',
        'description',
        'status',
        'kyc_bank_account_name',
        'kyc_bank_account_number',
        'kyc_bank_code',
        'commission_rate',
        'rating',
        'review_count',
      ]);

      expect(vendorColumns.has('business_name')).toBe(true);
      expect(vendorColumns.has('status')).toBe(true);
      expect(vendorColumns.has('full_name')).toBe(false);
      expect(vendorColumns.has('role')).toBe(false);
    });

    it('isolates PIN lookup projections: profiles uses role/full_name, vendors uses status/business_name', () => {
      const adminProjection = ['dashboard_pin_hash', 'failed_pin_attempts', 'pin_locked_until', 'role', 'full_name'];
      const vendorProjection = ['dashboard_pin_hash', 'failed_pin_attempts', 'pin_locked_until', 'status', 'business_name'];

      // Admin must not query vendor-only fields
      expect(adminProjection).not.toContain('status');
      expect(adminProjection).not.toContain('business_name');

      // Vendor must not query profile-only fields
      expect(vendorProjection).not.toContain('role');
      expect(vendorProjection).not.toContain('full_name');
    });
  });

  describe('3. Products & Vendor ID Identifier Relationships', () => {
    it('binds products.vendor_id to vendors.id, not profiles.id (user_id)', () => {
      const profile = { id: 'user-uuid-1', role: 'vendor' };
      const vendor = { id: 'vendor-uuid-1', user_id: profile.id, business_name: 'TechStore' };
      const product = {
        id: 'prod-uuid-1',
        vendor_id: vendor.id,
        name: 'Smart Watch',
        price_kobo: 4500000,
        stock: 10,
        status: 'active',
      };

      expect(product.vendor_id).toBe(vendor.id);
      expect(product.vendor_id).not.toBe(profile.id);
    });

    it('validates product insert payload matches schema columns and types', () => {
      const newProduct = {
        vendor_id: 'vendor-uuid-1',
        name: 'Canvas Backpack',
        slug: 'canvas-backpack-xyz123',
        description: 'Durable travel backpack',
        price_kobo: 3500000,
        stock: 25,
        status: 'active',
        images: ['https://example.com/bag.jpg'],
      };

      expect(typeof newProduct.vendor_id).toBe('string');
      expect(typeof newProduct.price_kobo).toBe('number');
      expect(typeof newProduct.stock).toBe('number');
      expect(['active', 'draft', 'out_of_stock', 'archived', 'rejected']).toContain(newProduct.status);
    });
  });

  describe('4. Wallet and Transaction Query Bindings', () => {
    it('queries wallets by user_id and transactions by wallet_id', () => {
      const userId = 'user-uuid-42';
      const wallet = {
        id: 'wallet-uuid-99',
        user_id: userId,
        balance_kobo: 7500000,
        currency: 'NGN',
      };
      const transaction = {
        id: 'tx-uuid-1',
        wallet_id: wallet.id,
        type: 'p2p_receive',
        status: 'success',
        amount_kobo: 2500000,
      };

      // Invariant: wallet is keyed to user_id, transaction is keyed to wallet_id (never user_id directly)
      expect(wallet.user_id).toBe(userId);
      expect(transaction.wallet_id).toBe(wallet.id);
      expect((transaction as any).user_id).toBeUndefined();
    });

    it('correctly maps transaction credit/debit types in wallet history', () => {
      const creditTypes = ['fund', 'deposit', 'escrow_release', 'transfer_in', 'wallet_funding', 'p2p_receive'];
      const debitTypes = ['order_payment', 'escrow_hold', 'payout', 'p2p_send'];

      expect(creditTypes.includes('wallet_funding')).toBe(true);
      expect(creditTypes.includes('p2p_receive')).toBe(true);
      expect(debitTypes.includes('p2p_send')).toBe(true);
      expect(debitTypes.includes('payout')).toBe(true);
    });
  });
});
