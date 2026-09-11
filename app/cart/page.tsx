'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface CartItem {
  id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    price_kobo: number;
    images: string[];
    stock: number;
  };
}

function naira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString('en-NG')}`;
}

export default function CartPage() {
  const supabase = createClient();
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState('');

  async function loadCart() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('cart_items')
      .select('id, quantity, product:products(id, name, price_kobo, images, stock)')
      .eq('user_id', user.id);
    setItems((data as any) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadCart();
  }, []);

  async function updateQuantity(itemId: string, newQty: number) {
    if (newQty < 1) return;
    await supabase.from('cart_items').update({ quantity: newQty }).eq('id', itemId);
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, quantity: newQty } : i)));
  }

  async function removeItem(itemId: string) {
    await supabase.from('cart_items').delete().eq('id', itemId);
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  }

  const total = items.reduce((sum, i) => sum + i.product.price_kobo * i.quantity, 0);

  async function handleCheckout() {
    setError('');
    setCheckingOut(true);
    try {
      const { data: orderData, error: orderError } = await supabase.functions.invoke(
        'create-order-from-cart',
        { body: {} },
      );
      if (orderError) throw orderError;
      if (orderData?.error) throw new Error(orderData.error);

      const { data: payData, error: payError } = await supabase.functions.invoke('pay', {
        body: { orderId: orderData.orderId },
      });
      if (payError) throw payError;
      if (payData?.error) throw new Error(payData.error);

      window.location.href = payData.authorizationUrl;
    } catch (err: any) {
      setError(err.message ?? 'Checkout failed');
      setCheckingOut(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading cart...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <div className="bg-[#0F172A] px-4 py-5">
        <h1 className="text-xl font-bold text-white">
          Your <span className="text-[#D4AF37]">Cart</span>
        </h1>
        <p className="text-slate-300 text-xs mt-1">
          {items.length} item{items.length === 1 ? '' : 's'}
        </p>
      </div>

      {items.length === 0 ? (
        <p className="text-center text-gray-500 py-20">Your cart is empty.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3">
          {items.map((item) => (
            <div key={item.id} className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100">
              <div className="relative aspect-square bg-gray-100">
                {item.product.images?.[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.product.images[0]}
                    alt={item.product.name}
                    className="w-full h-full object-cover"
                  />
                )}
                <button
                  onClick={() => removeItem(item.id)}
                  className="absolute top-1 right-1 bg-white/90 text-red-600 rounded-full h-6 w-6 flex items-center justify-center text-xs font-bold"
                  aria-label="Remove"
                >
                  ×
                </button>
              </div>
              <div className="p-2">
                <p className="text-xs text-gray-900 font-medium line-clamp-1 mb-1">
                  {item.product.name}
                </p>
                <p className="text-[#0F172A] font-bold text-sm mb-2">
                  {naira(item.product.price_kobo)}
                </p>
                <div className="flex items-center justify-between bg-gray-50 rounded-lg px-1">
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="px-2 py-1 text-[#0F172A] font-bold"
                  >
                    −
                  </button>
                  <span className="text-xs font-medium">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="px-2 py-1 text-[#0F172A] font-bold"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {items.length > 0 && (
        <div className="fixed bottom-16 inset-x-0 bg-white border-t border-gray-200 p-4">
          {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500">Total</span>
            <span className="text-xl font-bold text-[#0F172A]">{naira(total)}</span>
          </div>
          <button
            onClick={handleCheckout}
            disabled={checkingOut}
            className="w-full bg-[#0F172A] text-[#D4AF37] font-bold py-3 rounded-xl border-2 border-[#D4AF37] disabled:opacity-50"
          >
            {checkingOut ? 'Preparing checkout...' : 'Place Order'}
          </button>
        </div>
      )}
    </div>
  );
  }
    
