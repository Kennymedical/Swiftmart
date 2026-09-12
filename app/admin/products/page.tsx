import { createClient } from '@/lib/supabase/server';
import { ProductActions } from './ProductActions';

function naira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString('en-NG')}`;
}

export default async function AdminProductsPage() {
  const supabase = createClient();

  const { data: products } = await supabase
    .from('products')
    .select('id, name, description, images, price_kobo, status, created_at, vendor:vendors(business_name)')
    .eq('status', 'draft')
    .order('created_at', { ascending: true });

  return (
    <div className="max-w-2xl mx-auto p-4">
      {(!products || products.length === 0) ? (
        <p className="text-center text-gray-500 py-16">No products pending approval.</p>
      ) : (
        <div className="space-y-3">
          {products.map((p: any) => (
            <div key={p.id} className="bg-white rounded-2xl shadow-sm p-4 flex gap-3">
              <div className="h-16 w-16 flex-shrink-0 rounded-lg bg-gray-100 overflow-hidden">
                {p.images?.[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.images[0]} alt={p.name} className="h-full w-full object-cover" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[#0F172A] truncate">{p.name}</p>
                <p className="text-xs text-gray-500">{p.vendor?.business_name ?? 'Unknown vendor'}</p>
                <p className="text-sm font-bold text-[#0F172A] mt-1">{naira(p.price_kobo)}</p>
                <div className="mt-2">
                  <ProductActions productId={p.id} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
    }
