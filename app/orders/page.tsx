import { createClient } from '@/lib/supabase/server';
import { CartOrdersTabs } from '@/components/CartOrdersTabs';
import { CustomerMarkDeliveredButton } from '@/components/CustomerMarkDeliveredButton';
import { ReportProblemButton } from '@/components/ReportProblemButton';

function naira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString('en-NG')}`;
}

const statusColors: Record<string, string> = {
  pending_payment: 'text-[#A8B0C5]',
  paid: 'text-blue-600',
  shipped: 'text-blue-600',
  delivered: 'text-amber-600',
  completed: 'text-green-600',
  disputed: 'text-red-600',
  refunded: 'text-red-600',
  cancelled: 'text-[#8A94B0]',
};

export default async function OrdersPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <p className="text-[#A8B0C5]">Please log in.</p>
      </div>
    );
  }

  // Fetch orders along with their individual order items using product_name
  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      status,
      total_kobo,
      created_at,
      order_items (
        id,
        product_name,
        quantity,
        unit_price_kobo
      )
    `)
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching customer orders:', error);
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-[#0F172A] px-4 py-5">
        <h1 className="text-xl font-bold text-white">
          Your <span className="text-[#D4AF37]">Orders</span>
        </h1>
      </div>

      <CartOrdersTabs />

      {!orders || orders.length === 0 ? (
        <p className="text-center text-[#A8B0C5] py-20">No orders yet.</p>
      ) : (
        <div className="p-3 space-y-3">
          {orders.map((o) => (
            <div key={o.id} className="bg-gradient-to-br from-[#142850] to-[#1B2F5E] rounded-2xl p-4 border border-[#D4AF37]/25 shadow-[0_4px_20px_rgba(212,175,55,0.08)]">
              <div className="flex justify-between items-start mb-1">
                <p className="font-semibold text-[#F5F7FA]">#{o.order_number}</p>
                <p className="font-bold text-[#F5F7FA]">{naira(o.total_kobo)}</p>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className={`font-medium capitalize ${statusColors[o.status] ?? 'text-[#A8B0C5]'}`}>
                  {o.status.replace('_', ' ')}
                </span>
                <span className="text-[#8A94B0]">
                  {new Date(o.created_at).toLocaleDateString()}
                </span>
              </div>

              {/* Items List */}
              {o.order_items && o.order_items.length > 0 && (
                <div className="mt-3 pt-2 border-t border-gray-100 space-y-1">
                  {o.order_items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center text-xs text-gray-700">
                      <span>
                        {item.product_name} <span className="text-[#8A94B0]">× {item.quantity}</span>
                      </span>
                      <span className="font-medium text-gray-600">
                        {naira(item.unit_price_kobo * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {o.status === 'shipped' && (
                <div className="mt-3">
                  <CustomerMarkDeliveredButton orderId={o.id} />
                </div>
              )}

              {o.status === 'delivered' && (
                <div className="mt-3">
                  <ReportProblemButton orderId={o.id} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
  }
