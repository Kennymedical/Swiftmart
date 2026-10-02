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
      <div className="min-h-screen flex items-center justify-center bg-[#0A1028] p-4 text-[#D4AF37]">
        <p>Please log in.</p>
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
      <div className="min-h-screen bg-[#0A1028] text-white p-4">
        <div className="max-w-md mx-auto bg-[#151B3D] border border-[#D4AF37]/30 rounded-2xl shadow-xl p-6 mt-6 text-center">
          <h1 className="text-xl font-bold text-white mb-2">
            You're not a vendor yet
          </h1>
          <p className="text-sm text-slate-300 mb-5">
            Register as a vendor to start listing products and selling on SwiftMart with secure escrow payouts.
          </p>
          <Link
            href="/vendor/register"
            className="inline-block bg-[#F5C445] text-black font-extrabold py-3 px-6 rounded-xl hover:bg-[#D4AF37] transition shadow-lg"
          >
            Become a Vendor
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
    <div className="min-h-screen bg-[#0A1931] text-[#F5F7FA] pb-24">
      <div className="bg-[#0F172A] px-4 py-5">
        <h1 className="text-xl font-bold text-white">{vendor.business_name}</h1>
        <p className="text-[#D4AF37] text-xs mt-1 capitalize">{vendor.status}</p>
      </div>

      <div className="p-4">
        {/* Products Section */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[#A8B0C5]">My Products</h2>
          <Link
            href="/vendor/products/add"
            className="text-xs font-semibold bg-[#0F172A] text-[#D4AF37] px-3 py-1.5 rounded-lg border border-[#D4AF37]"
          >
            + Add Product
          </Link>
        </div>

        {!products || products.length === 0 ? (
          <p className="text-center text-[#8A94B0] text-sm py-8">No products yet.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2 mb-8">
            {products.map((p) => (
              <div key={p.id} className="bg-gradient-to-b from-[#142850] to-[#1B2F5E] rounded-xl overflow-hidden shadow-sm border border-[#D4AF37]/20">
                <div className="aspect-square bg-[#0F2140]">
                  {p.images?.[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="p-2">
                  <p className="text-xs font-medium line-clamp-1">{p.name}</p>
                  <p className="text-xs text-[#0F172A] font-bold">{naira(p.price_kobo)}</p>
                  <p className={`text-[10px] mt-1 capitalize ${p.status === 'active' ? 'text-green-600' : 'text-amber-600'}`}>
                    {p.status}
                  </p>
                  <VendorProductActions productId={p.id} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Orders to Fulfill Section */}
        <h2 className="text-sm font-semibold text-[#A8B0C5] mb-3">Orders to Fulfill</h2>
        <VendorOrdersList items={formattedItems} />
      </div>
    </div>
  );
}
