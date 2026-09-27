// supabase/functions/checkout-cart/index.ts
//
// Debits the buyer's wallet for goods + waybill fee, saves the delivery address,
// and creates a paid order with all items and escrow holds for vendors.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

function getSupabaseAdmin() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing Authorization header' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return json({ error: 'Invalid session' }, 401);
    }

    // Parse checkout request body
    const reqBody = await req.json().catch(() => ({}));
    const shippingAddress = reqBody.shippingAddress;
    const shippingKobo = Number(reqBody.shippingKobo) || 0;

    const admin = getSupabaseAdmin();

    // 1. Fetch buyer cart items with product details
    const { data: cartItems, error: cartError } = await admin
      .from('cart_items')
      .select('id, quantity, product:products(id, name, price_kobo, vendor_id, stock)')
      .eq('user_id', user.id);

    if (cartError || !cartItems || cartItems.length === 0) {
      return json({ error: 'Cart is empty' }, 400);
    }

    // 2. Fetch buyer wallet
    const { data: buyerWallet, error: walletError } = await admin
      .from('wallets')
      .select('id, balance_kobo')
      .eq('user_id', user.id)
      .single();

    if (walletError || !buyerWallet) {
      return json({ error: 'Wallet not found' }, 404);
    }

    // 3. Fetch vendors to compute commissions
    const vendorIds = [...new Set(cartItems.map((c: any) => c.product?.vendor_id).filter(Boolean))];
    const { data: vendors } = await admin
      .from('vendors')
      .select('id, user_id, commission_rate')
      .in('id', vendorIds);

    const vendorById = new Map((vendors ?? []).map((v) => [v.id, v]));

    let subtotalKobo = 0;
    let commissionKobo = 0;
    const orderItemRows: any[] = [];
    const payoutByVendor = new Map<string, number>();

    for (const item of cartItems as any[]) {
      const product = item.product;
      if (!product) continue;

      const lineTotal = product.price_kobo * item.quantity;
      const vendor = vendorById.get(product.vendor_id);
      const rate = vendor ? Number(vendor.commission_rate) : 10;
      const lineCommission = Math.round((lineTotal * rate) / 100);
      const vendorPayout = lineTotal - lineCommission;

      subtotalKobo += lineTotal;
      commissionKobo += lineCommission;
      payoutByVendor.set(
        product.vendor_id,
        (payoutByVendor.get(product.vendor_id) ?? 0) + vendorPayout,
      );

      orderItemRows.push({
        product_id: product.id,
        vendor_id: product.vendor_id,
        product_name: product.name,
        unit_price_kobo: product.price_kobo,
        quantity: item.quantity,
        line_total_kobo: lineTotal,
        commission_kobo: lineCommission,
        vendor_payout_kobo: vendorPayout,
      });
    }

    // Total = goods subtotal + waybill logistics fee
    const totalKobo = subtotalKobo + shippingKobo;

    if (orderItemRows.length === 0) {
      return json({ error: 'No valid products in cart' }, 400);
    }

    // 4. Balance check
    if (buyerWallet.balance_kobo < totalKobo) {
      return json({
        error: 'insufficient_balance',
        requiredKobo: totalKobo,
        balanceKobo: buyerWallet.balance_kobo,
      });
    }

    // 5. Save shipping address if provided
    let shippingAddressId: string | null = null;
    if (shippingAddress?.street && shippingAddress?.city && shippingAddress?.state) {
      const { data: addressRow, error: addrError } = await admin
        .from('addresses')
        .insert({
          user_id: user.id,
          label: 'Delivery Address',
          full_name: shippingAddress.fullName || user.email || 'Customer',
          phone: shippingAddress.phone || '',
          line1: shippingAddress.street,
          city: shippingAddress.city,
          state: shippingAddress.state,
        })
        .select('id')
        .single();

      if (!addrError && addressRow) {
        shippingAddressId = addressRow.id;
      } else {
        console.warn('Address insert warning:', addrError);
      }
    }

    // 6. Debit buyer wallet
    const newBuyerBalance = buyerWallet.balance_kobo - totalKobo;
    const { error: debitError } = await admin
      .from('wallets')
      .update({ balance_kobo: newBuyerBalance })
      .eq('id', buyerWallet.id);

    if (debitError) {
      return json({ error: 'Failed to debit wallet' }, 500);
    }

    // 7. Create order record with delivery address & shipping fee
    const orderNumber = `SM-${Date.now().toString(36).toUpperCase()}`;
    const { data: order, error: orderError } = await admin
      .from('orders')
      .insert({
        order_number: orderNumber,
        customer_id: user.id,
        status: 'paid',
        subtotal_kobo: subtotalKobo,
        shipping_kobo: shippingKobo,
        total_kobo: totalKobo,
        commission_kobo: commissionKobo,
        shipping_address_id: shippingAddressId,
        paid_with_wallet: true,
      })
      .select('id')
      .single();

    if (orderError || !order) {
      // Roll back debit
      await admin.from('wallets').update({ balance_kobo: buyerWallet.balance_kobo }).eq('id', buyerWallet.id);
      return json({ error: orderError?.message ?? 'Failed to create order' }, 500);
    }

    // 8. Insert order items
    const itemsWithOrderId = orderItemRows.map((row) => ({ ...row, order_id: order.id }));
    const { error: itemsError } = await admin
      .from('order_items')
      .insert(itemsWithOrderId);

    if (itemsError) {
      console.error('Failed to insert order items:', itemsError);
      await admin.from('wallets').update({ balance_kobo: buyerWallet.balance_kobo }).eq('id', buyerWallet.id);
      await admin.from('orders').delete().eq('id', order.id);
      return json({ error: `Failed to create order items: ${itemsError.message}` }, 500);
    }

    // 9. Record buyer transaction
    await admin.from('transactions').insert({
      wallet_id: buyerWallet.id,
      order_id: order.id,
      type: 'order_payment',
      status: 'success',
      amount_kobo: totalKobo,
      balance_after_kobo: newBuyerBalance,
      description: `Order #${orderNumber} (Goods: ₦${(subtotalKobo / 100).toLocaleString('en-NG')} + Waybill: ₦${(shippingKobo / 100).toLocaleString('en-NG')})`,
    });

    // 10. Record escrow holds per vendor + notify vendor
    for (const [vendorId, payoutKobo] of payoutByVendor.entries()) {
      const vendor = vendorById.get(vendorId);
      if (!vendor) continue;

      const { data: vendorWallet } = await admin
        .from('wallets')
        .select('id, balance_kobo')
        .eq('user_id', vendor.user_id)
        .single();

      if (!vendorWallet) continue;

      await admin.from('transactions').insert({
        wallet_id: vendorWallet.id,
        order_id: order.id,
        type: 'escrow_hold',
        status: 'pending',
        amount_kobo: payoutKobo,
        balance_after_kobo: vendorWallet.balance_kobo,
        description: `Held in escrow — order #${orderNumber} (released on delivery confirmation)`,
      });

      await admin.from('notifications').insert({
        user_id: vendor.user_id,
        type: 'order_update',
        title: 'New order to fulfill!',
        body: `Order #${orderNumber} received. Check customer delivery destination and fulfill package.`,
        link: '/vendor',
      });
    }

    // 11. Clear buyer's cart
    await admin.from('cart_items').delete().eq('user_id', user.id);

    return json({ success: true, orderId: order.id, orderNumber });
  } catch (err) {
    console.error(err);
    return json({ error: 'Internal error' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
