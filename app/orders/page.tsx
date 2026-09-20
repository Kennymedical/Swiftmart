import { createClient } from '@/lib/supabase/server';
import { ReportProblemButton } from '@/components/ReportProblemButton';

function naira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString('en-NG')}`;
}

const statusColors: Record<string, string> = {
  pending_payment: 'text-gray-500',
  paid: 'text-blue-600',
  shipped: 'text-blue-600',
  delivered: 'text-amber-600',
  completed: 'text-green-600',
  disputed: 'text-red-600',
  refunded: 'text-red-600',
  cancelled: 'text-gray-400',
};

export default async function OrdersPage() {
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

  const { data: orders } = await supabase
    .from('orders')
    .select('id, order_number, status, total_kobo, created_at')
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-[#0F172A] px-4 py-5">
        <h1 className="text-xl font-bold text-white">
          Your <span className="text-[#D4AF37]">Orders</span>
        </h1>
      </div>

      {(!orders || orders.length === 0) ? (
        <p className="text-center text-gray-500 py-20">No orders yet.</p>
      ) : (
        <div className="p-3 space-y-2">
          {orders.map((o) => (
            <div key={o.id} className="bg-white rounded-2xl shadow-sm p-4">
              <div className="flex justify-between items-start mb-1">
                <p className="font-semibold text-[#0F172A]">#{o.order_number}</p>
                <p className="font-bold text-[#0F172A]">{naira(o.total_kobo)}</p>
              </div>
              <p className={`text-xs font-medium capitalize ${statusColors[o.status] ?? 'text-gray-500'}`}>
                {o.status.replace('_', ' ')}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {new Date(o.created_at).toLocaleDateString()}
              </p>

              {o.status === 'delivered' && (
                <div className="mt-2">
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

