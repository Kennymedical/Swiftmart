import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { VendorProductActions } from '@/components/VendorProductActions';
import { VendorOrdersList } from '@/components/VendorOrdersList';

function naira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString('en-NG')}`;
}

export default async function VendorDashboardPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A1A3A] p-4 text-[#E9C86A]">
        <p className="font-semibold text-lg">Please log in.</p>
      </div>
    );
  }

  const { data: vendor } = await supabase
    .from('vendors')
    .select('id, business_name, status')
    .eq('user_id', user.id)
    .single();

  if (!vendor) {
    return (
      <div className="min-h-screen bg-[#0A1A3A] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(233,200,106,0.12),rgba(255,255,255,0))] text-[#F5EAC2] p-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-gradient-to-b from-[#1E3A7A] to-[#142A5E] border border-[#E9C86A]/60 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.45),0_0_20px_rgba(233,200,106,0.15)] p-6 text-center">
          <h1 className="text-2xl font-serif font-bold text-[#E9C86A] mb-2 tracking-wide">
            You're not a vendor yet
          </h1>
          <p className="text-sm text-[#E9C86A]/80 mb-6 font-medium">
            Register as a vendor to start listing products and selling on SwiftMart with secure escrow payouts.
          </p>
          <Link
            href="/vendor/register"
            className="inline-block bg-gradient-to-r from-[#F2D57E] to-[#D4A937] text-[#0A1931] font-extrabold py-3.5 px-6 rounded-2xl shadow-[0_0_20px_rgba(233,200,106,0.4)] hover:shadow-[0_0_25px_rgba(233,200,106,0.6)] transition tracking-wide"
          >
            Register as Vendor
          </Link>
        </div>
      </div>
    );
  }

  const { data: products } = await supabase
    .from('products')
    .select('id, name, price_kobo, stock, status, images')
    .eq('vendor_id', vendor.id)
    .order('created_at', { ascending: false });

  // Query order_items with products, orders, and delivery address
  const { data: orderItems, error: itemsError } = await supabase
    .from('order_items')
    .select(`
      id,
      order_id,
      product_name,
      quantity,
      line_total_kobo,
      vendor_payout_kobo,
      products (id, images),
      orders (
        id,
        order_number,
        status,
        created_at,
        customer_id,
        shipping_kobo,
        shipping_address_id,
        addresses:shipping_address_id (
          id,
          full_name,
          phone,
          line1,
          city,
          state
        )
      )
    `)
    .eq('vendor_id', vendor.id)
    .order('id', { ascending: false })
    .limit(50);

  if (itemsError) {
    console.error('Failed to load vendor order items:', itemsError);
  }

  // Safely extract customer IDs
  const customerIds = [
    ...new Set(
      (orderItems ?? [])
        .map((i: any) => {
          const ord = Array.isArray(i.orders) ? i.orders[0] : i.orders;
          return ord?.customer_id;
        })
        .filter(Boolean),
    ),
  ];

  const { data: customers } = customerIds.length
    ? await supabase.from('profiles').select('id, username, full_name, phone').in('id', customerIds)
    : { data: [] };
  const customerMap = new Map((customers ?? []).map((c) => [c.id, c]));

  // Format orders for the interactive list and full details modal
  const formattedItems = (orderItems ?? []).map((item: any) => {
    const order = Array.isArray(item.orders) ? item.orders[0] : item.orders;
    const product = Array.isArray(item.products) ? item.products[0] : item.products;
    const imageUrl = product?.images?.[0];
    const allImages = product?.images ?? [];

    const customer = customerMap.get(order?.customer_id);
    const orderId = order?.id ?? item.order_id;
    const orderNumber = order?.order_number ?? 'N/A';
    const orderStatus = order?.status ?? 'paid';
    const customerName = customer?.full_name ?? customer?.username ?? 'Customer';
    const customerPhone = customer?.phone || '';

    const addressObj = Array.isArray(order?.addresses) ? order.addresses[0] : order?.addresses;

    const displayRecipient = addressObj?.full_name || customerName;
    const displayPhone = addressObj?.phone || customerPhone || 'No phone provided';
    const displayDestination = addressObj
      ? `${addressObj.line1}, ${addressObj.city}, ${addressObj.state}`
      : 'Address not saved on this order';

    return {
      id: item.id,
      order_id: orderId,
      product_name: item.product_name,
      quantity: item.quantity,
      line_total_kobo: item.line_total_kobo,
      vendor_payout_kobo: item.vendor_payout_kobo || item.line_total_kobo,
      imageUrl,
      allImages,
      orderNumber,
      orderStatus,
      orderDate: order?.created_at,
      customerName,
      customerPhone,
      shippingKobo: order?.shipping_kobo || 0,
      recipientName: displayRecipient,
      recipientPhone: displayPhone,
      deliveryAddress: displayDestination,
    };
  });

  return (
    <div className="min-h-screen bg-[#0A1A3A] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(233,200,106,0.08),rgba(255,255,255,0))] text-[#F5EAC2] pb-28">
      <div className="bg-gradient-to-b from-[#1E3A7A] to-[#0A1A3A] border-b border-[#E9C86A]/30 px-4 py-5 shadow-[0_4px_20px_rgba(0,0,0,0.35)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-[#E9C86A]/80 font-semibold mb-0.5">Vendor Dashboard</p>
            <h1 className="text-2xl font-serif font-bold text-[#E9C86A] tracking-wide">{vendor.business_name}</h1>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full border border-[#E9C86A]/40 bg-[#0F2550] text-[#F5EAC2] capitalize">
            {vendor.status}
          </span>
        </div>
      </div>

      <div className="p-4">
        {/* Products Section */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-serif font-bold text-[#E9C86A]">My Products</h2>
          <Link
            href="/vendor/products/add"
            className="text-xs font-bold bg-gradient-to-r from-[#F2D57E] to-[#D4A937] text-[#0A1931] px-3.5 py-1.5 rounded-xl shadow-[0_0_12px_rgba(233,200,106,0.3)] hover:shadow-[0_0_16px_rgba(233,200,106,0.5)] transition"
          >
            + Add Product
          </Link>
        </div>

        {!products || products.length === 0 ? (
          <p className="text-center text-[#E9C86A]/60 text-sm py-8 font-medium">No products yet.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2 mb-8">
            {products.map((p) => (
              <div key={p.id} className="bg-gradient-to-b from-[#1E3A7A] to-[#142A5E] rounded-xl overflow-hidden shadow-md border border-[#E9C86A]/30">
                <div className="aspect-square bg-[#0F2550]">
                  {p.images?.[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="p-2">
                  <p className="text-xs font-semibold text-[#F5EAC2] line-clamp-1">{p.name}</p>
                  <p className="text-xs text-[#E9C86A] font-extrabold">{naira(p.price_kobo)}</p>
                  <p className={`text-[10px] mt-1 capitalize font-medium ${p.status === 'active' ? 'text-[#2ED573]' : 'text-[#E9C86A]'}`}>
                    {p.status}
                  </p>
                  <VendorProductActions productId={p.id} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Orders to Fulfill Section */}
        <h2 className="text-base font-serif font-bold text-[#E9C86A] mb-3">Orders to Fulfill</h2>
        <VendorOrdersList items={formattedItems} />
      </div>
    </div>
  );
}
