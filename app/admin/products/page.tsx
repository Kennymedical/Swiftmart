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
      <h2 className="text-xs font-bold uppercase tracking-wider text-[#D4AF37] mb-3 px-1">
        Pending Product Approvals
      </h2>
      {(!products || products.length === 0) ? (
        <p className="text-center text-[#A8B0C5] py-16">No products pending approval.</p>
      ) : (
        <div className="space-y-3.5">
          {products.map((p: any) => (
            <div
              key={p.id}
              className="bg-gradient-to-br from-[#142850] to-[#1B2F5E] border border-[#D4AF37]/25 rounded-2xl shadow-[0_4px_20px_rgba(212,175,55,0.08)] p-4 flex gap-3.5 items-center"
            >
              <div className="h-16 w-16 flex-shrink-0 rounded-xl bg-[#0A1931] border border-[#D4AF37]/20 overflow-hidden">
                {p.images?.[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.images[0]} alt={p.name} className="h-full w-full object-cover" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[#F5F7FA] truncate">{p.name}</p>
                <p className="text-xs text-[#A8B0C5] mt-0.5">{p.vendor?.business_name ?? 'Unknown vendor'}</p>
                <p className="text-sm font-black text-[#D4AF37] mt-1">{naira(p.price_kobo)}</p>
                <div className="mt-2.5">
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
