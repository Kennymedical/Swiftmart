'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function AddToCartButton({ productId }: { productId: string }) {
  const supabase = createClient();
  const [status, setStatus] = useState<'idle' | 'adding' | 'added'>('idle');

  async function handleAdd() {
    setStatus('adding');
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = '/login';
      return;
    }

    const { data: existing } = await supabase
      .from('cart_items')
      .select('id, quantity')
      .eq('user_id', user.id)
      .eq('product_id', productId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('cart_items')
        .update({ quantity: existing.quantity + 1 })
        .eq('id', existing.id);
    } else {
      await supabase.from('cart_items').insert({ user_id: user.id, product_id: productId, quantity: 1 });
    }

    setStatus('added');
    setTimeout(() => setStatus('idle'), 1500);
  }

  return (
    <button
      onClick={handleAdd}
      disabled={status === 'adding'}
      className="w-full mt-1 bg-[#0F172A] text-[#D4AF37] text-[10px] font-bold py-1.5 rounded-lg border border-[#D4AF37]/50 disabled:opacity-50"
    >
      {status === 'added' ? 'Added ✓' : status === 'adding' ? '...' : 'Add to Cart'}
    </button>
  );
                                }
  
