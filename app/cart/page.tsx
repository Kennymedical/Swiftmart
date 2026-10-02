'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { CartOrdersTabs } from '@/components/CartOrdersTabs';

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

const NIGERIAN_STATES = [
  'Abia', 'Abuja (FCT)', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'Gombe', 'Imo', 'Jigawa', 'Kaduna',
  'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo',
  'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
];

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
  const [insufficient, setInsufficient] = useState<{ required: number; balance: number } | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Delivery Form State
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [state, setState] = useState('Lagos');
  const [city, setCity] = useState('');

  // Shipping Fee State (initially null until address is provided)
  const [shippingKobo, setShippingKobo] = useState<number | null>(null);
  const [shippingName, setShippingName] = useState('');
  const [calcLoading, setCalcLoading] = useState(false);

  async function loadCartAndProfile() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    // Load cart items
    const { data: cartData } = await supabase
      .from('cart_items')
      .select('id, quantity, product:products(id, name, price_kobo, images, stock)')
      .eq('user_id', user.id);
    setItems((cartData as any) ?? []);

    // Load existing profile details for fast delivery prefill
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, phone')
      .eq('id', user.id)
      .single();

    if (profile) {
      if (profile.full_name) setFullName(profile.full_name);
      if (profile.phone) setPhone(profile.phone);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadCartAndProfile();
  }, []);

  // Recalculate shipping rate ONLY after address & city are filled
  useEffect(() => {
    if (!address.trim() || !city.trim() || !state) {
      setShippingKobo(null);
      setShippingName('');
      return;
    }

    let isMounted = true;
    async function fetchShippingRate() {
      setCalcLoading(true);
      try {
        const { data, error: fnErr } = await supabase.functions.invoke('calculate-shipping', {
          body: {
            senderState: 'Anambra',
            senderCity: 'Onitsha',
            receiverState: state,
            receiverCity: city.trim(),
            receiverAddress: `${address.trim()}, ${city.trim()}, ${state}`,
            itemsCount: items.length || 1,
          },
        });

        const computedKobo = data?.totalShippingKobo ?? (typeof data?.shippingFee === 'number' ? Math.round(data.shippingFee * 100) : (data?.shippingKobo ?? null));
        if (!fnErr && computedKobo && isMounted) {
          setShippingKobo(computedKobo);
          if (data.courierName) setShippingName(data.courierName);
        } else if (fnErr) {
          console.warn('Shipping calc error:', fnErr);
        }
      } catch (e) {
        console.warn('Shipping calc error:', e);
      } finally {
        if (isMounted) setCalcLoading(false);
      }
    }

    const timer = setTimeout(fetchShippingRate, 600);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [state, city, address, items.length]);

  async function updateQuantity(itemId: string, newQty: number) {
    if (newQty < 1) return;
    await supabase.from('cart_items').update({ quantity: newQty }).eq('id', itemId);
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, quantity: newQty } : i)));
  }

  async function removeItem(itemId: string) {
    await supabase.from('cart_items').delete().eq('id', itemId);
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  }

  const subtotal = items.reduce((sum, i) => sum + Math.round(i.product.price_kobo * 1.2) * i.quantity, 0);
  const total = subtotal + (shippingKobo ?? 0);

  async function handleCheckout() {
    setError('');
    setInsufficient(null);
    setSuccess(null);

    if (!fullName.trim() || !phone.trim() || !address.trim() || !city.trim()) {
      setError('Please provide your complete delivery address, city, and phone number.');
      return;
    }

    if (shippingKobo === null || calcLoading) {
      setError('Please wait for waybill / shipping calculation before placing order.');
      return;
    }

    setCheckingOut(true);

    const { data, error: fnError } = await supabase.functions.invoke('checkout-cart', {
      body: {
        shippingAddress: {
          fullName,
          phone,
          street: address,
          city,
          state,
        },
        shippingKobo,
      },
    });

    setCheckingOut(false);

    if (fnError) {
      setError(fnError.message);
      return;
    }
    if (data?.error === 'insufficient_balance') {
      setInsufficient({ required: data.requiredKobo, balance: data.balanceKobo });
      return;
    }
    if (data?.error) {
      setError(data.error);
      return;
    }

    setSuccess(`Order #${data.orderNumber} placed! Track it under My Orders.`);
    setItems([]);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A1931]">
        <p className="text-[#A8B0C5]">Loading cart...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A1931] pb-80">
      <div className="bg-[#0F172A] px-4 py-5">
        <h1 className="text-xl font-bold text-white">
          Your <span className="text-[#D4AF37]">Cart</span>
        </h1>
        <p className="text-slate-300 text-xs mt-1">
          {items.length} item{items.length === 1 ? '' : 's'}
        </p>
      </div>

      <CartOrdersTabs />

      {success && (
        <div className="bg-green-50 text-green-700 text-sm p-4 m-3 rounded-xl text-center font-medium">
          {success}
        </div>
      )}

      {items.length === 0 && !success ? (
        <p className="text-center text-[#A8B0C5] py-20">Your cart is empty.</p>
      ) : (
        <div className="p-3 space-y-4">
          {/* Cart Products Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {items.map((item) => (
              <div key={item.id} className="bg-gradient-to-br from-[#142850] to-[#1B2F5E] rounded-xl overflow-hidden border border-[#D4AF37]/25 shadow-[0_4px_20px_rgba(212,175,55,0.08)]">
                <div className="relative aspect-square bg-[#0F2140]">
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
                    className="absolute top-1 right-1 bg-[#0F2140]/90 text-red-400 rounded-full h-6 w-6 flex items-center justify-center text-xs font-bold shadow-sm"
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
                    {naira(Math.round(item.product.price_kobo * 1.2))}
                  </p>
                  <div className="flex items-center justify-between bg-[#0A1931] rounded-lg px-1">
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

          {/* Delivery & Waybill Destination Form */}
          <div className="bg-gradient-to-br from-[#142850] to-[#1B2F5E] rounded-2xl p-4 border border-[#D4AF37]/25 shadow-[0_4px_20px_rgba(212,175,55,0.08)] space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#A8B0C5]">
                📍 Delivery Destination
              </h2>
              <span className="text-[11px] text-[#2ED573] font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">
                {calcLoading ? 'Calculating rate...' : shippingName}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">Recipient Name</label>
                <input
                  type="text"
                  placeholder="Full Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 text-gray-900 focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">Phone Number</label>
                <input
                  type="tel"
                  placeholder="08012345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 text-gray-900 focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">State</label>
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 text-gray-900 bg-[#0A1931] text-[#F5F7FA] focus:outline-none focus:border-[#D4AF37]"
                >
                  {NIGERIAN_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">City / Town</label>
                <input
                  type="text"
                  placeholder="e.g. Ikeja, Lekki, Wuse"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 text-gray-900 focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-600 mb-1">Street Address</label>
              <input
                type="text"
                placeholder="House No, Street, Landmark"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 text-gray-900 focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
          </div>
        </div>
      )}

      {/* Checkout Floating Bar */}
      {items.length > 0 && (
        <div className="fixed bottom-16 inset-x-0 bg-[#0A1931]/95 backdrop-blur-md border-t border-[#D4AF37]/25 p-4 shadow-2xl z-40">
          {error && <p className="text-xs text-red-400 mb-2 font-medium">{error}</p>}

          {insufficient ? (
            <div className="mb-2">
              <p className="text-xs text-red-400 mb-2">
                Insufficient balance — you have {naira(insufficient.balance)}, need{' '}
                {naira(insufficient.required)}.
              </p>
              <button
                onClick={() => router.push('/wallet/fund')}
                className="w-full bg-[#0F172A] text-[#D4AF37] font-bold py-3 rounded-xl border-2 border-[#D4AF37]"
              >
                Top Up Wallet
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-1 mb-3">
                <div className="flex items-center justify-between text-xs text-[#A8B0C5]">
                  <span>Goods Subtotal</span>
                  <span>{naira(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-[#A8B0C5]">
                  <span>Waybill / Logistics</span>
                  <span className="font-medium text-gray-800">{shippingKobo !== null ? naira(shippingKobo) : 'Calculated after address'}</span>
                </div>
                <div className="flex items-center justify-between text-base font-bold text-[#0F172A] pt-1 border-t border-gray-100">
                  <span>Total Payable</span>
                  <span className="text-[#0F172A]">{naira(total)}</span>
                </div>
              </div>
              <button
                onClick={handleCheckout}
                disabled={checkingOut || shippingKobo === null || calcLoading}
                className="w-full bg-[#0F172A] text-[#D4AF37] font-bold py-3 rounded-xl border-2 border-[#D4AF37] disabled:opacity-50 transition shadow-sm"
              >
                {checkingOut
                  ? 'Placing order...'
                  : shippingKobo === null
                  ? 'Enter Address to Calculate Waybill'
                  : `Pay ${naira(total)} & Order`}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
