'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function VendorProductActions({ productId }: { productId: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setDeleting(true);
    setErrorMessage(null);

    try {
      // 1. Check if product is referenced in past customer orders
      const { count, error: countErr } = await supabase
        .from('order_items')
        .select('id', { count: 'exact', head: true })
        .eq('product_id', productId);

      if (countErr) {
        console.warn('Error checking order items for product:', countErr);
      }

      let deleteError;
      if (count && count > 0) {
        // Past orders exist: archive product so orders, disputes, and escrow aren't corrupted
        const { error } = await supabase
          .from('products')
          .update({ status: 'archived' })
          .eq('id', productId);
        deleteError = error;
      } else {
        // Safe to delete cleanly from database
        const { error } = await supabase
          .from('products')
          .delete()
          .eq('id', productId);
        deleteError = error;
      }

      if (deleteError) {
        setErrorMessage(deleteError.message || 'Failed to delete product');
        setConfirming(false);
        setDeleting(false);
        return;
      }

      setConfirming(false);
      setDeleting(false);
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err?.message || 'An unexpected error occurred');
      setConfirming(false);
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-1 mt-1">
      {errorMessage && (
        <span className="text-[9px] text-red-400 font-medium px-1 leading-tight">
          {errorMessage}
        </span>
      )}
      <div className="flex gap-1">
        <Link
          href={`/vendor/products/${productId}/edit`}
          className="flex-1 text-center text-[10px] font-semibold bg-[#142850] text-[#D4AF37] border border-[#D4AF37]/20 hover:bg-[#1B2F5E] rounded-lg py-1 transition"
        >
          Edit
        </Link>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className={`flex-1 text-[10px] font-semibold rounded-lg py-1 border transition ${
            confirming
              ? 'bg-red-600 text-white border-red-600'
              : 'bg-[#142850] text-red-400 border border-red-500/30 hover:bg-red-950/40'
          } disabled:opacity-50`}
        >
          {deleting ? '...' : confirming ? 'Confirm?' : 'Delete'}
        </button>
      </div>
    </div>
  );
}
