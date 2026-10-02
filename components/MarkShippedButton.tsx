'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function MarkShippedButton({
  orderId,
  status,
  customerAddress,
}: {
  orderId: string;
  status: string;
  customerAddress?: string;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [waybillType, setWaybillType] = useState<'courier' | 'park'>('courier');
  const [driverPhone, setDriverPhone] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');

  if (status !== 'paid' && status !== 'processing') {
    return <span className="text-[10px] text-gray-400 capitalize">{status}</span>;
  }

  async function handleConfirmShip() {
    setError('');
    setLoading(true);

    const { data, error: fnError } = await supabase.functions.invoke('vendor-actions', {
      body: {
        type: 'mark_shipped',
        orderId,
        waybillType,
        driverPhone: waybillType === 'park' ? driverPhone : undefined,
        trackingNumber: waybillType === 'park' ? trackingNumber : `SB-DISPATCH-${orderId.slice(0, 8).toUpperCase()}`,
      },
    });

    setLoading(false);
    if (fnError) return setError(fnError.message);
    if (data?.error) return setError(data.error);

    setShowModal(false);
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="text-xs font-semibold bg-[#0F172A] text-[#D4AF37] border border-[#D4AF37] rounded-lg px-3 py-1.5 shadow-sm hover:bg-[#1E293B] transition"
      >
        Dispatch / Waybill
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-gradient-to-b from-[#142850] to-[#1B2F5E] rounded-2xl w-full max-w-sm p-5 shadow-[0_8px_32px_rgba(0,0,0,0.37)] border border-[#D4AF37]/25 text-[#F5F7FA]">
            <h3 className="text-base font-bold text-[#0F172A] mb-1">Fulfill & Dispatch Order</h3>
            <p className="text-xs text-[#A8B0C5] mb-4">
              Select how you are dispatching this package to the customer.
            </p>

            {customerAddress && (
              <div className="bg-[#0F2140] border border-[#D4AF37]/20 rounded-xl p-2.5 mb-4 text-xs text-[#A8B0C5]">
                <p className="font-semibold text-slate-800">Destination:</p>
                <p className="text-slate-600 truncate">{customerAddress}</p>
              </div>
            )}

            {/* Waybill Selection Tabs */}
            <div className="grid grid-cols-2 gap-2 mb-4 bg-[#0F2140] p-1 rounded-xl border border-[#D4AF37]/20">
              <button
                type="button"
                onClick={() => setWaybillType('courier')}
                className={`py-2 text-xs font-bold rounded-lg transition ${
                  waybillType === 'courier'
                    ? 'bg-[#0F172A] text-[#D4AF37] shadow-sm'
                    : 'text-gray-600 hover:text-black'
                }`}
              >
                🏍️ Courier Dispatch
              </button>
              <button
                type="button"
                onClick={() => setWaybillType('park')}
                className={`py-2 text-xs font-bold rounded-lg transition ${
                  waybillType === 'park'
                    ? 'bg-[#0F172A] text-[#D4AF37] shadow-sm'
                    : 'text-gray-600 hover:text-black'
                }`}
              >
                🚌 Motor Park / Self
              </button>
            </div>

            {waybillType === 'courier' ? (
              <div className="bg-amber-50 border border-amber-200/60 rounded-xl p-3 mb-4 text-xs text-amber-900">
                <p className="font-bold mb-1">Shipbubble 1-Click Pickup</p>
                <p className="text-[11px] leading-relaxed">
                  A dispatch rider will be scheduled to collect the packaged parcel from your store address.
                </p>
              </div>
            ) : (
              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    Driver / Park Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. 08012345678"
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    className="w-full text-xs border border-[#D4AF37]/20 bg-[#0F2140] text-[#F5F7FA] rounded-xl px-3 py-2 text-[#D4AF37] focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    Waybill Slip / Tracking Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. GIG-73829 or Park Slip #44"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    className="w-full text-xs border border-[#D4AF37]/20 bg-[#0F2140] text-[#F5F7FA] rounded-xl px-3 py-2 text-[#D4AF37] focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>
            )}

            {error && <p className="text-xs text-red-600 mb-3">{error}</p>}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 text-xs font-semibold text-[#A8B0C5] bg-[#0F2140] rounded-xl hover:bg-[#142850] hover:text-[#F5F7FA] border border-[#D4AF37]/20 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmShip}
                disabled={loading || (waybillType === 'park' && (!driverPhone || !trackingNumber))}
                className="flex-1 py-2.5 text-xs font-bold text-[#D4AF37] bg-[#0F172A] rounded-xl border border-[#D4AF37] disabled:opacity-50 transition"
              >
                {loading ? 'Processing...' : 'Confirm Shipped'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
