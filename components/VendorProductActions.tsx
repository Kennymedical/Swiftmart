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

  async function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setDeleting(true);
    await supabase.from('products').delete().eq('id', productId);
    setDeleting(false);
    router.refresh();
  }

  return (
    <div className="flex gap-1 mt-1">
      <Link
        href={`/vendor/products/${productId}/edit`}
        className="flex-1 text-center text-[10px] font-semibold bg-white text-[#0F172A] border border-gray-200 rounded-lg py-1"
      >
        Edit
      </Link>
      <button
        onClick={handleDelete}
        disabled={deleting}
        className={`flex-1 text-[10px] font-semibold rounded-lg py-1 border ${
          confirming
            ? 'bg-red-600 text-white border-red-600'
            : 'bg-white text-red-600 border-red-200'
        } disabled:opacity-50`}
      >
        {deleting ? '...' : confirming ? 'Confirm?' : 'Delete'}
      </button>
    </div>
  );
      }
