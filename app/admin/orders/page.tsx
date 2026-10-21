import { createClient } from '@/lib/supabase/server';
import { MarkDeliveredButton, ReleaseEscrowButton, ResolveDisputeButtons } from './OrderActions';

function naira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString('en-NG')}`;
}

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
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#D4AF37] mb-3 px-1">
          Awaiting Delivery Confirmation
        </h2>
        {!shipped || shipped.length === 0 ? (
          <p className="text-center text-[#A8B0C5] text-sm py-8">Nothing shipped yet.</p>
        ) : (
          <div className="space-y-3">
            {shipped.map((o) => {
              const c = customerMap.get(o.customer_id);
              return (
                <div
                  key={o.id}
                  className="bg-gradient-to-br from-[#142850] to-[#1B2F5E] border border-[#D4AF37]/25 rounded-2xl shadow-[0_4px_20px_rgba(212,175,55,0.08)] p-4"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold text-[#F5F7FA]">#{o.order_number}</p>
                      <p className="text-xs text-[#A8B0C5]">{c?.full_name ?? c?.username ?? 'Unknown customer'}</p>
                    </div>
                    <p className="font-black text-[#D4AF37]">{naira(o.total_kobo)}</p>
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
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#D4AF37] mb-3 px-1">
          In Safety Window ({SAFETY_WINDOW_HOURS}h)
        </h2>
        {!delivered || delivered.length === 0 ? (
          <p className="text-center text-[#A8B0C5] text-sm py-8">Nothing awaiting release.</p>
        ) : (
          <div className="space-y-3">
            {delivered.map((o) => {
              const c = customerMap.get(o.customer_id);
              const hoursSince = (Date.now() - new Date(o.delivered_at).getTime()) / 3600000;
              const hoursLeft = Math.max(0, Math.ceil(SAFETY_WINDOW_HOURS - hoursSince));
              return (
                <div
                  key={o.id}
                  className="bg-gradient-to-br from-[#142850] to-[#1B2F5E] border border-[#D4AF37]/25 rounded-2xl shadow-[0_4px_20px_rgba(212,175,55,0.08)] p-4"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold text-[#F5F7FA]">#{o.order_number}</p>
                      <p className="text-xs text-[#A8B0C5]">{c?.full_name ?? c?.username ?? 'Unknown customer'}</p>
                      <p className="text-xs font-semibold text-[#E8C874] mt-0.5">
                        {hoursLeft > 0 ? `${hoursLeft}h remaining` : 'Ready to release'}
                      </p>
                    </div>
                    <p className="font-black text-[#D4AF37]">{naira(o.total_kobo)}</p>
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
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#D4AF37] mb-3 px-1">
          Disputed Orders
        </h2>
        {!disputedOrders || disputedOrders.length === 0 ? (
          <p className="text-center text-[#A8B0C5] text-sm py-8">No open disputes.</p>
        ) : (
          <div className="space-y-3.5">
            {disputedOrders.map((o) => {
              const c = customerMap.get(o.customer_id);
              const dispute = disputeByOrder.get(o.id);
              return (
                <div
                  key={o.id}
                  className="bg-gradient-to-br from-[#142850] to-[#1B2F5E] border-2 border-red-500/50 rounded-2xl shadow-[0_4px_20px_rgba(239,68,68,0.15)] p-4"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold text-[#F5F7FA]">#{o.order_number}</p>
                      <p className="text-xs text-[#A8B0C5]">{c?.full_name ?? c?.username ?? 'Unknown customer'}</p>
                    </div>
                    <p className="font-black text-[#D4AF37]">{naira(o.total_kobo)}</p>
                  </div>

                  {dispute && (
                    <div className="mb-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-red-950/80 text-red-400 border border-red-700/50">
                          {dispute.category?.replace('_', ' ') ?? 'Dispute'}
                        </span>
                        <span className="text-[10px] text-[#A8B0C5]">
                          {new Date(dispute.created_at).toLocaleString()}
                        </span>
                      </div>

                      <p className="text-xs text-red-200 bg-red-950/60 rounded-xl p-3 border border-red-800/40">
                        {dispute.reason}
                      </p>

                      {dispute.evidence_urls && dispute.evidence_urls.length > 0 && (
                        <div>
                          <p className="text-[11px] font-semibold text-[#A8B0C5] mb-1">Customer Photo Proof:</p>
                          <div className="flex gap-2 flex-wrap">
                            {dispute.evidence_urls.map((imgUrl: string, idx: number) => (
                              <a
                                key={idx}
                                href={imgUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-16 h-16 rounded-xl overflow-hidden border border-[#D4AF37]/30 block hover:opacity-80 transition"
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
