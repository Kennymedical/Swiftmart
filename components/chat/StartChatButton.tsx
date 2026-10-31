'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// Drop-in button for product pages, store pages and order screens.
//   <StartChatButton vendorId={product.vendor_id} productId={product.id} />
//   <StartChatButton vendorId={vendor.id} />
//   <StartChatButton vendorId={item.vendor_id} orderId={order.id}>Message about this order</StartChatButton>
export function StartChatButton({
  vendorId,
  productId,
  orderId,
  className,
  children,
}: {
  vendorId: string;
  productId?: string;
  orderId?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function start() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/chat/vendor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendorId, productId, orderId }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.status === 401) { setError('Please sign in to message this store.'); return; }
      if (!res.ok) { setError(j.error ?? 'Could not start the chat.'); return; }
      router.push(`/messages/${j.conversationId}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={start}
        disabled={busy}
        className={className ?? 'px-4 py-2 rounded-full bg-[#1e88e5] text-white text-sm font-semibold disabled:opacity-60'}
      >
        {busy ? 'Opening...' : children ?? 'Message store'}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export default StartChatButton;
