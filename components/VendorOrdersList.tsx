'use client';

import { useState } from 'react';
import { MarkShippedButton } from '@/components/MarkShippedButton';

interface OrderItemData {
  id: string;
  order_id: string;
  product_name: string;
  quantity: number;
  line_total_kobo: number;
  vendor_payout_kobo: number;
  imageUrl?: string;
  allImages?: string[];
  orderNumber: string;
  orderStatus: string;
  orderDate?: string;
  customerName: string;
  customerPhone: string;
  shippingKobo: number;
  recipientName: string;
  recipientPhone: string;
  deliveryAddress: string;
}

function naira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString('en-NG')}`;
}

export function VendorOrdersList({ items }: { items: OrderItemData[] }) {
  const [selectedItem, setSelectedItem] = useState<OrderItemData | null>(null);

  if (!items || items.length === 0) {
    return <p className="text-center text-gray-400 text-sm py-8">No orders yet.</p>;
  }

  return (
    <>
      <div className="space-y-4">
        {items.map((item) => (
          <div
            key={item.id}
            onClick={() => setSelectedItem(item)}
            className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 hover:border-[#D4AF37] transition cursor-pointer active:scale-[0.99]"
          >
            <div className="flex gap-3 items-center">
              {/* Product Thumbnail */}
              <div className="w-16 h-16 rounded-xl bg-gray-100 flex-shrink-0 overflow-hidden border border-gray-100">
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.imageUrl}
                    alt={item.product_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-[10px]">
                    No image
                  </div>
                )}
              </div>

              {/* Order Info */}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {item.product_name}
                  </p>
                  <p className="text-sm font-bold text-[#0F172A] ml-2">
                    {naira(item.line_total_kobo)}
                  </p>
                </div>

                <p className="text-xs text-gray-500 mt-0.5">
                  Qty: <span className="font-semibold text-gray-800">{item.quantity}</span> · Order #{item.orderNumber}
                </p>

                <p className="text-xs text-gray-600 mt-0.5">
                  Buyer: <span className="font-medium text-gray-900">{item.customerName}</span>
                </p>

                <p className="text-[11px] text-[#D4AF37] font-semibold mt-1">
                  Tap to view full details & address →
                </p>
              </div>
            </div>

            {/* Quick Delivery summary bar */}
            <div className="mt-3 bg-amber-50/60 border border-amber-200/60 rounded-xl p-2.5 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 font-medium text-gray-800">
                <span className="break-words">📍 {item.deliveryAddress}</span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded self-start sm:self-auto flex-shrink-0">
                  Waybill: {naira(item.shippingKobo)}
                </span>
              </div>
            </div>

            {/* Shipped Action */}
            <div
              className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-end"
              onClick={(e) => e.stopPropagation()}
            >
              <MarkShippedButton
                orderId={item.order_id}
                status={item.orderStatus}
                customerAddress={`${item.recipientName} (${item.recipientPhone}) - ${item.deliveryAddress}`}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Full Order Detail Modal Popup */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-2xl max-h-[85vh] overflow-y-auto overscroll-contain p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-[#0F172A] text-base">Order Item Details</h3>
                <p className="text-xs text-gray-500">Order #{selectedItem.orderNumber}</p>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="h-8 w-8 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Full Product Picture */}
            <div className="w-full aspect-video rounded-2xl bg-gray-100 overflow-hidden border border-gray-200 flex items-center justify-center">
              {selectedItem.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedItem.imageUrl}
                  alt={selectedItem.product_name}
                  className="w-full h-full object-contain bg-slate-900"
                />
              ) : (
                <span className="text-gray-400 text-xs">No image available</span>
              )}
            </div>

            {/* Product Meta */}
            <div className="bg-gray-50 rounded-2xl p-4 space-y-2 border border-gray-100">
              <div className="flex justify-between items-start">
                <h4 className="font-bold text-gray-900 text-base">{selectedItem.product_name}</h4>
                <span className="bg-[#0F172A] text-[#D4AF37] font-bold text-sm px-3 py-1 rounded-xl">
                  {naira(selectedItem.line_total_kobo)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-gray-200/60 text-gray-600">
                <p>
                  Quantity Ordered: <span className="font-bold text-gray-900">{selectedItem.quantity} unit(s)</span>
                </p>
                <p>
                  Status:{' '}
                  <span className="capitalize font-bold text-amber-600">{selectedItem.orderStatus}</span>
                </p>
                {selectedItem.orderDate && (
                  <p className="col-span-2">
                    Date Placed: <span className="font-medium text-gray-800">{new Date(selectedItem.orderDate).toLocaleString('en-NG')}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Full Customer & Delivery Address Card */}
            <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1">
                  📦 Customer Delivery Destination
                </h4>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                  Waybill Paid: {naira(selectedItem.shippingKobo)}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-gray-800">
                <div className="flex items-center justify-between">
                  <p>
                    <span className="text-gray-500">Recipient Name:</span>{' '}
                    <span className="font-bold text-gray-900">{selectedItem.recipientName}</span>
                  </p>
                  {selectedItem.recipientPhone && selectedItem.recipientPhone !== 'No phone provided' && (
                    <a
                      href={`tel:${selectedItem.recipientPhone}`}
                      className="bg-emerald-600 text-white font-bold px-3 py-1 rounded-lg text-xs shadow-sm hover:bg-emerald-700 transition"
                    >
                      📞 Call Customer
                    </a>
                  )}
                </div>

                <p>
                  <span className="text-gray-500">Phone Number:</span>{' '}
                  <span className="font-bold text-gray-900">{selectedItem.recipientPhone}</span>
                </p>

                <div className="pt-2 border-t border-amber-200/80">
                  <p className="text-gray-500 text-[11px] mb-0.5">Full Destination Address:</p>
                  <p className="font-semibold text-gray-900 text-sm bg-white p-2.5 rounded-xl border border-amber-200/60">
                    {selectedItem.deliveryAddress}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col gap-2">
              <MarkShippedButton
                orderId={selectedItem.order_id}
                status={selectedItem.orderStatus}
                customerAddress={`${selectedItem.recipientName} (${selectedItem.recipientPhone}) - ${selectedItem.deliveryAddress}`}
              />
              <button
                onClick={() => setSelectedItem(null)}
                className="w-full py-2.5 text-xs font-bold text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
