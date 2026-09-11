import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <p className="text-gray-500">Please log in.</p>
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
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-md mx-auto bg-white rounded-2xl shadow-sm p-6 mt-6 text-center">
          <h1 className="text-xl font-semibold text-[#0F172A] mb-2">
            You're not a vendor yet
          </h1>
          <p className="text-sm text-gray-500 mb-4">
            Register as a vendor to start listing products and selling on SwiftMart.
          </p>
          <Link
            href="/vendor/register"
            className="inline-block bg-[#0F172A] text-[#D4AF37] font-bold py-3 px-6 rounded-xl border-2 border-[#D4AF37]"
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

  const { data: orderItems } = await supabase
    .from('order_items')
    .select('id, product_name, quantity, line_total_kobo, order:orders(id, order_number, status, created_at, customer_id)')
    .eq('vendor_id', vendor.id)
    .order('id', { ascending: false })
    .limit(30);

  const customerIds = [...new Set((orderItems ?? []).map((i: any) => i.order?.customer_id).filter(Boolean))];
  const { data: customers } = customerIds.length
    ? await supabase.from('profiles').select('id, username, full_name').in('id', customerIds)
    : { data: [] };
  const customerMap = new Map((customers ?? []).map((c) => [c.id, c]));

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-[#0F172A] px-4 py-5">
        <h1 className="text-xl font-bold text-white">{vendor.business_name}</h1>
        <p className="text-[#D4AF37] text-xs mt-1 capitalize">{vendor.status}</p>
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-500">My Products</h2>
          <Link
            href="/vendor/products/add"
            className="text-xs font-semibold bg-[#0F172A] text-[#D4AF37] px-3 py-1.5 rounded-lg border border-[#D4AF37]"
          >
            + Add Product
          </Link>
        </div>

        {(!products || products.length === 0) ? (
          <p className="text-center text-gray-400 text-sm py-8">No products yet.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2 mb-8">
            {products.map((p) => (
              <div key={p.id} className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100">
                <div className="aspect-square bg-gray-100">
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
                </div>
              </div>
            ))}
          </div>
        )}

        <h2 className="text-sm font-semibold text-gray-500 mb-3">Orders to Fulfill</h2>
        {(!orderItems || orderItems.length === 0) ? (
          <p className="text-center text-gray-400 text-sm py-8">No orders yet.</p>
        ) : (
          <div className="space-y-2">
            {orderItems.map((item: any) => {
              const customer = customerMap.get(item.order?.customer_id);
              return (
                <div key={item.id} className="bg-white rounded-xl shadow-sm p-3">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-sm font-medium text-gray-900">{item.product_name}</p>
                    <p className="text-sm font-bold text-[#0F172A]">{naira(item.line_total_kobo)}</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    Qty {item.quantity} · Order #{item.order?.order_number} · {item.order?.status}
                  </p>
                  <p className="text-xs text-gray-500">
                    Buyer: {customer?.full_name ?? customer?.username ?? 'Unknown'}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
  }
  
