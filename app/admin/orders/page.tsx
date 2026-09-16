import { createClient } from '@/lib/supabase/server';
import { CompleteOrderButton } from './CompleteOrderButton';

function naira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString('en-NG')}`;
}

export default async function AdminOrdersPage() {
  const supabase = createClient();

  const { data: orders } = await supabase
    .from('orders')
    .select('id, order_number, total_kobo, created_at, customer_id')
    .eq('status', 'shipped')
    .order('created_at', { ascending: true });

  const customerIds = [...new Set((orders ?? []).map((o) => o.customer_id))];
  const { data: customers } = customerIds.length
    ? await supabase.from('profiles').select('id, username, full_name').in('id', customerIds)
    : { data: [] };
  const customerMap = new Map((customers ?? []).map((c) => [c.id, c]));

  return (
    <div className="max-w-2xl mx-auto p-4">
      {(!orders || orders.length === 0) ? (
        <p className="text-center text-gray-500 py-16">No orders awaiting delivery confirmation.</p>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => {
            const customer = customerMap.get(o.customer_id);
            return (
              <div key={o.id} className="bg-white rounded-2xl shadow-sm p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold text-[#0F172A]">#{o.order_number}</p>
                    <p className="text-xs text-gray-500">
                      {customer?.full_name ?? customer?.username ?? 'Unknown'} ·{' '}
                      {new Date(o.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <p className="font-bold text-[#0F172A]">{naira(o.total_kobo)}</p>
                </div>
                <CompleteOrderButton orderId={o.id} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
    }
