// POST /api/chat/vendor
// Body: { vendorId, productId?, orderId? }
// Starts (or reuses) the customer <-> vendor thread, optionally with a product or order card.
import { NextResponse } from 'next/server';
import {
  adminDb, getUser, fail, isUuid, isBlocked, getApprovedVendor,
  getOrCreateVendorThread, postMessage,
} from '../../../../lib/chat/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return fail(401, 'Not signed in');

  const body = await req.json().catch(() => ({} as any));
  const { vendorId, productId, orderId } = body;
  if (!isUuid(vendorId)) return fail(400, 'vendorId is required');
  if (productId && !isUuid(productId)) return fail(400, 'Invalid productId');
  if (orderId && !isUuid(orderId)) return fail(400, 'Invalid orderId');

  const db = adminDb();

  try {
    const vendor = await getApprovedVendor(db, vendorId);
    if (!vendor) return fail(404, 'Store not found');
    if (vendor.user_id === user.id) return fail(400, 'You cannot message your own store');
    if (await isBlocked(db, user.id, vendor.user_id)) return fail(403, 'You cannot message this store');

    let card: { type: string; metadata: Record<string, unknown>; key: string } | null = null;

    if (orderId) {
      // The order must be the caller's, and must include items from this vendor.
      const { data: order } = await db
        .from('orders').select('id, order_number, status, customer_id').eq('id', orderId).maybeSingle();
      if (!order || order.customer_id !== user.id) return fail(403, 'Order not found');

      const { data: items } = await db
        .from('order_items').select('product_name, quantity')
        .eq('order_id', orderId).eq('vendor_id', vendor.id);
      if (!items || items.length === 0) return fail(403, 'This order has no items from this store');

      card = {
        type: 'order_card',
        key: 'order_id',
        metadata: {
          order_id: order.id,
          order_number: order.order_number,
          status: order.status,
          items: items.slice(0, 5),
        },
      };
    } else if (productId) {
      const { data: product } = await db
        .from('products').select('id, name, price_kobo, images')
        .eq('id', productId).eq('vendor_id', vendor.id).maybeSingle();
      if (!product) return fail(404, 'Product not found');

      card = {
        type: 'product_card',
        key: 'product_id',
        metadata: {
          product_id: product.id,
          name: product.name,
          price_kobo: product.price_kobo,
          image: product.images?.[0] ?? null,
        },
      };
    }

    const thread = await getOrCreateVendorThread(db, user.id, vendor);

    // Do not repeat the same card if one was posted in the last 24 hours.
    if (card) {
      const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const { data: dup } = await db
        .from('chat_messages').select('id')
        .eq('conversation_id', thread.id)
        .eq('type', card.type)
        .eq(`metadata->>${card.key}`, String(card.metadata[card.key]))
        .gte('created_at', since)
        .limit(1);
      if (!dup || dup.length === 0) {
        await postMessage(db, thread.id, user.id, card.type, null, card.metadata);
      }
    }

    return NextResponse.json({ conversationId: thread.id, created: thread.created });
  } catch (e: any) {
    return fail(500, e?.message ?? 'Could not start chat');
  }
}
