import { createClient } from '@/lib/supabase/server';
import { MarkDeliveredButton, ReleaseEscrowButton, ResolveDisputeButtons } from './OrderActions';

function naira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString('en-NG')}`;
}

// Reduced from 48h to 12h
const SAFETY_WINDOW_HOURS = 12;

export default async function AdminOrdersPage() {
  const supabase = createClient();

  const [{ data: shipped }, { data: delivered }, { data: disputedOrders }] = await Promise.all([
    supabase
      .from('orders')
      .select('id, order_number, total_kobo, created_at, customer_id')
      .eq('status', 'shipped')
      .order('created_at', { ascending: true }),
    supabase
      .from('orders')
      .select('id, order_number, total_kobo, delivered_at, customer_id')
      .eq('status', 'delivered')
      .order('delivered_at', { ascending: true }),
    supabase
      .from('orders')
      .select('id, order_number, total_kobo, customer_id')
      .eq('status', 'disputed')
      .order('created_at', { ascending: true }),
  ]);

  const allCustomerIds = [
    ...new Set([
      ...(shipped ?? []).map((o) => o.customer_id),
      ...(delivered ?? []).map((o) => o.customer_id),
      ...(disputedOrders ?? []).map((o) => o.customer_id),
    ]),
  ];
  const { data: customers } = allCustomerIds.length
    ? await supabase.from('profiles').select('id, username, full_name').in('id', allCustomerIds)
    : { data: [] };
  const customerMap = new Map((customers ?? []).map((c) => [c.id, c]));

  const disputeOrderIds = (disputedOrders ?? []).map((o) => o.id);
  const { data: disputes } = disputeOrderIds.length
    ? await supabase
        .from('disputes')
        .select('id, order_id, reason, category, evidence_urls, created_at')
        .in('order_id', disputeOrderIds)
        .eq('status', 'open')
    : { data: [] };
  const disputeByOrder = new Map((disputes ?? []).map((d) => [d.order_id, d]));

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-8">
      {/* Awaiting Delivery Confirmation */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 mb-3">Awaiting Delivery Confirmation</h2>
        {!shipped || shipped.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-8">Nothing shipped yet.</p>
        ) : (
          <div className="space-y-2">
            {shipped.map((o) => {
              const c = customerMap.get(o.customer_id);
              return (
                <div key={o.id} className="bg-white rounded-2xl shadow-sm p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-[#0F172A]">#{o.order_number}</p>
                      <p className="text-xs text-gray-500">{c?.full_name ?? c?.username ?? 'Unknown'}</p>
                    </div>
                    <p className="font-bold text-[#0F172A]">{naira(o.total_kobo)}</p>
                  </div>
                  <MarkDeliveredButton orderId={o.id} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* In Safety Window (12h) */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 mb-3">
          In Safety Window ({SAFETY_WINDOW_HOURS}h)
        </h2>
        {!delivered || delivered.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-8">Nothing awaiting release.</p>
        ) : (
          <div className="space-y-2">
            {delivered.map((o) => {
              const c = customerMap.get(o.customer_id);
              const hoursSince = (Date.now() - new Date(o.delivered_at).getTime()) / 3600000;
              const hoursLeft = Math.max(0, Math.ceil(SAFETY_WINDOW_HOURS - hoursSince));
              return (
                <div key={o.id} className="bg-white rounded-2xl shadow-sm p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-[#0F172A]">#{o.order_number}</p>
                      <p className="text-xs text-gray-500">{c?.full_name ?? c?.username ?? 'Unknown'}</p>
                      <p className="text-xs text-amber-600 mt-0.5">
                        {hoursLeft > 0 ? `${hoursLeft}h remaining` : 'Ready to release'}
                      </p>
                    </div>
                    <p className="font-bold text-[#0F172A]">{naira(o.total_kobo)}</p>
                  </div>
                  <ReleaseEscrowButton orderId={o.id} disabled={hoursLeft > 0} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Disputed Section */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 mb-3">Disputed</h2>
        {!disputedOrders || disputedOrders.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-8">No open disputes.</p>
        ) : (
          <div className="space-y-3">
            {disputedOrders.map((o) => {
              const c = customerMap.get(o.customer_id);
              const dispute = disputeByOrder.get(o.id);
              return (
                <div key={o.id} className="bg-white rounded-2xl shadow-sm p-4 border-2 border-red-100">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-[#0F172A]">#{o.order_number}</p>
                      <p className="text-xs text-gray-500">{c?.full_name ?? c?.username ?? 'Unknown'}</p>
                    </div>
                    <p className="font-bold text-[#0F172A]">{naira(o.total_kobo)}</p>
                  </div>

                  {dispute && (
                    <div className="mb-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-red-100 text-red-700">
                          {dispute.category?.replace('_', ' ') ?? 'Dispute'}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {new Date(dispute.created_at).toLocaleString()}
                        </span>
                      </div>

                      <p className="text-xs text-red-900 bg-red-50/80 rounded-lg p-2.5 border border-red-100">
                        {dispute.reason}
                      </p>

                      {/* Photo Proof Gallery */}
                      {dispute.evidence_urls && dispute.evidence_urls.length > 0 && (
                        <div>
                          <p className="text-[11px] font-semibold text-gray-700 mb-1">Customer Photo Proof:</p>
                          <div className="flex gap-2 flex-wrap">
                            {dispute.evidence_urls.map((imgUrl: string, idx: number) => (
                              <a
                                key={idx}
                                href={imgUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200 block hover:opacity-80 transition"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={imgUrl}
                                  alt={`Evidence ${idx + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {dispute && <ResolveDisputeButtons disputeId={dispute.id} />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
